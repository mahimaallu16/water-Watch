from typing import Dict, Any, Optional

class PriorityPredictionEngine:
    """
    Evaluates incident and report factors to compute urgency,
    recommended severity level, and response priority.
    """
    CATEGORY_WEIGHTS = {
        "contamination": 45,
        "overflow": 35,
        "pipe_leak": 25,
        "damaged_valve": 20,
        "low_pressure": 15,
        "other": 10
    }

    FLOW_WEIGHTS = {
        "gushing_geyser": 35,
        "heavy_flow": 25,
        "moderate_stream": 15,
        "trickle": 5
    }

    def predict(
        self,
        category: str,
        estimated_flow: str = "moderate_stream",
        affected_households: int = 1,
        has_image: bool = True,
        recurring_hotspot: bool = False
    ) -> Dict[str, Any]:
        cat_score = self.CATEGORY_WEIGHTS.get(category.lower(), 15)
        flow_score = self.FLOW_WEIGHTS.get(estimated_flow.lower(), 15)

        # Household impact scaling
        if affected_households >= 50:
            hh_score = 30
        elif affected_households >= 10:
            hh_score = 20
        elif affected_households >= 3:
            hh_score = 10
        else:
            hh_score = 5

        # Photo verification confidence
        evidence_score = 5 if has_image else 0

        # Recurring failure area
        recurrence_score = 10 if recurring_hotspot else 0

        # Compute raw urgency score (max capped at 100)
        urgency_score = min(100.0, float(cat_score + flow_score + hh_score + evidence_score + recurrence_score))

        # Severity & priority tiers
        if urgency_score >= 80:
            severity = "critical"
            priority = "p1"
            turnaround = "< 4 hours"
        elif urgency_score >= 55:
            severity = "high"
            priority = "p2"
            turnaround = "< 12 hours"
        elif urgency_score >= 35:
            severity = "medium"
            priority = "p3"
            turnaround = "< 24 hours"
        else:
            severity = "low"
            priority = "p4"
            turnaround = "< 48 hours"

        reasoning = (
            f"Rated {severity.upper()} (Priority {priority.upper()}) based on category '{category}' ({cat_score}pts), "
            f"flow rate '{estimated_flow}' ({flow_score}pts), and {affected_households} affected household(s). "
            f"Target response window: {turnaround}."
        )

        return {
            "recommended_severity": severity,
            "recommended_priority": priority,
            "urgency_score": round(urgency_score, 1),
            "target_turnaround": turnaround,
            "factors": {
                "category_score": cat_score,
                "flow_score": flow_score,
                "household_score": hh_score,
                "evidence_score": evidence_score,
                "recurrence_score": recurrence_score
            },
            "reasoning": reasoning
        }

priority_prediction_engine = PriorityPredictionEngine()

