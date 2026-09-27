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

  it('keeps scenarios with missing or empty device names readable instead of invalid', () => {
    const legacy = {
      version: 1,
      activeScenarioId: 's1',
      scenarios: [{
        id: 's1',
        name: '旧方案',
        createdAt: '2025-12-01T00:00:00.000Z',
        pricePerKwh: 0.5,
        daysPerMonth: 30,
        devices: [
          { id: 'd1', watts: 100, dailyHours: 2 },
          { id: 'd2', name: null, watts: 50, dailyHours: 1 },
          { id: 'd3', name: '', watts: 20, dailyHours: 3 },
        ],
      }],
    };
    localStorage.setItem('energy-lens.document.v1', JSON.stringify(legacy));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.activeScenarioId).toBe('s1');
    expect(recovered.scenarios[0].name).toBe('旧方案');
    expect(recovered.scenarios[0].devices).toHaveLength(3);
    expect(recovered.scenarios[0].devices.every((device) => typeof device.name === 'string')).toBe(true);
  });

  it('round-trips a document containing cleared device names', () => {
    const repository = new LocalEnergyRepository();
    const document = {
      version: 1 as const,
      activeScenarioId: exampleScenario.id,
      scenarios: [{ ...exampleScenario, devices: [{ id: 'd1', name: '', watts: 100, dailyHours: 1 }] }],
    };
    repository.save(document);
    const recovered = repository.load();
    expect(recovered.scenarios[0].devices[0].name).toBe('');
    expect(recovered.activeScenarioId).toBe(exampleScenario.id);
  });
});
