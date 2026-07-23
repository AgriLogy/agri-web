/**
 * INTEGRATION tests for Réglages → "Étalonnage" (agri-web #97, CAL-1).
 *
 * The component is driven for real; only the HTTP layer is faked, by an
 * in-memory stand-in for `/sensor-calibrations` that behaves like agri-api —
 * so the whole chain (component → hook → sensorCalibrationApi → axios) is
 * exercised, including the degraded mode where the agri-db migration
 * `f4b6d2e8c1a9` is not applied.
 *
 * What these prove, concretely: every assertion is about a REQUEST reaching
 * the account endpoint, or about what the farmer is told — never about
 * component-local state. Moving persistence back to `localStorage`, or letting
 * the unit picker relabel instead of recompute, breaks them.
 */

import React from 'react';
import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import frMessages from '../../../../../../packages/i18n/src/messages/fr.json';

jest.mock('next-intl', () => {
  const catalogue = jest.requireActual(
    '../../../../../../packages/i18n/src/messages/fr.json'
  );
  const resolve = (key: string): string | undefined => {
    let node: unknown = catalogue;
    for (const part of key.split('.')) {
      if (node && typeof node === 'object' && part in (node as object)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof node === 'string' ? node : undefined;
  };
  const translator = () => {
    const t = (key: string, values?: Record<string, unknown>) => {
      const raw = resolve(key);
      if (raw == null) return key;
      if (!values) return raw;
      return Object.entries(values).reduce(
        (acc, [name, value]) => acc.split(`{${name}}`).join(String(value)),
        raw
      );
    };
    t.has = (key: string) => resolve(key) != null;
    t.rich = (key: string) => key;
    return t;
  };
  return {
    __esModule: true,
    useTranslations: translator,
    useLocale: () => 'fr',
  };
});

const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}));

import SensorCalibrationSettings from './SensorCalibrationSettings';
import {
  makeFakeCalibrationServer,
  wireFakeCalibrationServer,
  type FakeCalibrationServer,
} from '@/app/lib/fakeSensorCalibrationServer';

let server: FakeCalibrationServer;

const m = frMessages.settings.calibration;

/** The first sensor of the fixture farm: soil_moisture on device 10, zone 5. */
const FIRST_SENSOR = { deviceId: 10, sensorKey: 'soil_moisture' };
const firstPath = `/sensor-calibrations/${FIRST_SENSOR.deviceId}/${FIRST_SENSOR.sensorKey}`;

const renderEditor = async () => {
  const utils = render(
    <ChakraProvider>
      <SensorCalibrationSettings />
    </ChakraProvider>
  );
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith(firstPath));
  await waitFor(() =>
    expect(screen.queryByText(frMessages.common.loading)).not.toBeInTheDocument()
  );
  return utils;
};

const scaleInput = () => screen.getByLabelText(m.scaleLabel);
const offsetInput = () => screen.getByLabelText(m.offsetLabel);
const unitSelect = () => screen.getByLabelText(m.unitLabel);

beforeEach(() => {
  localStorage.clear();
  mockGet.mockReset();
  mockPut.mockReset();
  server = makeFakeCalibrationServer();
  wireFakeCalibrationServer(server, { mockGet, mockPut });
});

describe('SensorCalibrationSettings — per-sensor, account-persisted', () => {
  it('loads the identity defaults for an un-calibrated sensor', async () => {
    await renderEditor();

    // Read from the account endpoint, keyed by (device_id, sensor_key).
    expect(mockGet).toHaveBeenCalledWith(firstPath);
    expect(screen.getByTestId('calibration-status')).toHaveTextContent(
      m.statusDefault
    );
    expect(scaleInput()).toHaveValue(1);
    expect(offsetInput()).toHaveValue(0);
  });

  it('saves through PUT and reloads showing the stored values', async () => {
    await renderEditor();

    fireEvent.change(scaleInput(), { target: { value: '1.05' } });
    fireEvent.change(offsetInput(), { target: { value: '-0.3' } });
    await act(async () => {
      fireEvent.click(screen.getByText(m.saveButton));
    });

    expect(mockPut).toHaveBeenCalledWith(
      firstPath,
      expect.objectContaining({
        scale_a: 1.05,
        offset_b: -0.3,
        is_active: true,
      })
    );
    // Re-read from the server, and now reported as a stored row.
    await waitFor(() =>
      expect(screen.getByTestId('calibration-status')).toHaveTextContent(
        m.statusConfigured
      )
    );
    expect(scaleInput()).toHaveValue(1.05);
    expect(offsetInput()).toHaveValue(-0.3);
  });

  it('shows a stored calibration when the sensor already has one', async () => {
    server.seed(FIRST_SENSOR.deviceId, FIRST_SENSOR.sensorKey, {
      scale_a: 2,
      offset_b: 1,
      unit: '%',
      is_active: true,
    });
    await renderEditor();

    expect(scaleInput()).toHaveValue(2);
    expect(offsetInput()).toHaveValue(1);
    expect(screen.getByTestId('calibration-status')).toHaveTextContent(
      m.statusConfigured
    );
  });

  it('is per SENSOR: picking another sensor reads its own row', async () => {
    server.seed(20, 'soil_ph', { scale_a: 3, offset_b: 0, unit: 'pH' });
    await renderEditor();

    await act(async () => {
      fireEvent.change(screen.getByLabelText(m.sensorLabel), {
        target: { value: '20:soil_ph' },
      });
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/sensor-calibrations/20/soil_ph')
    );
    await waitFor(() => expect(scaleInput()).toHaveValue(3));
  });

  it('previews "raw X → corrected Y" before anything is saved', async () => {
    await renderEditor();

    fireEvent.change(scaleInput(), { target: { value: '2' } });
    fireEvent.change(offsetInput(), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(m.previewRawLabel), {
      target: { value: '10' },
    });

    // real = 10 × 2 + 1 = 21
    expect(screen.getByTestId('calibration-preview')).toHaveTextContent('21');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('is_active=false is stored, disabling the correction without losing a and b', async () => {
    await renderEditor();

    fireEvent.change(scaleInput(), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.click(screen.getByText(m.saveButton));
    });

    expect(mockPut).toHaveBeenCalledWith(
      firstPath,
      expect.objectContaining({ scale_a: 2, is_active: false })
    );
    // The coefficient survives the round-trip: paused, not erased.
    await waitFor(() => expect(scaleInput()).toHaveValue(2));
    expect(screen.getByText(m.statusInactive)).toBeInTheDocument();
  });
});

describe('SensorCalibrationSettings — changing the target unit', () => {
  const seedCelsius = () =>
    server.seed(10, 'soil_temperature', {
      scale_a: 2,
      offset_b: 5,
      unit: '°C',
    });

  const selectTemperatureSensor = async () => {
    await act(async () => {
      fireEvent.change(screen.getByLabelText(m.sensorLabel), {
        target: { value: '10:soil_temperature' },
      });
    });
    await waitFor(() => expect(scaleInput()).toHaveValue(2));
  };

  it('RECOMPUTES a and b — °C→°F takes (2, 5) to (3.6, 41)', async () => {
    seedCelsius();
    await renderEditor();
    await selectTemperatureSensor();

    await act(async () => {
      fireEvent.change(unitSelect(), { target: { value: '°F' } });
    });

    // a' = 1.8a = 3.6 ; b' = 1.8b + 32 = 41
    expect(scaleInput()).toHaveValue(3.6);
    expect(offsetInput()).toHaveValue(41);
  });

  it('stores the recomputed coefficients, not the old ones under a new label', async () => {
    seedCelsius();
    await renderEditor();
    await selectTemperatureSensor();

    await act(async () => {
      fireEvent.change(unitSelect(), { target: { value: '°F' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText(m.saveButton));
    });

    expect(mockPut).toHaveBeenCalledWith(
      '/sensor-calibrations/10/soil_temperature',
      expect.objectContaining({ scale_a: 3.6, offset_b: 41, unit: '°F' })
    );
  });

  it('offers only units of the same physical dimension', async () => {
    seedCelsius();
    await renderEditor();
    await selectTemperatureSensor();

    const options = Array.from(
      unitSelect().querySelectorAll('option')
    ).map((option) => option.getAttribute('value'));
    expect(options).toEqual(expect.arrayContaining(['°C', '°F', 'K']));
    expect(options).not.toContain('bar');
  });
});

describe('SensorCalibrationSettings — refusals', () => {
  it('refuses scale_a = 0 client-side, before the API is asked', async () => {
    await renderEditor();

    fireEvent.change(scaleInput(), { target: { value: '0' } });

    expect(screen.getByText(m.scaleZeroError)).toBeInTheDocument();
    expect(screen.getByText(m.saveButton).closest('button')).toBeDisabled();
    await act(async () => {
      fireEvent.click(screen.getByText(m.saveButton));
    });
    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe('SensorCalibrationSettings — "stored but not applied"', () => {
  it('says so on screen, every time, without dressing it up as an error', async () => {
    await renderEditor();

    const notice = screen.getByTestId('calibration-not-applied');
    expect(notice).toBeInTheDocument();
    // Informational, not an error: the calibration IS saved.
    expect(notice).toHaveAttribute('data-status', 'info');
    expect(screen.getByText(m.notAppliedBody)).toBeInTheDocument();
  });
});

describe('SensorCalibrationSettings — degraded schema', () => {
  it('says calibration is unavailable instead of inviting a doomed save', async () => {
    server.degraded = true;
    await renderEditor();

    await waitFor(() =>
      expect(screen.getByTestId('calibration-unavailable')).toBeInTheDocument()
    );
    expect(screen.getByText(m.unavailableBody)).toBeInTheDocument();
    // The edit path is closed rather than failing on submit.
    expect(scaleInput()).toBeDisabled();
    expect(screen.getByText(m.saveButton).closest('button')).toBeDisabled();
  });

  it('flips to the degraded state when a write comes back naming the migration', async () => {
    await renderEditor();
    expect(
      screen.queryByTestId('calibration-unavailable')
    ).not.toBeInTheDocument();

    server.degraded = true; // the migration is rolled back under our feet
    await act(async () => {
      fireEvent.click(screen.getByText(m.saveButton));
    });

    await waitFor(() =>
      expect(screen.getByTestId('calibration-unavailable')).toBeInTheDocument()
    );
  });

  it('an ordinary 400 is NOT mistaken for a missing migration', async () => {
    await renderEditor();
    // The fake server refuses scale_a = 0 with a plain 400; the client-side
    // guard normally stops it, so bypass the guard by rejecting the next PUT
    // the way agri-api's validator would.
    mockPut.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'scale_a must not be 0.' } },
    });
    await act(async () => {
      fireEvent.click(screen.getByText(m.saveButton));
    });

    expect(
      screen.queryByTestId('calibration-unavailable')
    ).not.toBeInTheDocument();
  });
});
