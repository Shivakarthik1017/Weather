"""
SkyGuard AI - Real SHAP-Based Explainable AI Module
Provides genuine Shapley Additive exPlanations (SHAP) for the Isolation Forest anomaly detector.
Evaluates the marginal contribution of each physical, temporal, and spatial feature
to explain why a weather observation was flagged as an anomaly.
"""

import logging
from typing import Dict, Any, List, Optional
import numpy as np

logger = logging.getLogger("skyguard.shap")

# Attempt SHAP import with graceful fallback
try:
    import shap
    HAS_SHAP = True
except ImportError:
    shap = None
    HAS_SHAP = False
    logger.warning("SHAP package not found. Explainability will use parametric fallback.")

from backend.app.ml.isolation_forest import FEATURE_NAMES, IsolationForestEngine

FEATURE_METADATA = {
    "temperature_c": {"name": "Air Temperature", "unit": "°C", "desc": "Current ambient dry-bulb temperature"},
    "pressure_hpa": {"name": "Atmospheric Pressure", "unit": "hPa", "desc": "Current barometric station pressure"},
    "relative_humidity": {"name": "Relative Humidity", "unit": "%", "desc": "Current relative humidity"},
    "delta_t": {"name": "Step Change (Temp)", "unit": "°C/tick", "desc": "Rate of change in temperature"},
    "delta_p": {"name": "Step Change (Press)", "unit": "hPa/tick", "desc": "Rate of change in pressure"},
    "delta_rh": {"name": "Step Change (Hum)", "unit": "%/tick", "desc": "Rate of change in relative humidity"},
    "rolling_mean_t": {"name": "Rolling Mean Temp", "unit": "°C", "desc": "Short-window temporal average temperature"},
    "rolling_std_t": {"name": "Rolling Std Dev (Temp)", "unit": "°C", "desc": "Short-window thermal volatility"},
    "rolling_mean_p": {"name": "Rolling Mean Press", "unit": "hPa", "desc": "Short-window temporal average pressure"},
    "rolling_std_p": {"name": "Rolling Std Dev (Press)", "unit": "hPa", "desc": "Short-window barometric volatility"},
    "rolling_mean_rh": {"name": "Rolling Mean Hum", "unit": "%", "desc": "Short-window temporal average humidity"},
    "rolling_std_rh": {"name": "Rolling Std Dev (Hum)", "unit": "%", "desc": "Short-window humidity volatility"},
    "z_score_t": {"name": "Temporal Z-Score (Temp)", "unit": "σ", "desc": "Standard deviations from station temporal mean"},
    "z_score_p": {"name": "Temporal Z-Score (Press)", "unit": "σ", "desc": "Standard deviations from station pressure mean"},
    "z_score_rh": {"name": "Temporal Z-Score (Hum)", "unit": "σ", "desc": "Standard deviations from station humidity mean"},
    "neighbour_dev_t": {"name": "Spatial Neighbor Dev (Temp)", "unit": "°C", "desc": "Discrepancy from neighboring AWS cluster median temp"},
    "neighbour_dev_p": {"name": "Spatial Neighbor Dev (Press)", "unit": "hPa", "desc": "Discrepancy from neighboring AWS cluster median press"},
    "neighbour_std_t": {"name": "Spatial Cluster Variance", "unit": "°C", "desc": "Spread among nearest neighboring AWS stations"}
}


class SkyGuardShapExplainer:
    """
    Genuine SHAP explanation engine for SkyGuard's Isolation Forest model.
    Wraps the trained tree ensemble in a TreeExplainer to compute exact feature attribution.
    """

    def __init__(self, ml_engine: Optional[IsolationForestEngine] = None):
        self.ml_engine = ml_engine or IsolationForestEngine()
        self.tree_explainer = None
        self.expected_value = 0.0
        self.is_initialized = False

        self._init_explainer()

    def _init_explainer(self):
        if not HAS_SHAP or self.ml_engine.model is None or not self.ml_engine.is_trained:
            return

        try:
            # TreeExplainer calculates exact Shapley values for tree-based models
            self.tree_explainer = shap.TreeExplainer(self.ml_engine.model)
            ev = self.tree_explainer.expected_value
            if isinstance(ev, (list, np.ndarray)):
                self.expected_value = float(ev[0])
            else:
                self.expected_value = float(ev)
            self.is_initialized = True
            logger.info("SHAP TreeExplainer initialized successfully with expected depth %.3f", self.expected_value)
        except Exception as e:
            logger.error("Failed to initialize SHAP TreeExplainer: %s", e)
            self.tree_explainer = None
            self.is_initialized = False

    def explain(
        self,
        feature_dict: Dict[str, Any],
        anomaly_score: float = 0.0,
        classification: str = "",
        root_cause: str = "",
        confidence: float = 0.0
    ) -> Dict[str, Any]:
        """
        Computes SHAP feature contributions for a given observation feature dictionary.
        Returns a structured explanation detailing top contributors, direction, and narrative summary.
        """
        vec = self.ml_engine._extract_feature_vector(feature_dict)
        X = vec.reshape(1, -1)

        # Fallback if SHAP or model not initialized
        if not self.is_initialized or self.tree_explainer is None:
            return self._fallback_explanation(vec, anomaly_score, classification, root_cause, confidence)

        try:
            # Compute raw SHAP values: shape (1, 18)
            raw_shap = self.tree_explainer.shap_values(X)
            if isinstance(raw_shap, list):
                shap_vector = np.array(raw_shap[0][0])
            elif isinstance(raw_shap, np.ndarray) and raw_shap.ndim == 2:
                shap_vector = raw_shap[0]
            else:
                shap_vector = np.array(raw_shap).flatten()

            # IsolationForest semantics:
            # Trees measure path length. Shorter path length (< expected_value) indicates fast isolation -> anomaly.
            # Negative SHAP on path length means the feature reduced the depth (made it isolated faster).
            # Therefore, anomaly contribution = -raw_shap.
            # A positive anomaly contribution indicates the feature pushes towards anomaly!
            anomaly_contributions = -shap_vector

            feature_items: List[Dict[str, Any]] = []
            for idx, feat_name in enumerate(FEATURE_NAMES):
                meta = FEATURE_METADATA.get(feat_name, {"name": feat_name, "unit": "", "desc": ""})
                val = float(vec[idx])
                contrib = float(anomaly_contributions[idx])
                importance = abs(contrib)
                direction = "anomaly_increasing" if contrib > 0.0 else "anomaly_decreasing"

                # Impact description
                if contrib > 0.4:
                    impact = f"Strongly increases anomaly likelihood (+{contrib:.2f})"
                elif contrib > 0.15:
                    impact = f"Moderately increases anomaly likelihood (+{contrib:.2f})"
                elif contrib > 0.02:
                    impact = f"Slightly elevates anomaly index (+{contrib:.2f})"
                elif contrib < -0.15:
                    impact = f"Normalizing effect: aligns with expected baseline ({contrib:.2f})"
                else:
                    impact = f"Neutral baseline contribution ({contrib:.2f})"

                feature_items.append({
                    "feature": feat_name,
                    "display_name": meta["name"],
                    "value": round(val, 2),
                    "unit": meta["unit"],
                    "description": meta["desc"],
                    "shap_value": round(contrib, 4),
                    "raw_tree_shap": round(float(shap_vector[idx]), 4),
                    "importance": round(importance, 4),
                    "direction": direction,
                    "impact_description": impact
                })

            # Sort by importance descending
            feature_items.sort(key=lambda item: item["importance"], reverse=True)
            top_features = feature_items[:5]

            # Generate natural language narrative summary
            summary = self._generate_narrative_summary(
                top_features=top_features,
                anomaly_score=anomaly_score,
                classification=classification,
                root_cause=root_cause
            )

            return {
                "available": True,
                "model": "Isolation Forest (100 Trees) + SHAP TreeExplainer",
                "anomaly_score": round(anomaly_score, 1),
                "base_value": round(self.expected_value, 2),
                "expected_value": round(self.expected_value, 2),
                "top_features": top_features,
                "all_features": feature_items,
                "summary": summary,
                "root_cause": root_cause,
                "confidence": round(confidence, 1) if confidence else None
            }

        except Exception as e:
            logger.error("Error executing SHAP TreeExplainer calculation: %s", e)
            return self._fallback_explanation(vec, anomaly_score, classification, root_cause, confidence)

    def _generate_narrative_summary(
        self,
        top_features: List[Dict[str, Any]],
        anomaly_score: float,
        classification: str,
        root_cause: str
    ) -> str:
        increasing = [f for f in top_features if f["direction"] == "anomaly_increasing" and f["importance"] > 0.05]

        if not increasing or anomaly_score < 30.0:
            return "Observation features are consistent with typical meteorological multi-dimensional baselines; no significant anomaly drivers detected."

        top_factors = []
        for feat in increasing[:3]:
            top_factors.append(f"{feat['display_name']} ({feat['value']}{feat['unit']})")

        drivers_str = " and ".join(top_factors) if len(top_factors) <= 2 else f"{top_factors[0]}, {top_factors[1]}, and {top_factors[2]}"

        cause_text = f" Associated diagnosis: {root_cause}." if root_cause else ""
        classification_text = f" Classified as {classification}." if classification else ""

        return (
            f"Isolation Forest identified high-dimensional isolation driven primarily by {drivers_str}."
            f"{classification_text}{cause_text}"
        )

    def _fallback_explanation(
        self,
        vec: np.ndarray,
        anomaly_score: float,
        classification: str,
        root_cause: str,
        confidence: float
    ) -> Dict[str, Any]:
        """Parametric z-score explanation fallback when SHAP is initializing or unavailable."""
        z_devs = np.abs((vec - self.ml_engine.feature_means) / self.ml_engine.feature_stds)
        feature_items = []
        for idx, feat_name in enumerate(FEATURE_NAMES):
            meta = FEATURE_METADATA.get(feat_name, {"name": feat_name, "unit": "", "desc": ""})
            val = float(vec[idx])
            z = float(z_devs[idx])
            direction = "anomaly_increasing" if z > 1.5 else "anomaly_decreasing"
            feature_items.append({
                "feature": feat_name,
                "display_name": meta["name"],
                "value": round(val, 2),
                "unit": meta["unit"],
                "description": meta["desc"],
                "shap_value": round(z / 5.0, 4),
                "importance": round(z, 4),
                "direction": direction,
                "impact_description": f"Parametric z-score deviation: {z:.2f}σ"
            })

        feature_items.sort(key=lambda item: item["importance"], reverse=True)
        top_features = feature_items[:5]

        summary = self._generate_narrative_summary(top_features, anomaly_score, classification, root_cause)

        return {
            "available": False,
            "model": "Parametric Feature Sensitivity (SHAP Fallback)",
            "anomaly_score": round(anomaly_score, 1),
            "base_value": 0.0,
            "expected_value": 0.0,
            "top_features": top_features,
            "all_features": feature_items,
            "summary": summary,
            "root_cause": root_cause,
            "confidence": round(confidence, 1) if confidence else None
        }
