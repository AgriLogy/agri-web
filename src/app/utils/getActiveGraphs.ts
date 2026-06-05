// utils/getActiveGraphs.ts
import api from '@/app/lib/api';

export interface ActiveGraphResponse {
  soil_irrigation_status: boolean;
  soil_ph_status: boolean;
  soil_conductivity_status: boolean;
  soil_moisture_status: boolean;
  soil_temperature_status: boolean;
  et0_status: boolean;
  wind_speed_status: boolean;
  wind_direction_status: boolean;
  solar_radiation_status: boolean;
  temperature_humidity_weather_status: boolean;
  precipitation_humidity_rate_status: boolean;
  pluviometry_status: boolean;
  data_table_status: boolean;
  water_flow_status: boolean;
  water_pressure_status: boolean;
  water_ph_status: boolean;
  water_ec_status: boolean;
  leaf_sensor_status: boolean;
  fruit_size_status: boolean;
  large_fruit_diameter_status: boolean;
  npk_status: boolean;
  electricity_consumption_status: boolean;
  wind_radar_status: boolean;
  cumulative_precipitation_status: boolean;
  precipitation_rate_status: boolean;
  weather_temperature_humidity_status: boolean;
  user: number;
  zone: number;
}

const getActiveGraphs = async (
  zoneId: number
): Promise<ActiveGraphResponse | null> => {
  try {
    const response = await api.get(`/zones/${zoneId}/active-graph`);
    return response.data;
  } catch (error) {
    console.error('Error fetching active graphs:', error);
    return null;
  }
};

export default getActiveGraphs;
