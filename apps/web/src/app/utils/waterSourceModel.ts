/**
 * Water source form model (agrilogy-front#261) — pure, dependency-free.
 *
 * The server owns every number shown on the Water Station (volume, fill %,
 * status, alerts). The only calculation done here is the "calculated max
 * capacity" preview in the Add/Edit form, which mirrors agri.core.water_level
 * so the user sees the capacity while typing. Values are SI: m, m³.
 */

import type {
  CalibrationPoint,
  LiveDeviceInput,
  WaterDataStatus,
  WaterLevelState,
  WaterSource,
  WaterSourceGeometry,
  WaterSourceInput,
  WaterSourceMode,
  WaterSourceType,
} from '@agri/api-client/waterLevelApi';

/** Form state: numeric inputs are kept as strings while being edited. */
export interface WaterSourceForm {
  name: string;
  source_type: WaterSourceType;
  geometry: WaterSourceGeometry;
  zone_ids: number[];
  max_height_m: string;
  length_m: string;
  width_m: string;
  diameter_m: string;
  total_depth_m: string;
  max_capacity_m3: string;
  calibration_table: { level_m: string; volume_m3: string }[];
  minimum_reserve_m3: string;
  low_warning_pct: string;
  critical_pct: string;
  high_pct: string;
  offline_after_min: string;
  mode: WaterSourceMode;
  device: {
    device_id: string;
    dev_eui: string;
    modbus_slave_id: string;
    register_address: string;
    register_type: string;
    scale: string;
    offset_m: string;
    baud_rate: string;
    parity: string;
    byte_order: string;
  };
}

export type WaterFormErrorKey =
  | 'nameRequired'
  | 'maxHeight'
  | 'lengthWidth'
  | 'diameter'
  | 'calibration'
  | 'thresholds'
  | 'reserve'
  | 'offline'
  | 'totalDepth';

const EMPTY_DEVICE: WaterSourceForm['device'] = {
  device_id: '',
  dev_eui: '',
  modbus_slave_id: '',
  register_address: '',
  register_type: '',
  scale: '1',
  offset_m: '0',
  baud_rate: '',
  parity: '',
  byte_order: '',
};

export const emptyWaterSourceForm = (
  type: WaterSourceType = 'BASIN'
): WaterSourceForm => ({
  name: '',
  source_type: type,
  geometry: type === 'BASIN' ? 'RECTANGULAR' : 'CYLINDRICAL',
  zone_ids: [],
  max_height_m: '',
  length_m: '',
  width_m: '',
  diameter_m: '',
  total_depth_m: '',
  max_capacity_m3: '',
  calibration_table: [
    { level_m: '0', volume_m3: '0' },
    { level_m: '', volume_m3: '' },
  ],
  minimum_reserve_m3: '0',
  low_warning_pct: '30',
  critical_pct: '15',
  high_pct: '95',
  offline_after_min: '120',
  mode: 'SIMULATED',
  device: { ...EMPTY_DEVICE },
});

const str = (v: number | string | null | undefined): string =>
  v == null ? '' : String(v);

export const formFromSource = (s: WaterSource): WaterSourceForm => {
  const live = s.devices.find((d) => d.adapter !== 'simulator');
  return {
    name: s.name,
    source_type: s.source_type,
    geometry: s.geometry,
    zone_ids: [...s.zone_ids],
    max_height_m: str(s.max_height_m),
    length_m: str(s.length_m),
    width_m: str(s.width_m),
    diameter_m: str(s.diameter_m),
    total_depth_m: str(s.total_depth_m),
    max_capacity_m3: str(s.max_capacity_m3),
    calibration_table: (s.calibration_table ?? []).map((p) => ({
      level_m: str(p.level_m),
      volume_m3: str(p.volume_m3),
    })),
    minimum_reserve_m3: str(s.minimum_reserve_m3),
    low_warning_pct: str(s.low_warning_pct),
    critical_pct: str(s.critical_pct),
    high_pct: str(s.high_pct),
    offline_after_min: str(s.offline_after_min),
    mode: s.mode,
    device: live
      ? {
          device_id: live.device_id,
          dev_eui: str(live.dev_eui),
          modbus_slave_id: str(live.modbus_slave_id),
          register_address: str(live.register_address),
          register_type: str(live.register_type),
          scale: str(live.scale),
          offset_m: str(live.offset_m),
          baud_rate: str(live.baud_rate),
          parity: str(live.parity),
          byte_order: str(live.byte_order),
        }
      : { ...EMPTY_DEVICE },
  };
};

/** Parse a user-typed number ("4,8" or "4.8"); null when blank or invalid. */
export const parseNum = (v: string): number | null => {
  const t = v.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const positive = (n: number | null): n is number => n != null && n > 0;

export const parsedCalibration = (
  form: WaterSourceForm
): CalibrationPoint[] | null => {
  const rows = form.calibration_table
    .map((r) => ({
      level_m: parseNum(r.level_m),
      volume_m3: parseNum(r.volume_m3),
    }))
    .filter((r) => r.level_m != null || r.volume_m3 != null);
  if (rows.some((r) => r.level_m == null || r.volume_m3 == null)) return null;
  const points = (rows as CalibrationPoint[])
    .slice()
    .sort((a, b) => a.level_m - b.level_m);
  if (points.length < 2) return null;
  for (let i = 1; i < points.length; i++) {
    if (points[i].level_m === points[i - 1].level_m) return null;
    if (points[i].volume_m3 < points[i - 1].volume_m3) return null;
  }
  if (points.some((p) => p.level_m < 0 || p.volume_m3 < 0)) return null;
  return points;
};

/** Mirrors agri.core.water_level.capacity_m3 (preview only). */
export const previewCapacityM3 = (form: WaterSourceForm): number | null => {
  const h = parseNum(form.max_height_m);
  if (!positive(h)) return null;
  if (form.geometry === 'RECTANGULAR') {
    const l = parseNum(form.length_m);
    const w = parseNum(form.width_m);
    return positive(l) && positive(w) ? l * w * h : null;
  }
  if (form.geometry === 'CYLINDRICAL') {
    const d = parseNum(form.diameter_m);
    return positive(d) ? Math.PI * (d / 2) ** 2 * h : null;
  }
  const declared = parseNum(form.max_capacity_m3);
  if (positive(declared)) return declared;
  const table = parsedCalibration(form);
  return table ? table[table.length - 1].volume_m3 : null;
};

/** Same rules as agri.core.water_level.validate_spec, as i18n keys. */
export const validateForm = (form: WaterSourceForm): WaterFormErrorKey[] => {
  const errors: WaterFormErrorKey[] = [];
  const isWell = form.source_type === 'WELL';
  const h = parseNum(form.max_height_m);
  if (!form.name.trim()) errors.push('nameRequired');
  if (!positive(h)) errors.push('maxHeight');
  if (
    form.geometry === 'RECTANGULAR' &&
    !isWell &&
    !(positive(parseNum(form.length_m)) && positive(parseNum(form.width_m)))
  )
    errors.push('lengthWidth');
  if (
    form.geometry === 'CYLINDRICAL' &&
    !isWell &&
    !positive(parseNum(form.diameter_m))
  )
    errors.push('diameter');
  if (form.geometry === 'IRREGULAR' && parsedCalibration(form) == null)
    errors.push('calibration');
  const depth = parseNum(form.total_depth_m);
  if (isWell && depth != null && h != null && depth < h)
    errors.push('totalDepth');
  const reserve = parseNum(form.minimum_reserve_m3);
  if (reserve == null || reserve < 0) errors.push('reserve');
  const crit = parseNum(form.critical_pct);
  const low = parseNum(form.low_warning_pct);
  const high = parseNum(form.high_pct);
  const inPct = (n: number | null) => n != null && n >= 0 && n <= 100;
  if (
    !(inPct(crit) && inPct(low) && inPct(high)) ||
    !(crit! <= low! && low! < high!)
  )
    errors.push('thresholds');
  const off = parseNum(form.offline_after_min);
  if (!positive(off) || !Number.isInteger(off)) errors.push('offline');
  return errors;
};

const deviceInput = (form: WaterSourceForm): LiveDeviceInput | undefined => {
  const d = form.device;
  const text = (v: string) => v.trim() || null;
  const int = (v: string) => {
    const n = parseNum(v);
    return n == null ? null : Math.trunc(n);
  };
  const touched =
    form.mode !== 'SIMULATED' ||
    [
      d.device_id,
      d.dev_eui,
      d.modbus_slave_id,
      d.register_address,
      d.register_type,
      d.baud_rate,
      d.parity,
      d.byte_order,
    ].some((v) => v.trim() !== '');
  if (!touched) return undefined;
  const out: LiveDeviceInput = {
    dev_eui: text(d.dev_eui),
    modbus_slave_id: int(d.modbus_slave_id),
    register_address: int(d.register_address),
    register_type: text(d.register_type),
    scale: parseNum(d.scale) ?? 1,
    offset_m: parseNum(d.offset_m) ?? 0,
    baud_rate: int(d.baud_rate),
    parity: text(d.parity),
    byte_order: text(d.byte_order),
  };
  if (d.device_id.trim()) out.device_id = d.device_id.trim();
  return out;
};

/** Form → API payload. Dimensions irrelevant to the geometry are cleared. */
export const formToInput = (form: WaterSourceForm): WaterSourceInput => {
  const g = form.geometry;
  return {
    name: form.name.trim(),
    source_type: form.source_type,
    geometry: g,
    zone_ids: form.zone_ids,
    max_height_m: parseNum(form.max_height_m) ?? 0,
    length_m: g === 'RECTANGULAR' ? parseNum(form.length_m) : null,
    width_m: g === 'RECTANGULAR' ? parseNum(form.width_m) : null,
    diameter_m: g === 'CYLINDRICAL' ? parseNum(form.diameter_m) : null,
    total_depth_m:
      form.source_type === 'WELL' ? parseNum(form.total_depth_m) : null,
    max_capacity_m3: g === 'IRREGULAR' ? parseNum(form.max_capacity_m3) : null,
    calibration_table: g === 'IRREGULAR' ? parsedCalibration(form) : null,
    minimum_reserve_m3: parseNum(form.minimum_reserve_m3) ?? 0,
    low_warning_pct: parseNum(form.low_warning_pct) ?? 30,
    critical_pct: parseNum(form.critical_pct) ?? 15,
    high_pct: parseNum(form.high_pct) ?? 95,
    offline_after_min: Math.trunc(parseNum(form.offline_after_min) ?? 120),
    mode: form.mode,
    live_device: deviceInput(form),
  };
};

export type ChakraScheme =
  | 'green'
  | 'blue'
  | 'orange'
  | 'red'
  | 'gray'
  | 'purple';

export const dataStatusScheme = (s: WaterDataStatus): ChakraScheme =>
  (
    ({
      LIVE: 'green',
      SIMULATED: 'blue',
      STALE: 'orange',
      OFFLINE: 'gray',
      INVALID: 'red',
      CALIBRATING: 'purple',
    }) as const
  )[s];

export const levelStateScheme = (s: WaterLevelState): ChakraScheme =>
  (
    ({
      NORMAL: 'green',
      LOW: 'orange',
      CRITICAL: 'red',
      HIGH: 'purple',
      UNKNOWN: 'gray',
    }) as const
  )[s];

/** "2 min ago"-style age bucket: [value, unit] for an i18n plural message. */
export const ageParts = (
  iso: string,
  now: Date = new Date()
): { value: number; unit: 'seconds' | 'minutes' | 'hours' | 'days' } => {
  const sec = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return { value: Math.floor(sec), unit: 'seconds' };
  if (sec < 3600) return { value: Math.floor(sec / 60), unit: 'minutes' };
  if (sec < 86400) return { value: Math.floor(sec / 3600), unit: 'hours' };
  return { value: Math.floor(sec / 86400), unit: 'days' };
};
