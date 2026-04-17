"""
NammaCity AI — Scoring Engine
Calculates congestion, pollution, and infrastructure stress scores for Bengaluru zones.
"""

import math
from typing import Optional


def get_time_modifier(hour: int) -> float:
    """
    Returns a multiplier based on time of day.
    Models Bengaluru's bimodal traffic pattern:
      - Morning peak: 8-10 AM (modifier ~1.4)
      - Evening peak: 5-8 PM (modifier ~1.4)
      - Off-peak: 11 PM - 6 AM (modifier ~0.5-0.6)
      - Normal: everything else (~0.9-1.0)
    
    Uses a sum-of-gaussians curve for smooth transitions.
    """
    # Morning peak centered at 9 AM
    morning = 1.4 * math.exp(-0.5 * ((hour - 9) / 1.5) ** 2)
    # Evening peak centered at 18 (6 PM)
    evening = 1.4 * math.exp(-0.5 * ((hour - 18) / 1.8) ** 2)
    # Base level (never goes below 0.5)
    base = 0.5
    
    modifier = base + morning + evening
    # Clamp between 0.5 and 1.5
    return max(0.5, min(1.5, modifier))


def get_pollution_time_modifier(hour: int) -> float:
    """
    Pollution modifier — peaks during traffic hours but also 
    has an industrial component during daytime.
    """
    # Traffic-correlated pollution
    traffic = 0.8 * math.exp(-0.5 * ((hour - 9) / 2.0) ** 2)
    traffic += 0.8 * math.exp(-0.5 * ((hour - 18) / 2.0) ** 2)
    # Daytime industrial baseline
    industrial = 0.3 * math.exp(-0.5 * ((hour - 13) / 4.0) ** 2)
    base = 0.6
    
    modifier = base + traffic + industrial
    return max(0.5, min(1.4, modifier))


def calculate_trend(zone: dict, current_hour: int) -> str:
    """
    Determine if conditions are rising, stable, or falling
    based on whether we're approaching or leaving a peak.
    """
    current_mod = get_time_modifier(current_hour)
    next_mod = get_time_modifier((current_hour + 1) % 24)
    
    diff = next_mod - current_mod
    if diff > 0.05:
        return "rising"
    elif diff < -0.05:
        return "falling"
    return "stable"


def build_factors_list(
    zone: dict, 
    weather: Optional[dict], 
    active_events: list, 
    current_hour: int
) -> list:
    """Build a human-readable list of factors affecting this zone."""
    factors = []
    
    # Time-based factors
    time_mod = get_time_modifier(current_hour)
    if time_mod > 1.2:
        factors.append({
            "type": "time",
            "label": "Peak hour traffic",
            "impact": "high",
            "icon": "clock"
        })
    elif time_mod > 1.0:
        factors.append({
            "type": "time",
            "label": "Moderate traffic period",
            "impact": "medium",
            "icon": "clock"
        })
    
    # Weather factors
    if weather and weather.get("is_raining"):
        factors.append({
            "type": "weather",
            "label": f"Rain — {weather.get('condition', 'Rainy')}",
            "impact": "high",
            "icon": "cloud-rain"
        })
    
    # Event factors
    for event in active_events:
        if zone["id"] in event.get("affected_zones", []) or "ALL" in event.get("affected_zones", []):
            impact = "high" if event.get("congestion_impact", 0) >= 3 else "medium"
            factors.append({
                "type": "event",
                "label": event["name"],
                "impact": impact,
                "icon": "alert-triangle"
            })
    
    # Zone-type factors
    zone_type = zone.get("type", "")
    if "industrial" in zone_type:
        factors.append({
            "type": "zone",
            "label": "Industrial area — elevated baseline pollution",
            "impact": "medium",
            "icon": "factory"
        })
    if "it-corridor" in zone_type or "it-residential" in zone_type:
        if 8 <= current_hour <= 10 or 17 <= current_hour <= 20:
            factors.append({
                "type": "zone",
                "label": "IT corridor — office commuter surge",
                "impact": "high",
                "icon": "building"
            })
    if "transit-hub" in zone_type:
        factors.append({
            "type": "zone",
            "label": "Major transit hub — high footfall",
            "impact": "medium",
            "icon": "bus"
        })
    
    return factors


def calculate_zone_score(
    zone: dict, 
    current_hour: int, 
    weather: Optional[dict] = None, 
    active_events: Optional[list] = None,
    zone_overrides: Optional[dict] = None
) -> dict:
    """
    Calculate risk scores for a zone based on current conditions.
    
    Args:
        zone: Zone data dict with base scores
        current_hour: Current hour (0-23)
        weather: Weather conditions dict
        active_events: List of active event dicts
        zone_overrides: Dict of zone_id -> override values (from scenarios)
    
    Returns:
        Dict with congestion, pollution, infra_stress, composite scores + metadata
    """
    if active_events is None:
        active_events = []
    if weather is None:
        weather = {"condition": "Clear", "is_raining": False, "temperature": 28}
    
    # Start with base scores
    congestion = float(zone["base_traffic_load"])
    pollution = float(zone["base_pollution"])
    infra_stress = float(zone["base_infra_stress"])
    
    # Apply zone overrides (from what-if scenarios)
    if zone_overrides and zone["id"] in zone_overrides:
        overrides = zone_overrides[zone["id"]]
        congestion += overrides.get("base_traffic_load_add", 0)
        pollution += overrides.get("base_pollution_add", 0)
        infra_stress += overrides.get("base_infra_stress_add", 0)
    
    # Time-of-day modifiers
    time_mod = get_time_modifier(current_hour)
    pollution_time_mod = get_pollution_time_modifier(current_hour)
    
    congestion *= time_mod
    pollution *= pollution_time_mod
    
    # Weather modifiers
    if weather.get("is_raining"):
        congestion *= 1.3    # 30% worse traffic in rain
        infra_stress *= 1.25  # flooding/waterlogging stress
        pollution *= 0.85     # rain washes pollution slightly
    
    # High temperature increases pollution
    temp = weather.get("temperature", 28)
    if temp > 35:
        pollution *= 1.15
    
    # Event modifiers
    for event in active_events:
        affected = event.get("affected_zones", [])
        if zone["id"] in affected or "ALL" in affected:
            # Check time window for time-limited events
            start = event.get("start_hour", 0)
            end = event.get("end_hour", 24)
            if start <= current_hour < end or (start > end and (current_hour >= start or current_hour < end)):
                congestion += event.get("congestion_impact", 0)
                pollution += event.get("pollution_impact", 0)
                infra_stress += event.get("infra_stress_impact", 0)
    
    # Clamp all scores to 0-10
    congestion = max(0.0, min(10.0, congestion))
    pollution = max(0.0, min(10.0, pollution))
    infra_stress = max(0.0, min(10.0, infra_stress))
    
    # Composite score (weighted average)
    composite = congestion * 0.4 + pollution * 0.3 + infra_stress * 0.3
    
    # Determine severity level
    if composite >= 7.5:
        severity = "critical"
    elif composite >= 5.5:
        severity = "warning"
    elif composite >= 3.5:
        severity = "moderate"
    else:
        severity = "normal"
    
    return {
        "congestion": round(congestion, 1),
        "pollution": round(pollution, 1),
        "infra_stress": round(infra_stress, 1),
        "composite": round(composite, 1),
        "severity": severity,
        "trend": calculate_trend(zone, current_hour),
        "factors": build_factors_list(zone, weather, active_events, current_hour)
    }


def calculate_all_zones(
    zones: list,
    current_hour: int,
    weather: Optional[dict] = None,
    active_events: Optional[list] = None,
    zone_overrides: Optional[dict] = None
) -> list:
    """Calculate scores for all zones and return enriched zone list."""
    results = []
    for zone in zones:
        scores = calculate_zone_score(zone, current_hour, weather, active_events, zone_overrides)
        results.append({
            "id": zone["id"],
            "name": zone["name"],
            "center": zone["center"],
            "type": zone["type"],
            "description": zone["description"],
            "nearby_stations": zone.get("nearby_stations", []),
            "scores": scores
        })
    return results
