"""
NammaCity AI — MCP Client + Gemini Orchestrator

Connects to the MCP Server (via stdio subprocess), discovers tools,
and orchestrates Gemini Flash to autonomously analyze city zones.

The LLM receives zone context + full tool list and decides which tools
to call in what order — this is the agentic behavior.
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(Path(__file__).parent / ".env")


# --- Gemini Client Setup ---

def _get_gemini_client():
    """Lazy-load Gemini client to avoid import errors if key is missing."""
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in environment or .env file")
    return genai.Client(api_key=api_key)


# --- MCP Connection ---

async def _connect_mcp():
    """
    Start the MCP server as a subprocess and connect via stdio.
    Returns (session, cleanup_fn).
    """
    from mcp import ClientSession
    from mcp.client.stdio import stdio_client, StdioServerParameters

    server_path = str(Path(__file__).parent / "mcp_server" / "server.py")

    server_params = StdioServerParameters(
        command=sys.executable,
        args=[server_path],
    )

    # stdio_client is an async context manager
    read_stream, write_stream = await stdio_client(server_params).__aenter__()
    session = ClientSession(read_stream, write_stream)
    await session.__aenter__()
    await session.initialize()

    return session


async def _close_mcp(session):
    """Clean up MCP session."""
    try:
        await session.__aexit__(None, None, None)
    except Exception:
        pass


# --- Tool Schema Conversion ---

def _mcp_tools_to_gemini_declarations(mcp_tools: list) -> list:
    """
    Convert MCP tool schemas to Gemini function declaration format.
    """
    from google.genai import types

    declarations = []
    for tool in mcp_tools:
        # Build properties dict from MCP input schema
        schema = tool.inputSchema or {}
        properties = {}
        required = schema.get("required", [])

        for prop_name, prop_schema in schema.get("properties", {}).items():
            prop_type = prop_schema.get("type", "string").upper()
            # Map JSON schema types to Gemini types
            type_map = {
                "STRING": "STRING",
                "INTEGER": "INTEGER",
                "NUMBER": "NUMBER",
                "BOOLEAN": "BOOLEAN",
                "ARRAY": "ARRAY",
                "OBJECT": "OBJECT",
            }
            gemini_type = type_map.get(prop_type, "STRING")

            properties[prop_name] = types.Schema(
                type=gemini_type,
                description=prop_schema.get("description", ""),
            )

        fn_decl = types.FunctionDeclaration(
            name=tool.name,
            description=tool.description or f"Tool: {tool.name}",
            parameters=types.Schema(
                type="OBJECT",
                properties=properties,
                required=required,
            ) if properties else None,
        )
        declarations.append(fn_decl)

    return declarations


# --- Main Agent Orchestration ---

SYSTEM_PROMPT = """You are a Bengaluru city operations AI agent with access to city management tools.

When analyzing a zone, autonomously use your tools to:
1. Gather zone data (scores, context)
2. Check weather conditions and their impact
3. Find nearby BTP (Bengaluru Traffic Police) stations
4. If the situation is critical or warning level, dispatch an alert to the nearest station
5. Generate an incident report if severity warrants it

IMPORTANT RULES:
- Always start by fetching zone data with get_zone_data
- Check weather impact with get_weather_data
- Find nearby stations with get_nearby_stations
- If composite score >= 7.0, dispatch an alert to the nearest station
- If composite score >= 5.5, consider dispatching a lower-severity alert
- Reference specific Bengaluru landmarks and areas in your analysis
- Be concise and practical — this is an operations dashboard, not a report
- End with 2-4 actionable recommendations

Your analysis will be shown to city operations staff on a real-time dashboard."""


async def run_agent_analysis(
    zone: dict,
    scores: dict,
    weather: dict,
    stations: list,
    active_events: list,
    query: Optional[str] = None,
    alerts: Optional[list] = None,
) -> dict:
    """
    Run the full agentic analysis pipeline:
    1. Connect to MCP server
    2. Discover tools
    3. Send context to Gemini with tool declarations
    4. Handle multi-step tool calling
    5. Return structured analysis result
    """
    session = None
    actions_taken = []

    try:
        # Connect to MCP server
        session = await _connect_mcp()

        # Discover available tools
        tools_result = await session.list_tools()
        mcp_tools = tools_result.tools

        # Convert to Gemini function declarations
        gemini_declarations = _mcp_tools_to_gemini_declarations(mcp_tools)

        # Build the initial prompt with zone context
        context = (
            f"Analyze zone '{zone['id']}' ({zone['name']}).\n"
            f"Zone type: {zone.get('type', 'unknown')}\n"
            f"Description: {zone.get('description', 'N/A')}\n"
            f"Current scores: Congestion={scores['congestion']}, "
            f"Pollution={scores['pollution']}, Infra Stress={scores['infra_stress']}, "
            f"Composite={scores['composite']} ({scores['severity']})\n"
            f"Trend: {scores.get('trend', 'stable')}\n"
            f"Weather: {weather.get('condition', 'Unknown')}, "
            f"{'RAINING' if weather.get('is_raining') else 'Dry'}, "
            f"{weather.get('temperature', 28)}°C\n"
        )

        if query:
            context += f"\nUser question: {query}\n"

        context += (
            "\nUse your tools to gather more data, assess the situation, "
            "and take appropriate actions (like dispatching alerts if needed). "
            "Then provide your analysis."
        )

        # Initialize Gemini
        from google.genai import types

        client = _get_gemini_client()

        gemini_tools = types.Tool(function_declarations=gemini_declarations)

        # Start the conversation
        messages = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=context)]
            ),
        ]

        # Multi-step tool calling loop (max 8 iterations to prevent infinite loops)
        max_iterations = 8
        final_text = ""

        for iteration in range(max_iterations):
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=messages,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    tools=[gemini_tools],
                    temperature=0.3,
                ),
            )

            # Check if Gemini wants to call tools
            has_function_calls = False
            function_responses = []

            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if part.function_call:
                        has_function_calls = True
                        fc = part.function_call
                        tool_name = fc.name
                        tool_args = dict(fc.args) if fc.args else {}

                        print(f"[Agent] Tool call: {tool_name}({tool_args})")

                        # Execute tool via MCP
                        try:
                            tool_result = await session.call_tool(
                                tool_name, arguments=tool_args
                            )
                            result_text = ""
                            for content in tool_result.content:
                                if hasattr(content, "text"):
                                    result_text += content.text
                        except Exception as e:
                            result_text = json.dumps({"error": str(e)})

                        # Record the action
                        actions_taken.append({
                            "tool": tool_name,
                            "input": tool_args,
                            "output": result_text[:500],  # Truncate for frontend
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                        })

                        function_responses.append(
                            types.Part.from_function_response(
                                name=tool_name,
                                response={"result": result_text},
                            )
                        )
                    elif part.text:
                        final_text += part.text

            if has_function_calls:
                # Add assistant's response (with function calls) to messages
                messages.append(response.candidates[0].content)
                # Add tool results
                messages.append(
                    types.Content(
                        role="user",
                        parts=function_responses,
                    )
                )
            else:
                # No more function calls — we have the final analysis
                break

        # Extract recommendations from the final text
        recommendations = _extract_recommendations(final_text)

        return {
            "zone_id": zone["id"],
            "zone_name": zone["name"],
            "analysis": final_text.strip(),
            "actions_taken": actions_taken,
            "recommendations": recommendations,
            "scores": scores,
            "model": "gemini-2.0-flash",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as e:
        print(f"[Agent] Error during analysis: {e}")
        raise
    finally:
        if session:
            await _close_mcp(session)


def _extract_recommendations(text: str) -> list[str]:
    """
    Extract recommendation bullet points from Gemini's response.
    Looks for numbered or bulleted lists after recommendation-related headers.
    """
    recommendations = []
    lines = text.split("\n")
    in_recommendations = False

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()

        # Detect recommendation section
        if any(keyword in lower for keyword in ["recommendation", "action", "suggest", "next step"]):
            in_recommendations = True
            continue

        # Collect bullet/numbered items
        if in_recommendations and stripped:
            # Match numbered items (1. 2. etc) or bullet items (- * •)
            if (
                stripped[0].isdigit()
                or stripped.startswith("-")
                or stripped.startswith("*")
                or stripped.startswith("•")
            ):
                # Clean up the prefix
                clean = stripped.lstrip("0123456789.-*•) ").strip()
                if clean:
                    recommendations.append(clean)
            elif not stripped:
                # Empty line might end the section
                if recommendations:
                    in_recommendations = False

    # If no structured recommendations found, try to extract last few sentences
    if not recommendations and text:
        sentences = text.replace("\n", " ").split(". ")
        for s in sentences[-4:]:
            s = s.strip()
            if any(kw in s.lower() for kw in ["deploy", "activate", "alert", "monitor", "dispatch", "recommend", "suggest"]):
                recommendations.append(s.rstrip(".") + ".")

    # Fallback
    if not recommendations:
        recommendations.append("Continue monitoring. Situation is under control.")

    return recommendations[:6]  # Cap at 6
