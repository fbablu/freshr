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
  id: 'ecoli',
  title: "McDonald's E. coli Outbreak",
  description: 'Oct 2024 - Multi-zone contamination scenario',
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

export const TEMPERATURE_DRIFT_SCENARIO: Scenario = {
  id: 'drift',
  title: 'Temperature Drift',
  description: 'Cold storage failure simulation',
  dateRange: {
    start: '2025-12-25T00:00:00Z',
    end: '2025-12-25T23:59:59Z',
  },
  focusSensors: ['cs-1', 'cs-2', 'cs-3'],
  incidentRules: [
    {
      type: 'temperature_drift',
      sensorTypes: ['cold_storage_temperature'],
      threshold: { positive: 3, consecutive: 3 },
      zones: ['storage'],
      severity: 'critical',
      title: 'Cold Storage Temperature Rising',
      actions: ['CHECK REFRIGERATION UNIT', 'VERIFY DOOR SEALS', 'MOVE PERISHABLES'],
    },
  ],
};

export const HYGIENE_FAILURE_SCENARIO: Scenario = {
  id: 'hygiene',
  title: 'Hygiene Failure',
  description: 'Handwash compliance drops',
  dateRange: {
    start: '2025-12-25T00:00:00Z',
    end: '2025-12-25T23:59:59Z',
  },
  focusSensors: ['hw-1', 'hw-2'],
  incidentRules: [
    {
      type: 'hygiene_failure',
      sensorTypes: ['handwash_station_usage'],
      threshold: { negative: 2 },
      zones: ['prep', 'wash'],
      severity: 'warning',
      title: 'Handwash Compliance Drop',
      actions: ['REMIND STAFF', 'CHECK SOAP/TOWEL SUPPLY', 'RETRAIN IF NEEDED'],
    },
  ],
};

export const RECOVERY_SCENARIO: Scenario = {
  id: 'recovery',
  title: 'Recovery Mode',
  description: 'System recovering from incident',
  dateRange: {
    start: '2025-12-25T00:00:00Z',
    end: '2025-12-25T23:59:59Z',
  },
  focusSensors: ['cs-1', 'hw-1'],
  incidentRules: [],
};

export const NORMAL_SCENARIO: Scenario = {
  id: 'normal',
  title: 'Normal Operations',
  description: 'Healthy baseline state',
  dateRange: {
    start: '2025-12-25T00:00:00Z',
    end: '2025-12-25T23:59:59Z',
  },
  focusSensors: [],
  incidentRules: [],
};

export const SCENARIOS: Scenario[] = [
  MCDONALDS_ECOLI_SCENARIO,
  TEMPERATURE_DRIFT_SCENARIO,
  HYGIENE_FAILURE_SCENARIO,
  RECOVERY_SCENARIO,
  NORMAL_SCENARIO,
];
