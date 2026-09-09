import { StationMetadata } from '../types';

export const AWS_STATIONS: StationMetadata[] = [
  {
    id: 'aws-del-01',
    name: 'New Delhi Safdarjung AWS',
    code: 'VIDD',
    region: 'Northern',
    lat: 28.585,
    lng: 77.206,
    elevation: 216,
    installedYear: 2018,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 31.5,
    basePressure: 1004.2,
    baseHumidity: 52
  },
  {
    id: 'aws-del-02',
    name: 'Delhi Palam Observatory AWS',
    code: 'VIDP',
    region: 'Northern',
    lat: 28.566,
    lng: 77.103,
    elevation: 237,
    installedYear: 2019,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 32.0,
    basePressure: 1002.5,
    baseHumidity: 50
  },
  {
    id: 'aws-del-03',
    name: 'Noida Sector 62 Sub-AWS',
    code: 'VIND',
    region: 'Northern',
    lat: 28.625,
    lng: 77.368,
    elevation: 205,
    installedYear: 2021,
    sensorModel: {
      temp: 'Rotronic HC2A-S3 RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HygroMer IN-1 Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 31.8,
    basePressure: 1005.1,
    baseHumidity: 53
  },
  {
    id: 'aws-mum-01',
    name: 'Mumbai Colaba Coastal AWS',
    code: 'VABB-C',
    region: 'Western',
    lat: 18.898,
    lng: 72.815,
    elevation: 11,
    installedYear: 2017,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Marine Spec',
      humidity: 'HUMICAP 180R Marine Coated',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 29.5,
    basePressure: 1011.8,
    baseHumidity: 78
  },
  {
    id: 'aws-mum-02',
    name: 'Mumbai Santacruz AWS',
    code: 'VABB',
    region: 'Western',
    lat: 19.088,
    lng: 72.867,
    elevation: 14,
    installedYear: 2019,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 30.2,
    basePressure: 1011.2,
    baseHumidity: 75
  },
  {
    id: 'aws-pun-01',
    name: 'Pune Shivajinagar AWS',
    code: 'VAPO',
    region: 'Western',
    lat: 18.531,
    lng: 73.855,
    elevation: 559,
    installedYear: 2020,
    sensorModel: {
      temp: 'Campbell Scientific CS215',
      pressure: 'CS106 Barometric Sensor',
      humidity: 'Sensirion SHT75 Capacitive',
      telemetry: 'Cellular LTE Cat-M1'
    },
    baseTemp: 27.8,
    basePressure: 955.4,
    baseHumidity: 62
  },
  {
    id: 'aws-blr-01',
    name: 'Bengaluru HAL Observatory AWS',
    code: 'VOBG',
    region: 'Southern',
    lat: 12.950,
    lng: 77.668,
    elevation: 914,
    installedYear: 2019,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 25.4,
    basePressure: 918.0,
    baseHumidity: 66
  },
  {
    id: 'aws-blr-02',
    name: 'Bengaluru Kempegowda Intl AWS',
    code: 'VOBL',
    region: 'Southern',
    lat: 13.198,
    lng: 77.706,
    elevation: 915,
    installedYear: 2021,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Tri-Transducer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 25.0,
    basePressure: 917.6,
    baseHumidity: 65
  },
  {
    id: 'aws-maa-01',
    name: 'Chennai Meenambakkam AWS',
    code: 'VOMM',
    region: 'Southern',
    lat: 12.994,
    lng: 80.180,
    elevation: 16,
    installedYear: 2018,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Marine Coated',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 32.6,
    basePressure: 1010.5,
    baseHumidity: 74
  },
  {
    id: 'aws-hyd-01',
    name: 'Hyderabad Begumpet AWS',
    code: 'VOHY',
    region: 'Southern',
    lat: 17.453,
    lng: 78.467,
    elevation: 531,
    installedYear: 2020,
    sensorModel: {
      temp: 'Rotronic HC2A-S3 RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HygroMer IN-1 Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 29.8,
    basePressure: 958.2,
    baseHumidity: 58
  },
  {
    id: 'aws-ccu-01',
    name: 'Kolkata Alipore AWS',
    code: 'VECC-A',
    region: 'Eastern',
    lat: 22.533,
    lng: 88.324,
    elevation: 6,
    installedYear: 2017,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 31.2,
    basePressure: 1012.0,
    baseHumidity: 79
  },
  {
    id: 'aws-ccu-02',
    name: 'Kolkata Dum Dum Intl AWS',
    code: 'VECC',
    region: 'Eastern',
    lat: 22.654,
    lng: 88.446,
    elevation: 5,
    installedYear: 2020,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 31.4,
    basePressure: 1012.3,
    baseHumidity: 77
  },
  {
    id: 'aws-ahd-01',
    name: 'Ahmedabad Sardar Patel AWS',
    code: 'VAAH',
    region: 'Western',
    lat: 23.073,
    lng: 72.634,
    elevation: 55,
    installedYear: 2019,
    sensorModel: {
      temp: 'Campbell Scientific CS215',
      pressure: 'CS106 Barometric Sensor',
      humidity: 'Sensirion SHT75 Capacitive',
      telemetry: 'Cellular LTE Cat-M1'
    },
    baseTemp: 33.5,
    basePressure: 1007.4,
    baseHumidity: 45
  },
  {
    id: 'aws-jai-01',
    name: 'Jaipur Sanganer AWS',
    code: 'VIJP',
    region: 'Northern',
    lat: 26.824,
    lng: 75.812,
    elevation: 385,
    installedYear: 2020,
    sensorModel: {
      temp: 'Rotronic HC2A-S3 RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HygroMer IN-1 Capacitive',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 34.1,
    basePressure: 972.1,
    baseHumidity: 41
  },
  {
    id: 'aws-luc-01',
    name: 'Lucknow Amausi AWS',
    code: 'VILK',
    region: 'Central',
    lat: 26.760,
    lng: 80.883,
    elevation: 128,
    installedYear: 2019,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 32.1,
    basePressure: 1000.8,
    baseHumidity: 58
  },
  {
    id: 'aws-bho-01',
    name: 'Bhopal Raja Bhoj AWS',
    code: 'VABP',
    region: 'Central',
    lat: 23.287,
    lng: 77.337,
    elevation: 524,
    installedYear: 2018,
    sensorModel: {
      temp: 'Campbell Scientific CS215',
      pressure: 'CS106 Barometric Sensor',
      humidity: 'Sensirion SHT75 Capacitive',
      telemetry: 'Cellular LTE Cat-M1'
    },
    baseTemp: 30.5,
    basePressure: 957.3,
    baseHumidity: 54
  },
  {
    id: 'aws-nag-01',
    name: 'Nagpur Sonegaon AWS',
    code: 'VANP',
    region: 'Central',
    lat: 21.092,
    lng: 79.058,
    elevation: 310,
    installedYear: 2018,
    sensorModel: {
      temp: 'Rotronic HC2A-S3 RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HygroMer IN-1 Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 33.0,
    basePressure: 981.0,
    baseHumidity: 51
  },
  {
    id: 'aws-pat-01',
    name: 'Patna Lok Nayak AWS',
    code: 'VEPT',
    region: 'Eastern',
    lat: 25.591,
    lng: 85.088,
    elevation: 52,
    installedYear: 2021,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 32.4,
    basePressure: 1007.8,
    baseHumidity: 63
  },
  {
    id: 'aws-bhu-01',
    name: 'Bhubaneswar Biju Patnaik AWS',
    code: 'VEBS',
    region: 'Eastern',
    lat: 20.244,
    lng: 85.817,
    elevation: 46,
    installedYear: 2020,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HUMICAP 180R Marine Coated',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 31.8,
    basePressure: 1008.2,
    baseHumidity: 73
  },
  {
    id: 'aws-coi-01',
    name: 'Kochi Cochin Naval AWS',
    code: 'VOCI',
    region: 'Southern',
    lat: 9.931,
    lng: 76.267,
    elevation: 4,
    installedYear: 2019,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Marine Spec',
      humidity: 'HUMICAP 180R Marine Coated',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 29.2,
    basePressure: 1012.8,
    baseHumidity: 84
  },
  {
    id: 'aws-goa-01',
    name: 'Goa Dabolim AWS',
    code: 'VAGO',
    region: 'Western',
    lat: 15.380,
    lng: 73.831,
    elevation: 56,
    installedYear: 2018,
    sensorModel: {
      temp: 'Rotronic HC2A-S3 RTD',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HygroMer IN-1 Capacitive',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 29.8,
    basePressure: 1007.1,
    baseHumidity: 81
  },
  {
    id: 'aws-gau-01',
    name: 'Guwahati Borjhar AWS',
    code: 'VEGT',
    region: 'Northeastern',
    lat: 26.106,
    lng: 91.585,
    elevation: 49,
    installedYear: 2020,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Capacitive',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 28.5,
    basePressure: 1007.9,
    baseHumidity: 82
  },
  {
    id: 'aws-shi-01',
    name: 'Shimla High-Altitude AWS',
    code: 'VISM',
    region: 'Northern',
    lat: 31.104,
    lng: 77.173,
    elevation: 2205,
    installedYear: 2021,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD Heated',
      pressure: 'Vaisala PTB330 Digital Barometer',
      humidity: 'HUMICAP 180R Heated Probe',
      telemetry: 'Quectel EC25-E LTE'
    },
    baseTemp: 18.2,
    basePressure: 785.4,
    baseHumidity: 68
  },
  {
    id: 'aws-sri-01',
    name: 'Srinagar Sheikh ul-Alam AWS',
    code: 'VISR',
    region: 'Northern',
    lat: 34.000,
    lng: 74.774,
    elevation: 1656,
    installedYear: 2021,
    sensorModel: {
      temp: 'Vaisala HMP155 Platinum RTD Heated',
      pressure: 'Setra Model 278 Piezoresistive',
      humidity: 'HUMICAP 180R Heated Probe',
      telemetry: 'Sierra Wireless 4G/GPRS'
    },
    baseTemp: 21.4,
    basePressure: 835.0,
    baseHumidity: 59
  }
];

export const REGIONS = ['All', 'Northern', 'Western', 'Southern', 'Eastern', 'Central', 'Northeastern'] as const;
