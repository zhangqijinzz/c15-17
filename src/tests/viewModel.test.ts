import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exampleScenario } from '../domain';
import type { EnergyDocument } from '../types';
import { EnergyLensViewModel } from '../viewModel';
import type { EnergyRepository } from '../repository';

function makeRepository(): EnergyRepository & { data: EnergyDocument; save: ReturnType<typeof vi.fn> } {
  const data: EnergyDocument = { version: 1, scenarios: [structuredClone(exampleScenario)], activeScenarioId: exampleScenario.id };
  return { data, load: () => data, save: vi.fn((next: EnergyDocument) => { data.scenarios = next.scenarios; data.activeScenarioId = next.activeScenarioId; }) };
}

describe('EnergyLensViewModel', () => {
  let repository: ReturnType<typeof makeRepository>;
  let vm: EnergyLensViewModel;
  beforeEach(() => { repository = makeRepository(); vm = new EnergyLensViewModel(repository); vm.initialize(); });

  it('initializes, persists edits, and recalculates results', () => {
    expect(vm.getState().status).toBe('ready');
    const before = vm.activeSummary?.total.monthlyKwh;
    vm.updateDevice('device-aircon', { dailyHours: 2 });
    expect(vm.activeSummary?.total.monthlyKwh).toBeLessThan(before ?? Infinity);
    expect(repository.save).toHaveBeenCalled();
  });

  it('keeps invalid values out of the document and exposes an error notice', () => {
    vm.updateDevice('device-aircon', { watts: -50 });
    expect(vm.getState().status).toBe('error');
    expect(vm.getState().notice?.text).toBe('功率不能为负数');
    expect(vm.activeScenario?.devices[0].watts).toBe(1200);
  });

  it('duplicates a scenario and can recover a saved document', () => {
    vm.duplicateActive();
    expect(vm.getState().document?.scenarios).toHaveLength(2);
    const recovered = new EnergyLensViewModel(repository);
    recovered.initialize();
    expect(recovered.getState().document?.scenarios).toHaveLength(2);
  });

  it('surfaces persistence failure as a recoverable error', () => {
    repository.save.mockImplementation(() => { throw new Error('quota'); });
    vm.addDevice();
    expect(vm.getState().status).toBe('error');
    expect(vm.getState().notice?.text).toContain('保存失败');
  });

  it('gives every new device a distinct default name and id', () => {
    vm.addDevice();
    vm.addDevice();
    vm.addDevice();
    const devices = vm.activeScenario?.devices ?? [];
    const names = devices.map((device) => device.name);
    const ids = devices.map((device) => device.id);
    expect(names).toContain('新设备');
    expect(names).toContain('新设备 2');
    expect(names).toContain('新设备 3');
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps a cleared name savable, valid and still identifiable', () => {
    vm.updateDevice('device-aircon', { name: '' });
    expect(vm.getState().status).toBe('editing');
    expect(vm.activeScenario?.devices[0].name).toBe('');
    const saved = repository.save.mock.calls.at(-1)?.[0] as EnergyDocument;
    expect(saved.scenarios[0].devices[0].name).toBe('');
    expect(vm.activeSummary?.devices[0].displayName).toBe('未命名设备 1');
  });

  it('distinguishes duplicate names in the summary display labels', () => {
    vm.updateDevice('device-fridge', { name: '客厅空调' });
    const displayNames = vm.activeSummary?.devices.map((device) => device.displayName) ?? [];
    expect(displayNames).toEqual(['客厅空调', '客厅空调 2', '书桌台灯']);
    expect(new Set(displayNames).size).toBe(displayNames.length);
  });
});
