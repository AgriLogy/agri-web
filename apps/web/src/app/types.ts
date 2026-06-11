export interface AlertProps {
  alert: {
    name: string;
    type: string;
    condition: string; // For example: "<=", ">", etc.
    value: number; // The threshold value for the alert
    description: string;
    created_at: string; // Date when the alert was created
  };
}

//   export interface Zone {
//   id: number;
//   name: string;
//   space: number;
//   plant_type: string;
//   soil_type: string;
//   kc: number;
//   irrigation_method: string;
//   et0: number;
//   last_irrigation_date: string; // ISO format e.g., '2025-08-15'

//   critical_moisture_threshold: number;

// }

export interface ZoneWrapper {
  id: number;
  user: number;
  zone: ZoneType;
}

export interface NpkSensorData {
  id: number;
  timestamp: string;
  zone: number;
  user: number;
  nitrogen_value: number;
  nitrogen_color: string;
  nitrogen_courbe_name: string;
  phosphorus_value: number;
  phosphorus_color: string;
  phosphorus_courbe_name: string;
  potassium_value: number;
  potassium_color: string;
  potassium_courbe_name: string;
  default_unit: string;
  available_units: string[];
}

export interface WeatherData {
  id: number;
  timestamp: string;
  default_unit: string;
  available_units: string[];
  value: number;
  zone: number;
  user: number;
}

export interface WaterSoilData {
  timestamp: string;
  soilLow?: number;
  soilMedium?: number;
  soilHigh?: number;
  waterFlow?: number;
}

// Zones
export interface ZoneType {
  id: number;
  name: string;
  space: number;
  kc: number;
  soil_type: string;
  critical_moisture_threshold: number;
  plant_type: string;
  irrigation_method: string;
  et0: number;
  last_irrigation_date: string; // ISO format e.g., '2025-08-15'
}

export interface ZoneCardType {
  zone: ZoneType;
  onClick?: () => void;
}

// Shared types for Water/Soil dashboard

export interface SensorEntry {
  id: number;
  timestamp: string; // ISO string
  value: number;
  default_unit: string;
  available_units: string[];
  zone: number;
  user: number;
}

export interface SensorData {
  id: number;
  value: number;
  timestamp: string;
  color?: string;
  courbe_name?: string;
  default_unit: string;
  available_units: string[];
}

// Chart merged row
export interface WaterSoilData {
  timestamp: string;
  soilLow?: number;
  soilMedium?: number;
  soilHigh?: number;
  waterFlow?: number;
}

// Threshold band on one axis
export interface ThresholdBand {
  critical_min: number;
  critical_max: number;
  normal_min: number;
  normal_max: number;
}

// Provide thresholds per axis (left = soil %, right = flow)
export interface Thresholds {
  left?: ThresholdBand;
  right?: ThresholdBand;
}
