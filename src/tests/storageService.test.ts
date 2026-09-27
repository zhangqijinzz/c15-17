// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { exampleScenario } from '../domain';
import { LocalEnergyRepository } from '../repository';

describe('local persistence recovery', () => {
  beforeEach(() => localStorage.clear());

  it('falls back to a valid example when saved JSON is damaged', () => {
    localStorage.setItem('energy-lens.document.v1', JSON.stringify({ version: 1, scenarios: [null], activeScenarioId: 'missing' }));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.activeScenarioId).toBe(exampleScenario.id);
    expect(recovered.scenarios[0].devices.length).toBeGreaterThan(0);
  });

  it('loads scenarios with empty or duplicate device names instead of rejecting them', () => {
    localStorage.setItem('energy-lens.document.v1', JSON.stringify({
      version: 1,
      activeScenarioId: 's1',
      scenarios: [{
        id: 's1', name: '老方案', createdAt: '2026-01-01T00:00:00.000Z', pricePerKwh: 0.6, daysPerMonth: 30,
        devices: [
          { id: 'd1', name: '', watts: 100, dailyHours: 2 },
          { id: 'd2', name: '空调', watts: 800, dailyHours: 4 },
          { id: 'd3', name: '空调', watts: 900, dailyHours: 3 },
        ],
      }],
    }));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.activeScenarioId).toBe('s1');
    expect(recovered.scenarios[0].devices.map((device) => device.id)).toEqual(['d1', 'd2', 'd3']);
  });

  it('repairs a device whose name field is missing instead of discarding the plan', () => {
    localStorage.setItem('energy-lens.document.v1', JSON.stringify({
      version: 1,
      activeScenarioId: 's1',
      scenarios: [{
        id: 's1', name: '老方案', createdAt: '2026-01-01T00:00:00.000Z', pricePerKwh: 0.6, daysPerMonth: 30,
        devices: [{ id: 'd1', watts: 100, dailyHours: 2 }],
      }],
    }));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.scenarios[0].id).toBe('s1');
    expect(recovered.scenarios[0].devices[0].name).toBe('');
  });
});
