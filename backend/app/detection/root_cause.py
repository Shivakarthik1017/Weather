from typing import Dict, Any, List, Tuple

class RootCauseClassifier:
    def classify(
        self,
        classification: str,
        quality_status: str,
        is_frozen: bool,
        is_drift: bool,
        spatial_classification: str,
        physical_score: float,
        temporal_score: float,
        multivariate_score: float,
        features: Dict[str, Any],
        observation: Dict[str, Any]
    ) -> Tuple[str, str, str]:
        """
        Returns:
            root_cause (str),
            recommended_action (str),
            summary_explanation (str)
        """
        t = observation.get("temperature_c")
        p = observation.get("pressure_hpa")
        rh = observation.get("relative_humidity")

        # 1. Communication & Quality
        if quality_status == "COMM_FAILURE":
            return (
                "Communication failure",
                "Check remote telemetry terminal (RTT), GPRS/cellular modem antenna, and battery voltage.",
                "Telemetry transmission ceased completely. AWS failed to handshake or stream packets across scheduled intervals."
            )

        if quality_status == "DATA_CORRUPTION":
            return (
                "Data corruption",
                "Inspect datalogger serial ADC converter and firmware buffer integrity.",
                "Non-numerical, NaN, or buffer overrun symbols detected in raw observation frame."
            )

        if quality_status == "MISSING_DATA":
            return (
                "Missing data",
                "Verify sensor wiring harness and transducer bus connectors.",
                "One or more physical sensor channels dropped while carrier connection remained open."
            )

        # 2. Frozen Sensor
        if is_frozen or classification == "FROZEN SENSOR":
            return (
                "Frozen sensor",
                "Inspect sensor head for mechanical blockage, ice accretion, or ADC circuit lockup.",
                "Station reported consecutive unvarying values across multiple consecutive logging cycles with absolute zero standard deviation."
            )

        # 3. Sensor Drift
        if is_drift or classification == "SENSOR DRIFT":
            return (
                "Sensor drift",
                "Perform laboratory secondary calibration or field recalibration against reference psychrometer.",
                "Systematic baseline drift detected over time with preserved short-term variance, characteristic of aging semiconductor or RTD degradation."
            )

        # 4. Genuine Weather Event
        if classification == "GENUINE WEATHER EVENT" or spatial_classification == "GENUINE_WEATHER_EVENT":
            return (
                "Genuine weather event",
                "No hardware maintenance required; record synoptic meteorological event in regional weather log.",
                "Multiple adjacent AWS nodes in the mesoscale cluster exhibited concurrent, mutually correlated atmospheric state transitions."
            )

        # 5. Sensor Faults by Parameter Dominance
        delta_t = abs(features.get("delta_t", 0.0))
        delta_p = abs(features.get("delta_p", 0.0))
        delta_rh = abs(features.get("delta_rh", 0.0))
        z_t = abs(features.get("z_t", 0.0))
        z_p = abs(features.get("z_p", 0.0))
        z_rh = abs(features.get("z_rh", 0.0))

        # Check which parameter exhibits the most unphysical anomaly
        if z_p > 3.5 or delta_p > 15.0:
            return (
                "Pressure sensor fault",
                "Inspect barometric port, desiccated filter tube, and piezoresistive transducer.",
                "Atmospheric pressure reading exhibited abrupt unphysical step or range departure while ambient temperature and humidity remained stable."
            )

        if z_rh > 3.5 or delta_rh > 30.0 or (rh is not None and (rh > 100.0 or rh < 2.0)):
            return (
                "Humidity sensor fault",
                "Clean hygrometer capacitive polymer element or replace sensor filter cap.",
                "Relative humidity sensor pegged at extreme or underwent implausible moisture shift inconsistent with psychrometric temperature state."
            )

        if multivariate_score > 50.0 and physical_score < 30.0:
            return (
                "Multivariate inconsistency",
                "Cross-calibrate both temperature and relative humidity probes simultaneously.",
                "Individual channels lie near marginal bounds, but their co-occurrence produces an impossible thermodynamic state."
            )

        # Default to Temperature sensor fault if temperature is dominant or general isolated fault
        return (
            "Temperature sensor fault",
            "Inspect platinum RTD/thermistor shield, aspirator fan, and cable grounding.",
            "Observation exhibits significant isolated departure from station historical baseline and surrounding network stations."
        )
