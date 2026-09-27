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

  it('accepts an empty device name so clearing the field stays savable', () => {
    expect(validateDevice({ name: '', watts: 100, dailyHours: 1 })).toBeNull();
    expect(validateDevice({ name: '   ', watts: 100, dailyHours: 1 })).toBeNull();
  });

  it('generates default device names that never collide with existing ones', () => {
    expect(nextDeviceName([])).toBe('新设备');
    expect(nextDeviceName([{ name: '新设备' }])).toBe('新设备 2');
    expect(nextDeviceName([{ name: '新设备' }, { name: '新设备 2' }])).toBe('新设备 3');
    expect(nextDeviceName([{ name: '新设备 2' }])).toBe('新设备');
    expect(nextDeviceName([{ name: ' 新设备 ' }])).toBe('新设备 2');
  });

  it('resolves unique, non-empty display names for duplicate and missing names', () => {
    const resolved = resolveDeviceDisplayNames([
      { id: 'a', name: '新设备' },
      { id: 'b', name: '新设备' },
      { id: 'c', name: '' },
      { id: 'd', name: '   ' },
      { id: 'e', name: '冰箱' },
    ]);
    expect(resolved.get('a')).toBe('新设备');
    expect(resolved.get('b')).toBe('新设备 2');
    expect(resolved.get('c')).toBe('未命名设备 3');
    expect(resolved.get('d')).toBe('未命名设备 4');
    expect(resolved.get('e')).toBe('冰箱');
    expect(new Set(resolved.values()).size).toBe(5);
    [...resolved.values()].forEach((name) => expect(name.trim()).not.toBe(''));
  });

  it('attaches unique non-empty display names in the scenario summary', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: '新设备', watts: 100, dailyHours: 1 },
      { id: 'b', name: '新设备', watts: 200, dailyHours: 1 },
      { id: 'c', name: '', watts: 50, dailyHours: 1 },
    ] };
    const summary = summarizeScenario(scenario);
    expect(summary.devices.map((device) => device.displayName)).toEqual(['新设备', '新设备 2', '未命名设备 3']);
  });
});
