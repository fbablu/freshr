// src/app/config/sensor-zone-mapping.ts

export const SENSOR_ZONE_MAP: Record<string, string> = {
  // Cold storage sensors
  'cs-1': 'zone-cold-1',
  'cs-2': 'zone-cold-1',
  'cs-3': 'zone-cold-1',

  // Handwash stations
  'hw-1': 'zone-wash-1',
  'hw-2': 'zone-prep-1',

  // Humidity sensors
  'hum-1': 'zone-prep-1',
  'hum-2': 'zone-cook-1',

  // Time out of range sensors
  'tor-1': 'zone-prep-1',

  // Shift change sensors
  'shift-1': 'zone-recv-1',
};

export const ZONE_SENSOR_TYPES: Record<string, string[]> = {
  'zone-recv-1': ['shift_change'],
  'zone-cold-1': ['cold_storage_temperature'],
  'zone-wash-1': ['handwash_station_usage'],
  'zone-prep-1': ['handwash_station_usage', 'humidity', 'time_out_of_range_duration'],
  'zone-cook-1': ['humidity', 'cook_temp'],
  'zone-plate-1': ['station_contact'],
};

export const ZONE_DISPLAY_NAMES: Record<string, string> = {
  'zone-recv-1': 'Receiving',
  'zone-cold-1': 'Cold Storage',
  'zone-wash-1': 'Washing',
  'zone-prep-1': 'Prep Station',
  'zone-cook-1': 'Cook Line',
  'zone-plate-1': 'Plating',
};

export function getSensorZone(sensorId: string): string | null {
  return SENSOR_ZONE_MAP[sensorId] || null;
}

export function getZoneSensors(zoneId: string): string[] {
  return Object.entries(SENSOR_ZONE_MAP)
    .filter(([_, zone]) => zone === zoneId)
    .map(([sensor]) => sensor);
}
