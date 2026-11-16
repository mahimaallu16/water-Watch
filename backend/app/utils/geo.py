"""
Geospatial calculation and coordinate validation utilities.
"""
import math
from typing import Tuple
from app.core.exceptions import BadRequestException

def validate_coordinates(latitude: float, longitude: float) -> Tuple[float, float]:
    """
    Validates geographical latitude and longitude bounds.
    - Latitude must be between -90.0 and +90.0
    - Longitude must be between -180.0 and +180.0
    """
    if latitude is None or longitude is None:
        raise BadRequestException("Latitude and longitude coordinates are required.")
    
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        raise BadRequestException("Coordinates must be valid numerical values.")

    if not (-90.0 <= lat <= 90.0):
        raise BadRequestException(f"Invalid latitude: {lat}. Latitude must be between -90.0 and +90.0.")
    if not (-180.0 <= lon <= 180.0):
        raise BadRequestException(f"Invalid longitude: {lon}. Longitude must be between -180.0 and +180.0.")

    return lat, lon

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes Great-Circle distance between two points in meters using Haversine formula.
    """
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes Great-Circle distance in kilometers.
    """
    return haversine_distance_meters(lat1, lon1, lat2, lon2) / 1000.0

