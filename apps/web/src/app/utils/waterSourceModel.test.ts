import type { WaterSource } from '@agri/api-client/waterLevelApi';
import {
  ageParts,
  emptyWaterSourceForm,
  formFromSource,
  formToInput,
  parseNum,
  previewCapacityM3,
  validateForm,
  type WaterSourceForm,
} from './waterSourceModel';

const basin = (over: Partial<WaterSourceForm> = {}): WaterSourceForm => ({
  ...emptyWaterSourceForm('BASIN'),
  name: 'Main Basin',
  max_height_m: '4,8',
  length_m: '8',
  width_m: '3',
  minimum_reserve_m3: '10',
  ...over,
});

describe('waterSourceModel', () => {
  it('parses comma decimals and blanks', () => {
    expect(parseNum('4,8')).toBe(4.8);
    expect(parseNum(' ')).toBeNull();
    expect(parseNum('abc')).toBeNull();
  });

  it('previews capacity like the brief (8 x 3 x 4.80 = 115.2 m³)', () => {
    expect(previewCapacityM3(basin())).toBeCloseTo(115.2);
    expect(
      previewCapacityM3(
        basin({ geometry: 'CYLINDRICAL', diameter_m: '2', max_height_m: '2' })
      )
    ).toBeCloseTo(2 * Math.PI);
    expect(
      previewCapacityM3(
        basin({
          geometry: 'IRREGULAR',
          calibration_table: [
            { level_m: '2', volume_m3: '500' },
            { level_m: '0', volume_m3: '0' },
          ],
        })
      )
    ).toBe(500);
    expect(previewCapacityM3(basin({ width_m: '' }))).toBeNull();
  });

  it('validates with the server rules', () => {
    expect(validateForm(basin())).toEqual([]);
    expect(validateForm(basin({ name: ' ', length_m: '' }))).toEqual([
      'nameRequired',
      'lengthWidth',
    ]);
    expect(validateForm(basin({ critical_pct: '40' }))).toEqual(['thresholds']);
    expect(
      validateForm(
        basin({
          geometry: 'IRREGULAR',
          calibration_table: [
            { level_m: '0', volume_m3: '5' },
            { level_m: '1', volume_m3: '2' },
          ],
        })
      )
    ).toEqual(['calibration']);
    // A well may omit its dimensions, but not have a depth above its height.
    const well = basin({
      source_type: 'WELL',
      geometry: 'CYLINDRICAL',
      diameter_m: '',
      max_height_m: '30',
      total_depth_m: '20',
    });
    expect(validateForm(well)).toEqual(['totalDepth']);
  });

  it('builds the payload and clears dimensions of other geometries', () => {
    const input = formToInput(basin({ diameter_m: '9', total_depth_m: '50' }));
    expect(input).toMatchObject({
      name: 'Main Basin',
      max_height_m: 4.8,
      length_m: 8,
      width_m: 3,
      diameter_m: null,
      total_depth_m: null,
      calibration_table: null,
      minimum_reserve_m3: 10,
      mode: 'SIMULATED',
    });
    expect(input.live_device).toBeUndefined();

    const live = formToInput(
      basin({
        mode: 'LIVE',
        device: {
          ...emptyWaterSourceForm().device,
          dev_eui: 'A840',
          modbus_slave_id: '1',
          scale: '0.01',
        },
      })
    );
    expect(live.live_device).toMatchObject({
      dev_eui: 'A840',
      modbus_slave_id: 1,
      scale: 0.01,
      offset_m: 0,
      parity: null,
    });
  });

  it('round-trips a server source into the form', () => {
    const source: WaterSource = {
      ...formToInput(basin()),
      id: 7,
      capacity_m3: 115.2,
      created_at: '',
      updated_at: '',
      devices: [
        {
          id: 1,
          device_id: 'simulator-ws7',
          adapter: 'simulator',
          enabled: true,
          scale: 1,
          offset_m: 0,
          dev_eui: null,
          modbus_slave_id: null,
          register_address: null,
          register_type: null,
          baud_rate: null,
          parity: null,
          byte_order: null,
        },
      ],
    };
    const form = formFromSource(source);
    expect(form.max_height_m).toBe('4.8');
    expect(form.device.device_id).toBe('');
    expect(formToInput(form).length_m).toBe(8);
  });

  it('buckets ages', () => {
    const now = new Date('2026-08-06T15:00:00Z');
    expect(ageParts('2026-08-06T14:58:00Z', now)).toEqual({
      value: 2,
      unit: 'minutes',
    });
    expect(ageParts('2026-08-04T15:00:00Z', now)).toEqual({
      value: 2,
      unit: 'days',
    });
  });
});
