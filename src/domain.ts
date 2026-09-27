import type { EnergyDevice, EnergyEstimate, EnergyScenario, ScenarioSummary } from './types';

export const MAX_DAILY_HOURS = 24;
export const DEFAULT_DEVICE_NAME = '新设备';
export const FALLBACK_DEVICE_NAME = '未命名设备';

export const exampleScenario: EnergyScenario = {
  id: 'scenario-home',
  name: '夏日居家方案',
  pricePerKwh: 0.62,
  daysPerMonth: 30,
  createdAt: '2026-01-01T00:00:00.000Z',
  devices: [
    { id: 'device-aircon', name: '客厅空调', watts: 1200, dailyHours: 6 },
    { id: 'device-fridge', name: '冰箱', watts: 150, dailyHours: 10 },
    { id: 'device-lamp', name: '书桌台灯', watts: 12, dailyHours: 5 },
  ],
};

export function estimateDevice(device: EnergyDevice, daysPerMonth: number, pricePerKwh: number): EnergyEstimate {
  const dailyKwh = (device.watts * device.dailyHours) / 1000;
  const monthlyKwh = dailyKwh * daysPerMonth;
  return { dailyKwh, monthlyKwh, monthlyCost: monthlyKwh * pricePerKwh };
}

export function summarizeScenario(scenario: EnergyScenario): ScenarioSummary {
  const displayNames = resolveDeviceDisplayNames(scenario.devices);
  const devices = scenario.devices.map((device) => ({
    ...device,
    ...estimateDevice(device, scenario.daysPerMonth, scenario.pricePerKwh),
    share: 0,
    displayName: displayNames.get(device.id) ?? (device.name.trim() || FALLBACK_DEVICE_NAME),
  }));
  const total = devices.reduce(
    (sum, device) => ({
      dailyKwh: sum.dailyKwh + device.dailyKwh,
      monthlyKwh: sum.monthlyKwh + device.monthlyKwh,
      monthlyCost: sum.monthlyCost + device.monthlyCost,
    }),
    { dailyKwh: 0, monthlyKwh: 0, monthlyCost: 0 },
  );
  return {
    total,
    devices: devices.map((device) => ({ ...device, share: total.monthlyKwh ? device.monthlyKwh / total.monthlyKwh : 0 })),
  };
}

export function validateDevice(device: Pick<EnergyDevice, 'name' | 'watts' | 'dailyHours'>): string | null {
  // 名称允许为空：空名设备在展示层会回退为“未命名设备 N”，保存的数据依然合法
  if (!Number.isFinite(device.watts) || device.watts < 0) return '功率不能为负数';
  if (!Number.isFinite(device.dailyHours) || device.dailyHours < 0) return '使用时间不能为负数';
  if (device.dailyHours > MAX_DAILY_HOURS) return '每日使用时间不能超过 24 小时';
  return null;
}

/**
 * 为新建设备生成不与现有设备撞名的默认名称：
 * 新设备 → 新设备 2 → 新设备 3 …
 */
export function nextDeviceName(existing: ReadonlyArray<Pick<EnergyDevice, 'name'>>, baseName = DEFAULT_DEVICE_NAME): string {
  const taken = new Set(existing.map((device) => device.name.trim()));
  if (!taken.has(baseName)) return baseName;
  let suffix = 2;
  while (taken.has(`${baseName} ${suffix}`)) suffix += 1;
  return `${baseName} ${suffix}`;
}

/**
 * 为每台设备解析出唯一且非空的展示名（按设备 id 返回）：
 * - 空名/纯空白名回退为“未命名设备 N”（N 为设备在列表中的位置，从 1 开始）；
 * - 重名时按出现顺序追加“ 2”“ 3”…后缀，保证占比图、洞察和操作都能落到具体某一台。
 */
export function resolveDeviceDisplayNames(devices: ReadonlyArray<Pick<EnergyDevice, 'id' | 'name'>>): Map<string, string> {
  const taken = new Set<string>();
  const resolved = new Map<string, string>();
  devices.forEach((device, index) => {
    const base = device.name.trim() || `${FALLBACK_DEVICE_NAME} ${index + 1}`;
    let candidate = base;
    let suffix = 2;
    while (taken.has(candidate)) {
      candidate = `${base} ${suffix}`;
      suffix += 1;
    }
    taken.add(candidate);
    resolved.set(device.id, candidate);
  });
  return resolved;
}

export function validateScenarioSettings(pricePerKwh: number, daysPerMonth: number): string | null {
  if (!Number.isFinite(pricePerKwh) || pricePerKwh < 0) return '电价不能为负数';
  if (!Number.isFinite(daysPerMonth) || daysPerMonth < 1 || daysPerMonth > 31) return '计费天数需在 1–31 天之间';
  return null;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function cloneScenario(source: EnergyScenario, id: string, name: string): EnergyScenario {
  return { ...source, id, name, createdAt: new Date().toISOString(), devices: source.devices.map((device) => ({ ...device, id: `${id}-${device.id}` })) };
}
