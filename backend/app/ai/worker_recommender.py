from typing import List, Dict, Any, Optional
from app.ai.duplicate_detector import calculate_haversine_distance_meters

SPECIALIZATION_MAP = {
    "pipe_leak": ["Main Line Repair", "General Plumbing", "Emergency Response"],
    "overflow": ["Emergency Response", "Main Line Repair", "Drainage Specialist"],
    "damaged_valve": ["Valve Specialist", "Mechanical Plumbing", "General Plumbing"],
    "low_pressure": ["Pressure Diagnostics", "Valve Specialist", "General Plumbing"],
    "contamination": ["Water Quality & Treatment", "Emergency Response"],
    "other": ["General Plumbing", "Emergency Response"]
}

class WorkerRecommenderEngine:
    def rank_workers(
        self,
        incident_category: str,
        incident_zone: str,
        incident_lat: float,
        incident_lon: float,
        available_workers: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Ranks workers for an incident based on availability, zone, workload, and specialization.
        """
        recommended_specs = SPECIALIZATION_MAP.get(incident_category.lower(), ["General Plumbing"])
        ranked_list = []

        for w in available_workers:
            # If completely unavailable, score drops significantly
            if not w.get("is_available", True):
                continue

            active_tasks = w.get("active_tasks_count", 0)
            max_tasks = w.get("max_active_tasks", 5)
            
            # If at full capacity, skip
            if active_tasks >= max_tasks:
                continue

            score = 50.0 # Base score

            # 1. Workload factor: less busy workers get higher score (up to +25)
            capacity_ratio = active_tasks / max(1, max_tasks)
            workload_score = (1.0 - capacity_ratio) * 25.0
            score += workload_score

            # 2. Zone match (+20)
            zone_match = (w.get("zone", "").lower() == incident_zone.lower())
            if zone_match:
                score += 20.0

            # 3. Specialization match (+20)
            worker_spec = w.get("specialization", "")
            spec_match = any(req.lower() in worker_spec.lower() for req in recommended_specs)
            if spec_match:
                score += 20.0

            # 4. Distance proximity if GPS coordinates exist
            dist_km = None
            if w.get("current_latitude") and w.get("current_longitude"):
                dist_m = calculate_haversine_distance_meters(
                    incident_lat, incident_lon,
                    w["current_latitude"], w["current_longitude"]
                )
                dist_km = round(dist_m / 1000.0, 2)
                # Within 10km adds up to 10 points
                dist_score = max(0.0, 10.0 - dist_km)
                score += dist_score

            total_score = round(min(100.0, score), 1)

            reasons = []
            if zone_match:
                reasons.append(f"Located in target {incident_zone} zone")
            if spec_match:
                reasons.append(f"Specialized in {worker_spec}")
            reasons.append(f"Active load: {active_tasks}/{max_tasks} tasks")
            if dist_km is not None:
                reasons.append(f"{dist_km} km away")

            ranked_list.append({
                "worker_id": str(w["user_id"]),
                "worker_name": w.get("full_name", "Field Worker"),
                "employee_id": w.get("employee_id", "EMP-000"),
                "match_score": total_score,
                "active_tasks": active_tasks,
                "zone_match": zone_match,
                "specialization_match": spec_match,
                "distance_km": dist_km,
                "reasoning": " | ".join(reasons)
            })

        # Sort descending by match score
        ranked_list.sort(key=lambda x: x["match_score"], reverse=True)
        return ranked_list

worker_recommender_engine = WorkerRecommenderEngine()

