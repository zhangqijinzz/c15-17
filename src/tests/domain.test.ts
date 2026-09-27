import { describe, expect, it } from 'vitest';
import { estimateDevice, nextDeviceName, resolveDeviceDisplayNames, summarizeScenario, validateDevice } from '../domain';
import type { EnergyScenario } from '../types';

describe('energy domain', () => {
  it('calculates kWh and cost from watts, hours, days and price', () => {
    const result = estimateDevice({ id: 'a', name: '空调', watts: 1000, dailyHours: 2 }, 30, 0.5);
    expect(result).toEqual({ dailyKwh: 2, monthlyKwh: 60, monthlyCost: 30 });
  });

  it('keeps device shares explainable and sums to 100%', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 }, { id: 'b', name: 'b', watts: 300, dailyHours: 1 },
    ] };
    const summary = summarizeScenario(scenario);
    expect(summary.total.monthlyKwh).toBe(12);
    expect(summary.devices.map((device) => device.share)).toEqual([0.25, 0.75]);
  });

  it('rejects negative power and more than 24 hours', () => {
    expect(validateDevice({ name: 'x', watts: -1, dailyHours: 1 })).toBe('功率不能为负数');
    expect(validateDevice({ name: 'x', watts: 1, dailyHours: 24.1 })).toBe('每日使用时间不能超过 24 小时');
  });

  it('generates default device names that do not collide with existing ones', () => {
    expect(nextDeviceName([])).toBe('新设备');
    expect(nextDeviceName([{ name: '新设备' }])).toBe('新设备 2');
    expect(nextDeviceName([{ name: '新设备' }, { name: '新设备 2' }])).toBe('新设备 3');
    expect(nextDeviceName([{ name: '新设备' }, { name: '新设备 3' }])).toBe('新设备 2');
  });

  it('resolves display names so duplicate or empty names stay distinguishable', () => {
    const names = resolveDeviceDisplayNames([
      { id: 'a', name: '空调' },
      { id: 'b', name: '空调 2' },
      { id: 'c', name: '空调' },
      { id: 'd', name: '' },
      { id: 'e', name: '   ' },
    ]);
    expect(names.get('a')).toBe('空调');
    expect(names.get('b')).toBe('空调 2');
    expect(names.get('c')).toBe('空调 3');
    expect(names.get('d')).toBe('未命名设备');
    expect(names.get('e')).toBe('未命名设备 2');
    expect(new Set(names.values()).size).toBe(5);
  });
});
