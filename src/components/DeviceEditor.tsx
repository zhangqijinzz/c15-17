import type { ChangeEvent } from 'react';
import type { EnergyDevice } from '../types';

interface DeviceEditorProps {
  device: EnergyDevice;
  displayName: string;
  onChange: (patch: Partial<EnergyDevice>) => void;
  onRemove: () => void;
}

export function DeviceEditor({ device, displayName, onChange, onRemove }: DeviceEditorProps) {
  const numberChange = (key: 'watts' | 'dailyHours') => (event: ChangeEvent<HTMLInputElement>) => onChange({ [key]: Number(event.target.value) });
  return (
    <div className="device-row">
      <div className="device-icon">{displayName.slice(0, 1) || '·'}</div>
      <label className="field device-name"><span>设备名称</span><input value={device.name} placeholder={displayName} onChange={(event) => onChange({ name: event.target.value })} /></label>
      <label className="field"><span>功率 <em>W</em></span><input type="number" min="0" step="10" value={device.watts} onChange={numberChange('watts')} /></label>
      <label className="field"><span>每日使用 <em>小时</em></span><input type="number" min="0" max="24" step="0.5" value={device.dailyHours} onChange={numberChange('dailyHours')} /></label>
      <button className="icon-button" onClick={onRemove} aria-label={`移除${displayName}`}>×</button>
    </div>
  );
}
