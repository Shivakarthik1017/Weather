from typing import Dict, Any, List, Tuple

class AnomalyFusionEngine:
    def __init__(self):
        # Base fusion weights
        self.w_physical = 0.25
        self.w_temporal = 0.20
        self.w_multivariate = 0.15
        self.w_ml = 0.15
        self.w_spatial = 0.25

    def fuse(
        self,
        physical_score: float,
        temporal_score: float,
        multivariate_score: float,
        ml_score: float,
        spatial_score: float,
        spatial_classification: str,
        is_frozen: bool,
        is_drift: bool,
        quality_status: str,
        evidence_lists: List[List[str]]
    ) -> Tuple[float, str, str, float, List[str]]:
        """
        Returns:
            final_anomaly_score (0-100),
            classification (str),
            severity (str: LOW, MEDIUM, HIGH, CRITICAL),
            confidence (0-100),
            consolidated_evidence (List[str])
        """
        # Flatten and deduplicate evidence statements
        all_evidence = []
        for el in evidence_lists:
            for item in el:
                if item and item not in all_evidence:
                    all_evidence.append(item)

        # Immediate override for communication drop or corrupted data
        if quality_status == "COMM_FAILURE":
            return 98.0, "COMMUNICATION ISSUE", "CRITICAL", 96.0, all_evidence
        
        if quality_status == "DATA_CORRUPTION":
            return 95.0, "DATA QUALITY ISSUE", "HIGH", 92.0, all_evidence

        if quality_status == "MISSING_DATA":
            return 75.0, "DATA QUALITY ISSUE", "MEDIUM", 88.0, all_evidence

        # Frozen sensor logic
        if is_frozen:
            return max(75.0, temporal_score), "FROZEN SENSOR", "HIGH", 94.0, all_evidence

        # Sensor drift logic
        if is_drift:
            fused = 0.5 * temporal_score + 0.5 * spatial_score
            return min(85.0, max(60.0, fused)), "SENSOR DRIFT", "MEDIUM", 86.0, all_evidence

        # Genuine weather event vs sensor fault
        if spatial_classification == "GENUINE_WEATHER_EVENT":
            # Multiple nearby stations show consistent change!
            weather_score = max(35.0, min(65.0, 0.5 * temporal_score + 0.5 * multivariate_score))
            confidence = 89.0
            severity = "MEDIUM" if weather_score > 50.0 else "LOW"
            return weather_score, "GENUINE WEATHER EVENT", severity, confidence, all_evidence

        # Standard fusion calculation
        raw_weighted = (
            self.w_physical * physical_score +
            self.w_temporal * temporal_score +
            self.w_multivariate * multivariate_score +
            self.w_ml * ml_score +
            self.w_spatial * spatial_score
        )

        # Isolated station anomaly check
        if spatial_classification == "ISOLATED_SENSOR_FAULT":
            # Strong evidence this is an isolated sensor problem
            raw_weighted = max(raw_weighted, 0.4 * raw_weighted + 0.6 * spatial_score)

        final_score = round(min(100.0, max(0.0, raw_weighted)), 1)

        # Confidence calculation based on concordant evidence sources
        signals_triggered = sum([
            physical_score > 40.0,
            temporal_score > 40.0,
            multivariate_score > 35.0,
            ml_score > 55.0,
            spatial_score > 45.0
        ])
        # Base confidence scales with concordance
        confidence = round(min(98.0, max(45.0, 50.0 + signals_triggered * 9.5 + final_score * 0.15)), 1)

        # Classification and Severity
        if final_score < 25.0:
            classification = "NORMAL"
            severity = "LOW"
            confidence = max(80.0, 100.0 - final_score)
        elif final_score < 45.0:
            classification = "SUSPICIOUS"
            severity = "LOW"
        elif final_score < 70.0:
            if spatial_classification == "ISOLATED_SENSOR_FAULT":
                classification = "SENSOR ANOMALY"
            else:
                classification = "SUSPICIOUS"
            severity = "MEDIUM"
        elif final_score < 85.0:
            classification = "SENSOR ANOMALY"
            severity = "HIGH"
        else:
            classification = "SENSOR ANOMALY"
            severity = "CRITICAL"

        return final_score, classification, severity, confidence, all_evidence
