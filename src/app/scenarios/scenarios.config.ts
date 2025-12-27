// src/app/scenarios/scenarios.config.ts

export interface IncidentRule {
  type: string;
  sensorTypes: string[];
  threshold: { positive?: number; negative?: number; consecutive?: number };
  zones: string[];
  severity: 'critical' | 'warning' | 'info';
  title: string;
  actions: string[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  dateRange: { start: string; end: string };
  focusSensors: string[];
  incidentRules: IncidentRule[];
}

export const MCDONALDS_ECOLI_SCENARIO: Scenario = {
  id: 'mcdonalds-ecoli-2024',
  title: "E. coli Outbreak - McDonald's Onions (Oct 2024)",
  description: '104 cases, 34 hospitalizations, 1 death across 14 states',
  dateRange: {
    start: '2025-12-25T00:00:00Z',
    end: '2025-12-25T23:59:59Z',
  },
  focusSensors: ['cs-1', 'cs-2', 'cs-3', 'hw-1', 'hw-2', 'tor-1'],
  incidentRules: [
    {
      type: 'temperature_drift',
      sensorTypes: ['cold_storage_temperature'],
      threshold: { positive: 2, consecutive: 2 },
      zones: ['storage'],
      severity: 'critical',
      title: 'Cold Storage Temperature Drift - Onion Storage',
      actions: [
        'HOLD AFFECTED PRODUCE',
        'VERIFY ALL TEMPS <5°C',
        'INSPECT ONION BATCHES',
        'QUARANTINE LOT #2024-OCT-22',
      ],
    },
    {
      type: 'hygiene_failure',
      sensorTypes: ['handwash_station_usage'],
      threshold: { negative: 1 },
      zones: ['washing', 'assembly'],
      severity: 'critical',
      title: 'Handwash Compliance Violation',
      actions: ['MANDATORY HANDWASH', 'RETRAIN STAFF', 'SANITIZE WORKSTATION'],
    },
  ],
};

export const SCENARIOS = [MCDONALDS_ECOLI_SCENARIO];
