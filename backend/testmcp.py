import asyncio
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters
import sys
async def test():
    server_params = StdioServerParameters(
        command=sys.executable,
        args=['mcp_server/server.py'],
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List all tools
            tools = await session.list_tools()
            print('=== Available Tools ===')
            for t in tools.tools:
                print(f'  - {t.name}: {t.description[:60]}...')
            
            # Test get_zone_data
            print('\n=== get_zone_data(silk-board) ===')
            result = await session.call_tool('get_zone_data', {'zone_id': 'silk-board'})
            print(result.content[0].text[:300])
            
            # Test get_weather_data
            print('\n=== get_weather_data(silk-board) ===')
            result = await session.call_tool('get_weather_data', {'zone_id': 'silk-board'})
            print(result.content[0].text[:300])
            
            # Test get_nearby_stations
            print('\n=== get_nearby_stations(silk-board) ===')
            result = await session.call_tool('get_nearby_stations', {'zone_id': 'silk-board'})
            print(result.content[0].text[:300])
            
            # Test dispatch_alert
            print('\n=== dispatch_alert ===')
            result = await session.call_tool('dispatch_alert', {
                'zone_id': 'silk-board',
                'severity': 'critical',
                'message': 'Test alert from MCP test script'
            })
            print(result.content[0].text[:300])
            
            print('\n✅ All MCP tools working!')
asyncio.run(test())