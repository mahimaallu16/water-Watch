import sys
import os
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai.image_classifier import image_analysis_engine
from app.ai.duplicate_detector import duplicate_detection_engine
from app.ai.priority_predictor import priority_prediction_engine
from app.ai.worker_recommender import worker_recommender_engine

def test_image_classifier_on_sample_leak():
    # Test on generated sample leak image
    img_path = "backend/uploads/reports/sample_leak_1.jpg"
    if os.path.exists(img_path):
        res = image_analysis_engine.analyze_image(img_path)
        assert "suggested_category" in res
        assert "confidence" in res
        assert res["confidence"] >= 0.50
        assert len(res["detected_features"]) > 0

def test_priority_predictor_urgency_tiers():
    # Critical scenario: burst pipe, gushing geyser, 50+ households
    crit = priority_prediction_engine.predict(
        category="pipe_leak",
        estimated_flow="gushing_geyser",
        affected_households=55,
        has_image=True
    )
    assert crit["recommended_severity"] == "critical"
    assert crit["recommended_priority"] == "p1"
    assert crit["urgency_score"] >= 80

    # Low scenario: slow trickle, 1 household
    low = priority_prediction_engine.predict(
        category="other",
        estimated_flow="trickle",
        affected_households=1,
        has_image=False
    )
    assert low["recommended_severity"] == "low"
    assert low["recommended_priority"] == "p4"
    assert low["urgency_score"] < 40

def test_duplicate_detector_proximity_and_time():
    now = datetime.now(timezone.utc)
    rep1 = {
        "id": "rep-1",
        "title": "Severe Main Pipe Burst",
        "category": "pipe_leak",
        "description": "Massive water flooding street near crossing",
        "latitude": 12.9718,
        "longitude": 77.5948,
        "created_at": now
    }
    # Close duplicate: 40 meters away, 1 hour later, same category
    rep2 = {
        "id": "rep-2",
        "title": "Pipe broken and leaking near crossing",
        "category": "pipe_leak",
        "description": "Water overflowing street near pedestrian crossing",
        "latitude": 12.9720,
        "longitude": 77.5950,
        "created_at": now
    }

    match = duplicate_detection_engine.evaluate_candidate(rep1, rep2)
    assert match is not None
    assert match["similarity_score"] >= 0.60
    assert match["category_match"] is True
    assert match["distance_meters"] < 60.0

def test_worker_recommender():
    workers = [
        {
            "user_id": "w1",
            "full_name": "Carlos Mendez",
            "employee_id": "WKR-1001",
            "zone": "Central",
            "specialization": "Main Line Repair",
            "is_available": True,
            "active_tasks_count": 0,
            "max_active_tasks": 5,
            "current_latitude": 12.9720,
            "current_longitude": 77.5950
        },
        {
            "user_id": "w2",
            "full_name": "Elena Rostova",
            "employee_id": "WKR-1002",
            "zone": "North",
            "specialization": "Valve Specialist",
            "is_available": True,
            "active_tasks_count": 4,
            "max_active_tasks": 5,
            "current_latitude": 12.9900,
            "current_longitude": 77.6100
        }
    ]

    # Recommending for Central zone pipe leak: Carlos should rank first
    ranks = worker_recommender_engine.rank_workers(
        incident_category="pipe_leak",
        incident_zone="Central",
        incident_lat=12.9718,
        incident_lon=77.5948,
        available_workers=workers
    )
    assert len(ranks) == 2
    assert ranks[0]["worker_id"] == "w1"
    assert ranks[0]["match_score"] > ranks[1]["match_score"]
    assert ranks[0]["zone_match"] is True

