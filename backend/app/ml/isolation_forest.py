import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, Any, List, Tuple

MODEL_FILE = "models/isolation_forest.joblib"

FEATURE_NAMES = [
    "temperature_c", "pressure_hpa", "relative_humidity",
    "delta_t", "delta_p", "delta_rh",
    "rolling_mean_t", "rolling_std_t",
    "rolling_mean_p", "rolling_std_p",
    "rolling_mean_rh", "rolling_std_rh",
    "z_score_t", "z_score_p", "z_score_rh",
    "neighbour_dev_t", "neighbour_dev_p", "neighbour_std_t"
]

class IsolationForestEngine:
    def __init__(self):
        self.model = None
        self.feature_means = np.zeros(len(FEATURE_NAMES))
        self.feature_stds = np.ones(len(FEATURE_NAMES))
        self.is_trained = False
        self._load_or_train()

    def _extract_feature_vector(self, data: Dict[str, Any]) -> np.ndarray:
        vec = []
        for name in FEATURE_NAMES:
            val = data.get(name, 0.0)
            if val is None or np.isnan(val):
                val = 0.0
            vec.append(float(val))
        return np.array(vec, dtype=np.float32)

    def _load_or_train(self):
        if os.path.exists(MODEL_FILE):
            try:
                data = joblib.load(MODEL_FILE)
                self.model = data["model"]
                self.feature_means = data["means"]
                self.feature_stds = data["stds"]
                self.is_trained = True
                return
            except Exception:
                pass
        
        # Self-train on synthetic normal baseline
        self.train_baseline_model()

    def train_baseline_model(self, num_samples: int = 2000):
        """Train IsolationForest on synthetic normal meteorological operational data."""
        np.random.seed(42)
        X = np.zeros((num_samples, len(FEATURE_NAMES)))

        for i in range(num_samples):
            # Normal distribution with typical weather variances
            t = np.random.normal(30.0, 5.0)
            p = np.random.normal(1005.0, 8.0)
            rh = np.clip(np.random.normal(60.0, 15.0), 20.0, 95.0)
            
            delta_t = np.random.normal(0.0, 0.12)
            delta_p = np.random.normal(0.0, 0.08)
            delta_rh = np.random.normal(0.0, 0.4)
            
            roll_mean_t = t + np.random.normal(0.0, 0.2)
            roll_std_t = np.clip(np.random.normal(0.35, 0.1), 0.05, 1.2)
            
            roll_mean_p = p + np.random.normal(0.0, 0.15)
            roll_std_p = np.clip(np.random.normal(0.2, 0.05), 0.05, 0.8)
            
            roll_mean_rh = rh + np.random.normal(0.0, 0.5)
            roll_std_rh = np.clip(np.random.normal(0.6, 0.15), 0.1, 2.0)
            
            z_t = (t - roll_mean_t) / roll_std_t
            z_p = (p - roll_mean_p) / roll_std_p
            z_rh = (rh - roll_mean_rh) / roll_std_rh
            
            n_dev_t = np.random.normal(0.0, 0.8)
            n_dev_p = np.random.normal(0.0, 0.5)
            n_std_t = np.clip(np.random.normal(0.9, 0.2), 0.2, 2.0)

            X[i] = [
                t, p, rh,
                delta_t, delta_p, delta_rh,
                roll_mean_t, roll_std_t,
                roll_mean_p, roll_std_p,
                roll_mean_rh, roll_std_rh,
                z_t, z_p, z_rh,
                n_dev_t, n_dev_p, n_std_t
            ]

        self.feature_means = np.mean(X, axis=0)
        self.feature_stds = np.maximum(np.std(X, axis=0), 1e-4)

        # Train Isolation Forest with 100 trees and 3% expected contamination
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.03,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X)
        self.is_trained = True

        os.makedirs("models", exist_ok=True)
        try:
            joblib.dump({"model": self.model, "means": self.feature_means, "stds": self.feature_stds}, MODEL_FILE)
        except Exception:
            pass

    def predict(self, feature_dict: Dict[str, Any]) -> Tuple[float, bool, List[str], Dict[str, Any]]:
        """
        Runs the Isolation Forest.
        Returns:
            ml_anomaly_score (0-100),
            is_anomaly (bool),
            evidence (List[str]),
            ml_metadata (Dict)
        """
        if not self.is_trained or self.model is None:
            return 0.0, False, [], {}

        vec = self._extract_feature_vector(feature_dict)
        X = vec.reshape(1, -1)

        # decision_function gives score where negative means anomaly
        raw_score = float(self.model.decision_function(X)[0])
        pred = int(self.model.predict(X)[0])  # -1 for anomaly, 1 for inlier
        is_anomaly = (pred == -1)

        # Normalize decision function to 0-100 score
        # Typical decision_function values range from -0.35 (severe anomaly) to +0.25 (typical normal)
        # We map <= -0.25 to ~95+, 0.0 to 50, >= 0.20 to < 10
        norm_score = max(0.0, min(100.0, (0.18 - raw_score) * 220.0))

        # Identify feature contributions by standardized z-deviation from training centroid
        z_devs = np.abs((vec - self.feature_means) / self.feature_stds)
        top_indices = np.argsort(z_devs)[::-1][:3]
        top_features = [FEATURE_NAMES[idx] for idx in top_indices if z_devs[idx] > 2.0]

        evidence = []
        if is_anomaly or norm_score > 60.0:
            feat_desc = ", ".join(top_features) if top_features else "joint multivariate feature vector"
            evidence.append(
                f"Isolation Forest (100-tree ensemble) flagged observation as high-dimensional outlier (anomaly index: {norm_score:.1f}, primary driving dimensions: {feat_desc})."
            )

        metadata = {
            "raw_decision_score": round(raw_score, 4),
            "is_outlier": is_anomaly,
            "top_outlier_features": top_features,
            "ml_anomaly_score": round(norm_score, 1)
        }

        return norm_score, is_anomaly, evidence, metadata
