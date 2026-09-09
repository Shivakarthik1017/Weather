"""
Network of realistic Automatic Weather Stations (AWS) across India.
Carefully mapped with real geographic coordinates, elevations, and meteorological regions.
"""

STATIONS_METADATA = [
    # Northern Region
    {"station_id": "AWS-DEL-01", "name": "New Delhi Safdarjung AWS", "lat": 28.585, "lon": 77.206, "region": "Northern", "elev": 216.0, "base_t": 31.5, "base_p": 1008.0, "base_rh": 55.0},
    {"station_id": "AWS-DEL-02", "name": "Delhi Palam AWS", "lat": 28.563, "lon": 77.119, "region": "Northern", "elev": 224.0, "base_t": 32.0, "base_p": 1007.5, "base_rh": 52.0},
    {"station_id": "AWS-DEL-03", "name": "Noida Sector 62 AWS", "lat": 28.628, "lon": 77.368, "region": "Northern", "elev": 208.0, "base_t": 31.8, "base_p": 1008.5, "base_rh": 56.0},
    {"station_id": "AWS-CHD-01", "name": "Chandigarh Observatory AWS", "lat": 30.733, "lon": 76.779, "region": "Northern", "elev": 321.0, "base_t": 29.2, "base_p": 996.0, "base_rh": 60.0},
    {"station_id": "AWS-JAI-01", "name": "Jaipur Sanganer AWS", "lat": 26.828, "lon": 75.805, "region": "Northern", "elev": 390.0, "base_t": 34.2, "base_p": 988.0, "base_rh": 40.0},
    {"station_id": "AWS-JOD-01", "name": "Jodhpur Thar AWS", "lat": 26.258, "lon": 73.048, "region": "Northern", "elev": 224.0, "base_t": 36.5, "base_p": 1004.0, "base_rh": 35.0},
    {"station_id": "AWS-SXR-01", "name": "Srinagar Valley AWS", "lat": 34.083, "lon": 74.797, "region": "Northern", "elev": 1585.0, "base_t": 19.5, "base_p": 865.0, "base_rh": 65.0},
    {"station_id": "AWS-SML-01", "name": "Shimla Ridge AWS", "lat": 31.104, "lon": 77.173, "region": "Northern", "elev": 2205.0, "base_t": 16.8, "base_p": 810.0, "base_rh": 70.0},
    {"station_id": "AWS-DED-01", "name": "Dehradun Forest AWS", "lat": 30.316, "lon": 78.032, "region": "Northern", "elev": 682.0, "base_t": 26.4, "base_p": 952.0, "base_rh": 68.0},
    {"station_id": "AWS-LKO-01", "name": "Lucknow Amausi AWS", "lat": 26.760, "lon": 80.883, "region": "Northern", "elev": 128.0, "base_t": 32.8, "base_p": 1011.0, "base_rh": 58.0},
    {"station_id": "AWS-VNS-01", "name": "Varanasi Babatpur AWS", "lat": 25.452, "lon": 82.859, "region": "Northern", "elev": 81.0, "base_t": 33.5, "base_p": 1014.0, "base_rh": 62.0},

    # Western Region
    {"station_id": "AWS-BOM-01", "name": "Mumbai Colaba AWS", "lat": 18.906, "lon": 72.814, "region": "Western", "elev": 11.0, "base_t": 30.8, "base_p": 1013.0, "base_rh": 78.0},
    {"station_id": "AWS-BOM-02", "name": "Mumbai Santacruz AWS", "lat": 19.089, "lon": 72.865, "region": "Western", "elev": 14.0, "base_t": 31.2, "base_p": 1012.8, "base_rh": 76.0},
    {"station_id": "AWS-PUN-01", "name": "Pune Shivajinagar AWS", "lat": 18.530, "lon": 73.856, "region": "Western", "elev": 560.0, "base_t": 28.6, "base_p": 966.0, "base_rh": 62.0},
    {"station_id": "AWS-NAG-01", "name": "Nagpur Sonegaon AWS", "lat": 21.092, "lon": 79.058, "region": "Western", "elev": 310.0, "base_t": 34.0, "base_p": 995.0, "base_rh": 50.0},
    {"station_id": "AWS-AMD-01", "name": "Ahmedabad Airport AWS", "lat": 23.073, "lon": 72.634, "region": "Western", "elev": 55.0, "base_t": 34.8, "base_p": 1010.0, "base_rh": 48.0},
    {"station_id": "AWS-SRT-01", "name": "Surat Coastal AWS", "lat": 21.170, "lon": 72.831, "region": "Western", "elev": 13.0, "base_t": 32.4, "base_p": 1012.5, "base_rh": 72.0},
    {"station_id": "AWS-GOA-01", "name": "Panaji Marine AWS", "lat": 15.498, "lon": 73.827, "region": "Western", "elev": 15.0, "base_t": 29.8, "base_p": 1012.0, "base_rh": 82.0},

    # Southern Region
    {"station_id": "AWS-BLR-01", "name": "Bengaluru HAL AWS", "lat": 12.956, "lon": 77.668, "region": "Southern", "elev": 888.0, "base_t": 26.5, "base_p": 932.0, "base_rh": 66.0},
    {"station_id": "AWS-BLR-02", "name": "Bengaluru GKVK AWS", "lat": 13.078, "lon": 77.581, "region": "Southern", "elev": 920.0, "base_t": 26.2, "base_p": 930.0, "base_rh": 68.0},
    {"station_id": "AWS-MAA-01", "name": "Chennai Meenambakkam AWS", "lat": 12.994, "lon": 80.180, "region": "Southern", "elev": 16.0, "base_t": 33.2, "base_p": 1011.0, "base_rh": 74.0},
    {"station_id": "AWS-MAA-02", "name": "Chennai Nungambakkam AWS", "lat": 13.067, "lon": 80.237, "region": "Southern", "elev": 8.0, "base_t": 33.0, "base_p": 1012.0, "base_rh": 76.0},
    {"station_id": "AWS-HYD-01", "name": "Hyderabad Begumpet AWS", "lat": 17.447, "lon": 78.468, "region": "Southern", "elev": 535.0, "base_t": 31.4, "base_p": 968.0, "base_rh": 58.0},
    {"station_id": "AWS-HYD-02", "name": "Hyderabad Shamshabad AWS", "lat": 17.240, "lon": 78.429, "region": "Southern", "elev": 617.0, "base_t": 30.8, "base_p": 960.0, "base_rh": 60.0},
    {"station_id": "AWS-TRV-01", "name": "Thiruvananthapuram AWS", "lat": 8.507, "lon": 76.955, "region": "Southern", "elev": 64.0, "base_t": 29.5, "base_p": 1010.0, "base_rh": 84.0},
    {"station_id": "AWS-COK-01", "name": "Kochi Port AWS", "lat": 9.931, "lon": 76.267, "region": "Southern", "elev": 4.0, "base_t": 30.1, "base_p": 1012.0, "base_rh": 85.0},
    {"station_id": "AWS-CCJ-01", "name": "Kozhikode Coastal AWS", "lat": 11.258, "lon": 75.780, "region": "Southern", "elev": 5.0, "base_t": 30.4, "base_p": 1011.5, "base_rh": 82.0},
    {"station_id": "AWS-CJB-01", "name": "Coimbatore Peelamedu AWS", "lat": 11.029, "lon": 77.043, "region": "Southern", "elev": 427.0, "base_t": 29.0, "base_p": 978.0, "base_rh": 65.0},
    {"station_id": "AWS-IXM-01", "name": "Madurai Airport AWS", "lat": 9.834, "lon": 78.093, "region": "Southern", "elev": 136.0, "base_t": 34.0, "base_p": 1008.0, "base_rh": 60.0},
    {"station_id": "AWS-VTZ-01", "name": "Visakhapatnam Waltair AWS", "lat": 17.729, "lon": 83.333, "region": "Southern", "elev": 45.0, "base_t": 31.8, "base_p": 1010.5, "base_rh": 79.0},

    # Eastern Region
    {"station_id": "AWS-CCU-01", "name": "Kolkata Alipore AWS", "lat": 22.533, "lon": 88.333, "region": "Eastern", "elev": 6.0, "base_t": 32.5, "base_p": 1012.0, "base_rh": 78.0},
    {"station_id": "AWS-CCU-02", "name": "Kolkata Dumdum AWS", "lat": 22.654, "lon": 88.446, "region": "Eastern", "elev": 5.0, "base_t": 32.8, "base_p": 1012.2, "base_rh": 76.0},
    {"station_id": "AWS-PAT-01", "name": "Patna Airport AWS", "lat": 25.591, "lon": 85.088, "region": "Eastern", "elev": 52.0, "base_t": 33.1, "base_p": 1012.5, "base_rh": 66.0},
    {"station_id": "AWS-BBI-01", "name": "Bhubaneswar Regional AWS", "lat": 20.250, "lon": 85.816, "region": "Eastern", "elev": 46.0, "base_t": 33.6, "base_p": 1010.0, "base_rh": 74.0},
    {"station_id": "AWS-IXR-01", "name": "Ranchi Hinoo AWS", "lat": 23.314, "lon": 85.321, "region": "Eastern", "elev": 652.0, "base_t": 28.5, "base_p": 955.0, "base_rh": 64.0},
    {"station_id": "AWS-GAU-01", "name": "Guwahati Borjhar AWS", "lat": 26.106, "lon": 91.585, "region": "Eastern", "elev": 54.0, "base_t": 29.8, "base_p": 1010.0, "base_rh": 80.0},
    {"station_id": "AWS-SHL-01", "name": "Shillong Peak AWS", "lat": 25.578, "lon": 91.893, "region": "Eastern", "elev": 1525.0, "base_t": 20.2, "base_p": 868.0, "base_rh": 82.0},

    # Central Region
    {"station_id": "AWS-BHO-01", "name": "Bhopal Bairagarh AWS", "lat": 23.287, "lon": 77.355, "region": "Central", "elev": 523.0, "base_t": 32.2, "base_p": 970.0, "base_rh": 52.0},
    {"station_id": "AWS-IDR-01", "name": "Indore Devi Ahilya AWS", "lat": 22.721, "lon": 75.801, "region": "Central", "elev": 567.0, "base_t": 31.8, "base_p": 965.0, "base_rh": 50.0},
    {"station_id": "AWS-RPR-01", "name": "Raipur Mana AWS", "lat": 21.180, "lon": 81.738, "region": "Central", "elev": 317.0, "base_t": 33.4, "base_p": 994.0, "base_rh": 60.0},
    {"station_id": "AWS-JBP-01", "name": "Jabalpur Dumna AWS", "lat": 23.178, "lon": 80.052, "region": "Central", "elev": 495.0, "base_t": 32.0, "base_p": 973.0, "base_rh": 54.0}
]
