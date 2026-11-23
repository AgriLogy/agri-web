import {
  fixedOrDash,
  nextWeatherData,
  parseOpenMeteoResponse,
  roundOrDash,
  timeOrDash,
} from './openMeteoResponse';

const good = {
  current: {
    time: '2026-11-23T10:00',
    temperature_2m: 18.4,
    relative_humidity_2m: 55,
    apparent_temperature: 17.2,
    weather_code: 2,
    wind_speed_10m: 12.3,
  },
  hourly: {
    time: ['2026-11-23T10:00', '2026-11-23T11:00'],
    temperature_2m: [18.4, 19.1],
    uv_index: [2.1, null],
  },
  daily: {
    time: ['2026-11-23', '2026-11-24'],
    weather_code: [2, 61],
    temperature_2m_max: [21, 19],
    temperature_2m_min: [9, 8],
    sunrise: ['2026-11-23T07:20', '2026-11-24T07:21'],
    sunset: ['2026-11-23T17:30', '2026-11-24T17:29'],
  },
};

describe('parseOpenMeteoResponse', () => {
  it('rejects a non-ok HTTP status even with a body', () => {
    expect(parseOpenMeteoResponse(false, good)).toBeNull();
  });

  it('rejects the Open-Meteo error envelope (rate limit / outage)', () => {
    expect(
      parseOpenMeteoResponse(true, {
        error: true,
        reason: 'Daily API request limit exceeded.',
      })
    ).toBeNull();
    expect(
      parseOpenMeteoResponse(false, { error: true, reason: 'x' })
    ).toBeNull();
  });

  it.each([null, undefined, 'oops', 42, [], {}])(
    'rejects a body that is not a forecast object (%p)',
    (body) => {
      expect(parseOpenMeteoResponse(true, body)).toBeNull();
    }
  );

  it('rejects a response missing current or daily', () => {
    expect(parseOpenMeteoResponse(true, { daily: good.daily })).toBeNull();
    expect(parseOpenMeteoResponse(true, { current: good.current })).toBeNull();
    expect(
      parseOpenMeteoResponse(true, { current: [], daily: good.daily })
    ).toBeNull();
  });

  it('keeps the values of a good response', () => {
    const data = parseOpenMeteoResponse(true, good)!;
    expect(data.current.weather_code).toBe(2);
    expect(data.current.temperature_2m).toBe(18.4);
    expect(data.current.time).toBe('2026-11-23T10:00');
    expect(data.daily.temperature_2m_max).toEqual([21, 19]);
    expect(data.daily.sunrise[0]).toBe('2026-11-23T07:20');
    expect(data.hourly.uv_index).toEqual([2.1, null]);
  });

  it('normalizes missing / malformed fields to null and empty arrays', () => {
    const data = parseOpenMeteoResponse(true, {
      current: { temperature_2m: 'hot', weather_code: Number.NaN },
      daily: { time: 'not-an-array', temperature_2m_max: [1, 'x', null] },
    })!;
    expect(data.current.temperature_2m).toBeNull();
    expect(data.current.weather_code).toBeNull();
    expect(data.current.pressure_msl).toBeNull();
    expect(data.current.time).toBeNull();
    expect(data.daily.time).toEqual([]);
    expect(data.daily.sunrise).toEqual([]);
    expect(data.daily.temperature_2m_max).toEqual([1, null, null]);
    // hourly is optional: absent → every series is an empty array.
    expect(data.hourly.time).toEqual([]);
    expect(data.hourly.uv_index).toEqual([]);
  });
});

describe('nextWeatherData', () => {
  const prev = parseOpenMeteoResponse(true, good);

  it('keeps the last good data when the new fetch failed', () => {
    expect(nextWeatherData(prev, null)).toBe(prev);
  });

  it('stays null when nothing good was ever loaded', () => {
    expect(nextWeatherData(null, null)).toBeNull();
  });

  it('replaces with the fresh data when usable', () => {
    const fresh = parseOpenMeteoResponse(true, good);
    expect(nextWeatherData(prev, fresh)).toBe(fresh);
  });
});

describe('formatters', () => {
  it('render a dash for missing values', () => {
    expect(roundOrDash(null)).toBe('—');
    expect(fixedOrDash(null, 1)).toBe('—');
    expect(timeOrDash(undefined, 'fr-FR')).toBe('—');
    expect(timeOrDash('not a date', 'fr-FR')).toBe('—');
  });

  it('format present values', () => {
    expect(roundOrDash(18.6)).toBe('19');
    expect(roundOrDash(0)).toBe('0');
    expect(roundOrDash(10, (c) => (c * 9) / 5 + 32)).toBe('50');
    expect(fixedOrDash(2.345, 1)).toBe('2.3');
    expect(timeOrDash('2026-11-23T07:20', 'fr-FR')).toMatch(/07:20/);
  });
});
