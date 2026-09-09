import time
from typing import Dict, Any, List

class SystemEvaluationTracker:
    def __init__(self):
        self.total_observations = 0
        self.total_anomalies_detected = 0
        self.tp = 0
        self.fp = 0
        self.tn = 0
        self.fn = 0
        self.latencies_ms: List[float] = []
        self.processing_times_ms: List[float] = []

    def record_evaluation_step(
        self,
        is_detected: bool,
        is_ground_truth: bool,
        proc_time_ms: float,
        latency_ms: float = 0.0
    ):
        self.total_observations += 1
        self.processing_times_ms.append(proc_time_ms)
        if len(self.processing_times_ms) > 2000:
            self.processing_times_ms.pop(0)

        if is_detected:
            self.total_anomalies_detected += 1
            if latency_ms > 0:
                self.latencies_ms.append(latency_ms)
                if len(self.latencies_ms) > 500:
                    self.latencies_ms.pop(0)

        # Update confusion matrix
        if is_detected and is_ground_truth:
            self.tp += 1
        elif is_detected and not is_ground_truth:
            self.fp += 1
        elif not is_detected and is_ground_truth:
            self.fn += 1
        else:
            self.tn += 1

    def get_metrics(self) -> Dict[str, Any]:
        has_ground_truth_or_preds = (self.tp + self.fn > 0) or (self.tp + self.fp > 0)
        
        if (self.tp + self.fp) > 0:
            precision = self.tp / (self.tp + self.fp)
        else:
            precision = 0.0 if not has_ground_truth_or_preds else 0.0

        if (self.tp + self.fn) > 0:
            recall = self.tp / (self.tp + self.fn)
        else:
            recall = 0.0

        if (precision + recall) > 0:
            f1 = 2 * (precision * recall) / (precision + recall)
        else:
            f1 = 0.0

        fpr = (self.fp / (self.fp + self.tn)) if (self.fp + self.tn) > 0 else 0.0

        avg_latency = float(sum(self.latencies_ms) / len(self.latencies_ms)) if self.latencies_ms else (
            float(sum(self.processing_times_ms) / len(self.processing_times_ms)) if self.processing_times_ms else 0.0
        )
        avg_proc_time = float(sum(self.processing_times_ms) / len(self.processing_times_ms)) if self.processing_times_ms else 0.0

        return {
            "has_evaluation_data": has_ground_truth_or_preds,
            "total_observations": self.total_observations,
            "total_anomalies_detected": self.total_anomalies_detected,
            "ground_truth_anomalies": self.tp + self.fn,
            "true_positives": self.tp,
            "false_positives": self.fp,
            "true_negatives": self.tn,
            "false_negatives": self.fn,
            "precision": round(precision * 100.0, 2) if has_ground_truth_or_preds else 0.0,
            "recall": round(recall * 100.0, 2) if has_ground_truth_or_preds else 0.0,
            "f1_score": round(f1 * 100.0, 2) if has_ground_truth_or_preds else 0.0,
            "false_positive_rate": round(fpr * 100.0, 3),
            "avg_detection_latency_ms": round(avg_latency, 2),
            "avg_processing_time_ms": round(avg_proc_time, 2)
        }

    def reset(self):
        self.total_observations = 0
        self.total_anomalies_detected = 0
        self.tp = 0
        self.fp = 0
        self.tn = 0
        self.fn = 0
        self.latencies_ms.clear()
        self.processing_times_ms.clear()
