import math
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.config import settings

def calculate_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS points in meters using Haversine formula.
    """
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def tokenize_text(text: str) -> set:
    if not text:
        return set()
    cleaned = re.sub(r"[^\w\s]", "", text.lower())
    words = set(cleaned.split())
    # Exclude basic stopwords
    stopwords = {"the", "a", "an", "is", "in", "at", "of", "on", "and", "or", "to", "for", "with", "water", "near"}
    return words - stopwords

def compute_text_similarity(text1: str, text2: str) -> float:
    tokens1 = tokenize_text(text1)
    tokens2 = tokenize_text(text2)
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return round(len(intersection) / len(union), 3)

class DuplicateDetectionEngine:
    def __init__(
        self,
        max_distance_meters: float = settings.DUPLICATE_DISTANCE_METERS,
        max_time_hours: float = settings.DUPLICATE_TIME_WINDOW_HOURS,
        min_similarity_threshold: float = 0.55
    ):
        self.max_distance_meters = max_distance_meters
        self.max_time_hours = max_time_hours
        self.min_similarity_threshold = min_similarity_threshold

    def evaluate_candidate(
        self,
        report_data: Dict[str, Any],
        candidate_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Compares report against an existing candidate report.
        Returns candidate match details if similarity exceeds threshold, or None.
        """
        # Distance calculation
        dist = calculate_haversine_distance_meters(
            report_data["latitude"], report_data["longitude"],
            candidate_data["latitude"], candidate_data["longitude"]
        )
        
        # If beyond maximum search radius, skip immediately
        if dist > self.max_distance_meters:
            return None

        # Time difference calculation
        t1 = report_data.get("created_at")
        t2 = candidate_data.get("created_at")
        if isinstance(t1, str):
            t1 = datetime.fromisoformat(t1.replace("Z", "+00:00"))
        if isinstance(t2, str):
            t2 = datetime.fromisoformat(t2.replace("Z", "+00:00"))
            
        time_diff_hours = abs((t1 - t2).total_seconds()) / 3600.0 if t1 and t2 else 0.0
        if time_diff_hours > self.max_time_hours:
            return None

        # Distance score (1.0 at 0m, drops linearly to 0 at max_distance_meters)
        distance_score = max(0.0, 1.0 - (dist / self.max_distance_meters))
        
        # Time decay score (1.0 at 0h, drops to 0 at max_time_hours)
        time_score = max(0.0, 1.0 - (time_diff_hours / self.max_time_hours))
        
        # Category match
        category_match = report_data.get("category") == candidate_data.get("category")
        category_score = 1.0 if category_match else 0.3

        # Description & title text similarity
        txt1 = f"{report_data.get('title', '')} {report_data.get('description', '')}"
        txt2 = f"{candidate_data.get('title', '')} {candidate_data.get('description', '')}"
        text_sim = compute_text_similarity(txt1, txt2)

        # Composite weighted score:
        # Distance: 45%, Time: 25%, Category: 15%, Text: 15%
        composite_score = (
            (distance_score * 0.45) +
            (time_score * 0.25) +
            (category_score * 0.15) +
            (text_sim * 0.15)
        )
        composite_score = round(min(1.0, max(0.0, composite_score)), 3)

        if composite_score >= self.min_similarity_threshold:
            reasons = []
            if dist < 50:
                reasons.append(f"Extremely close proximity ({int(dist)}m)")
            else:
                reasons.append(f"Nearby location ({int(dist)}m)")
                
            if time_diff_hours < 12:
                reasons.append(f"Reported within {int(time_diff_hours)}h of each other")
            elif time_diff_hours < 48:
                reasons.append(f"Reported within {int(time_diff_hours/24)} days")
                
            if category_match:
                reasons.append(f"Identical problem category ({report_data.get('category')})")
            if text_sim > 0.30:
                reasons.append(f"High description vocabulary overlap ({int(text_sim*100)}%)")

            return {
                "potential_duplicate_id": str(candidate_data["id"]),
                "similarity_score": composite_score,
                "distance_meters": dist,
                "time_diff_hours": round(time_diff_hours, 1),
                "text_similarity": text_sim,
                "category_match": category_match,
                "reasons": reasons
            }

        return None

duplicate_detection_engine = DuplicateDetectionEngine()

