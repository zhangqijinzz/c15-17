import type { EnergyDevice, EnergyDocument, EnergyScenario } from '../types';

const STORAGE_KEY = 'energy-lens.document.v1';

export function readDocument(): EnergyDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDocument(document: EnergyDocument): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
}

function normalizeDocument(value: unknown): EnergyDocument | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<EnergyDocument>;
  if (candidate.version !== 1 || typeof candidate.activeScenarioId !== 'string' || !Array.isArray(candidate.scenarios)) return null;
  const scenarios = candidate.scenarios.map(normalizeScenario);
  if (scenarios.length === 0 || scenarios.some((scenario) => scenario === null)) return null;
  const valid = scenarios as EnergyScenario[];
  if (!valid.some((scenario) => scenario.id === candidate.activeScenarioId)) return null;
  return { version: 1, scenarios: valid, activeScenarioId: candidate.activeScenarioId };
}

function normalizeScenario(value: unknown): EnergyScenario | null {
  if (!value || typeof value !== 'object') return null;
  const scenario = value as Partial<EnergyScenario>;
  if (typeof scenario.id !== 'string'
    || typeof scenario.name !== 'string'
    || typeof scenario.createdAt !== 'string'
    || typeof scenario.pricePerKwh !== 'number'
    || scenario.pricePerKwh < 0
    || typeof scenario.daysPerMonth !== 'number'
    || scenario.daysPerMonth < 1
    || scenario.daysPerMonth > 31
    || !Array.isArray(scenario.devices)
    || scenario.devices.length === 0) return null;
  const devices = scenario.devices.map(normalizeDevice);
  if (devices.some((device) => device === null)) return null;
  return {
    id: scenario.id,
    name: scenario.name,
    createdAt: scenario.createdAt,
    pricePerKwh: scenario.pricePerKwh,
    daysPerMonth: scenario.daysPerMonth,
    devices: devices as EnergyDevice[],
  };
}

function normalizeDevice(value: unknown): EnergyDevice | null {
  if (!value || typeof value !== 'object') return null;
  const device = value as Partial<EnergyDevice>;
  if (typeof device.id !== 'string'
    || typeof device.watts !== 'number'
    || device.watts < 0
    || typeof device.dailyHours !== 'number'
    || device.dailyHours < 0
    || device.dailyHours > 24) return null;
  // 历史数据里可能缺失名称或名称不是字符串，修复为空串，由展示层兜底成可识别的名字
  const name = typeof device.name === 'string' ? device.name : '';
  return { id: device.id, name, watts: device.watts, dailyHours: device.dailyHours };
}
