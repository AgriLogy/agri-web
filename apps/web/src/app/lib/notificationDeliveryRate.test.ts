import {
  DEFAULT_DELIVERY_RATE,
  DELIVERY_RATE_PRESETS,
  deliveryRateFromMinutes,
  deliveryRateToMinutes,
  deliveryRateToMs,
  deliveryRateToSeconds,
  isDeliveryUnit,
  matchPresetKey,
  msUntilNextDelivery,
  nextDeliveryAt,
  normalizeDeliveryRate,
  parseTimestamp,
  presetByKey,
  shouldDeliverNow,
  type DeliveryRate,
} from '@agri/api-client/notificationDeliveryRate';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe('duration conversions', () => {
  it('converts each unit to the right number of seconds', () => {
    expect(deliveryRateToSeconds({ amount: 20, unit: 'minute' })).toBe(1200);
    expect(deliveryRateToSeconds({ amount: 1, unit: 'hour' })).toBe(3600);
    expect(deliveryRateToSeconds({ amount: 4, unit: 'hour' })).toBe(14400);
    expect(deliveryRateToSeconds({ amount: 1, unit: 'day' })).toBe(86400);
    expect(deliveryRateToSeconds({ amount: 1, unit: 'week' })).toBe(604800);
    expect(deliveryRateToSeconds({ amount: 2, unit: 'week' })).toBe(1209600);
  });

  it('ms and minutes helpers agree', () => {
    expect(deliveryRateToMs({ amount: 4, unit: 'hour' })).toBe(4 * HOUR);
    expect(deliveryRateToMinutes({ amount: 1, unit: 'day' })).toBe(1440);
    expect(deliveryRateToMinutes({ amount: 1, unit: 'week' })).toBe(10080);
    expect(deliveryRateToMinutes({ amount: 20, unit: 'minute' })).toBe(20);
  });
});

describe('normalizeDeliveryRate', () => {
  it('passes through valid rates (rounding the amount)', () => {
    expect(normalizeDeliveryRate({ amount: 4, unit: 'hour' })).toEqual({
      amount: 4,
      unit: 'hour',
    });
    expect(normalizeDeliveryRate({ amount: 2.6, unit: 'day' })).toEqual({
      amount: 3,
      unit: 'day',
    });
  });

  it('falls back to default for garbage / partial input', () => {
    expect(normalizeDeliveryRate(undefined)).toEqual(DEFAULT_DELIVERY_RATE);
    expect(normalizeDeliveryRate(null)).toEqual(DEFAULT_DELIVERY_RATE);
    expect(normalizeDeliveryRate('weekly')).toEqual(DEFAULT_DELIVERY_RATE);
    expect(normalizeDeliveryRate({})).toEqual(DEFAULT_DELIVERY_RATE);
    expect(normalizeDeliveryRate({ amount: 5, unit: 'fortnight' })).toEqual({
      amount: 5,
      unit: 'hour',
    });
    expect(normalizeDeliveryRate({ amount: 'lots', unit: 'day' })).toEqual({
      amount: 1,
      unit: 'day',
    });
  });

  it('clamps the amount into [1, 1000]', () => {
    expect(normalizeDeliveryRate({ amount: 0, unit: 'hour' }).amount).toBe(1);
    expect(normalizeDeliveryRate({ amount: -7, unit: 'hour' }).amount).toBe(1);
    expect(normalizeDeliveryRate({ amount: 999999, unit: 'hour' }).amount).toBe(
      1000
    );
  });

  it('isDeliveryUnit guards units', () => {
    expect(isDeliveryUnit('hour')).toBe(true);
    expect(isDeliveryUnit('week')).toBe(true);
    expect(isDeliveryUnit('month')).toBe(false);
    expect(isDeliveryUnit(3)).toBe(false);
  });
});

describe('presets', () => {
  it('exposes the five discussed presets', () => {
    expect(DELIVERY_RATE_PRESETS.map((p) => p.key)).toEqual([
      'every20min',
      'every1hour',
      'every4hours',
      'daily',
      'weekly',
    ]);
  });

  it('matchPresetKey identifies presets and returns null for custom', () => {
    expect(matchPresetKey({ amount: 20, unit: 'minute' })).toBe('every20min');
    expect(matchPresetKey({ amount: 4, unit: 'hour' })).toBe('every4hours');
    expect(matchPresetKey({ amount: 1, unit: 'week' })).toBe('weekly');
    // 60 minutes == 1 hour preset (duration-based match, not literal)
    expect(matchPresetKey({ amount: 60, unit: 'minute' })).toBe('every1hour');
    // genuinely custom
    expect(matchPresetKey({ amount: 3, unit: 'day' })).toBeNull();
    expect(matchPresetKey({ amount: 90, unit: 'minute' })).toBeNull();
  });

  it('presetByKey round-trips', () => {
    expect(presetByKey('weekly')?.rate).toEqual({ amount: 1, unit: 'week' });
    expect(presetByKey('nope')).toBeUndefined();
  });
});

describe('deliveryRateFromMinutes (legacy intervalMinutes migration)', () => {
  it.each<[number, DeliveryRate]>([
    [20, { amount: 20, unit: 'minute' }],
    [60, { amount: 1, unit: 'hour' }],
    [240, { amount: 4, unit: 'hour' }],
    [1440, { amount: 1, unit: 'day' }],
    [10080, { amount: 1, unit: 'week' }],
    [90, { amount: 90, unit: 'minute' }],
    [120, { amount: 2, unit: 'hour' }],
    [2880, { amount: 2, unit: 'day' }],
  ])('maps %i minutes -> nicest unit', (mins, expected) => {
    expect(deliveryRateFromMinutes(mins)).toEqual(expected);
  });

  it('falls back to default for invalid input', () => {
    expect(deliveryRateFromMinutes(0)).toEqual(DEFAULT_DELIVERY_RATE);
    expect(deliveryRateFromMinutes(-5)).toEqual(DEFAULT_DELIVERY_RATE);
    expect(deliveryRateFromMinutes(NaN)).toEqual(DEFAULT_DELIVERY_RATE);
    expect(deliveryRateFromMinutes('x')).toEqual(DEFAULT_DELIVERY_RATE);
  });
});

describe('parseTimestamp', () => {
  it('accepts ISO strings and epoch ms', () => {
    expect(parseTimestamp('2026-06-05T10:00:00.000Z')).toBe(
      Date.parse('2026-06-05T10:00:00.000Z')
    );
    expect(parseTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000);
  });
  it('returns null for missing/invalid', () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp('not-a-date')).toBeNull();
    expect(parseTimestamp({})).toBeNull();
    expect(parseTimestamp(NaN)).toBeNull();
  });
});

describe('shouldDeliverNow — across every period', () => {
  const T0 = Date.parse('2026-06-05T00:00:00.000Z');
  const iso = (ms: number) => new Date(ms).toISOString();

  it('always delivers when never sent before', () => {
    expect(shouldDeliverNow({ amount: 1, unit: 'week' }, null, T0)).toBe(true);
    expect(
      shouldDeliverNow({ amount: 20, unit: 'minute' }, undefined, T0)
    ).toBe(true);
    expect(shouldDeliverNow({ amount: 4, unit: 'hour' }, 'garbage', T0)).toBe(
      true
    );
  });

  type Case = { rate: DeliveryRate; period: number; label: string };
  const cases: Case[] = [
    { rate: { amount: 20, unit: 'minute' }, period: 20 * MIN, label: '20 min' },
    { rate: { amount: 1, unit: 'hour' }, period: HOUR, label: '1 hour' },
    { rate: { amount: 4, unit: 'hour' }, period: 4 * HOUR, label: '4 hours' },
    { rate: { amount: 1, unit: 'day' }, period: DAY, label: 'daily' },
    { rate: { amount: 1, unit: 'week' }, period: WEEK, label: 'weekly' },
    {
      rate: { amount: 3, unit: 'day' },
      period: 3 * DAY,
      label: 'custom 3 days',
    },
    {
      rate: { amount: 90, unit: 'minute' },
      period: 90 * MIN,
      label: 'custom 90 min',
    },
  ];

  describe.each(cases)('$label', ({ rate, period }) => {
    it('blocks just before the period and allows at/after the boundary', () => {
      const sent = iso(T0);
      // just sent
      expect(shouldDeliverNow(rate, sent, T0)).toBe(false);
      // half-way
      expect(shouldDeliverNow(rate, sent, T0 + period / 2)).toBe(false);
      // 1ms before boundary
      expect(shouldDeliverNow(rate, sent, T0 + period - 1)).toBe(false);
      // exactly at boundary (inclusive)
      expect(shouldDeliverNow(rate, sent, T0 + period)).toBe(true);
      // after boundary
      expect(shouldDeliverNow(rate, sent, T0 + period + 1)).toBe(true);
      // long after
      expect(shouldDeliverNow(rate, sent, T0 + period * 5)).toBe(true);
    });

    it('msUntilNextDelivery counts down to zero then stays zero', () => {
      const sent = iso(T0);
      expect(msUntilNextDelivery(rate, sent, T0)).toBe(period);
      expect(msUntilNextDelivery(rate, sent, T0 + period / 2)).toBe(period / 2);
      expect(msUntilNextDelivery(rate, sent, T0 + period)).toBe(0);
      expect(msUntilNextDelivery(rate, sent, T0 + period + 5_000)).toBe(0);
      expect(msUntilNextDelivery(rate, null, T0)).toBe(0);
    });

    it('nextDeliveryAt = sent + period', () => {
      expect(nextDeliveryAt(rate, iso(T0), T0)).toBe(T0 + period);
    });
  });

  it('does not deliver when last-sent is in the future (clock skew)', () => {
    const future = iso(T0 + HOUR);
    expect(shouldDeliverNow({ amount: 20, unit: 'minute' }, future, T0)).toBe(
      false
    );
    expect(
      msUntilNextDelivery({ amount: 20, unit: 'minute' }, future, T0)
    ).toBe(HOUR + 20 * MIN);
  });

  it('simulates a weekly timeline: exactly one delivery per week', () => {
    const rate: DeliveryRate = { amount: 1, unit: 'week' };
    let lastSent: string | null = null;
    let deliveries = 0;
    // tick once an hour for 3 weeks + a bit
    for (let h = 0; h <= 24 * 7 * 3 + 5; h++) {
      const now = T0 + h * HOUR;
      if (shouldDeliverNow(rate, lastSent, now)) {
        deliveries++;
        lastSent = iso(now);
      }
    }
    expect(deliveries).toBe(4); // h0, +1w, +2w, +3w
  });

  it('simulates a 20-min timeline over 2 hours: 6 deliveries', () => {
    const rate: DeliveryRate = { amount: 20, unit: 'minute' };
    let lastSent: string | null = null;
    let deliveries = 0;
    // tick every minute for 2h (0..120)
    for (let m = 0; m <= 120; m++) {
      const now = T0 + m * MIN;
      if (shouldDeliverNow(rate, lastSent, now)) {
        deliveries++;
        lastSent = iso(now);
      }
    }
    // t=0, 20, 40, 60, 80, 100, 120 -> 7 deliveries (inclusive boundary at 120)
    expect(deliveries).toBe(7);
  });
});
