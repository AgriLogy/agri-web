/**
 * Conversions affines du PDF PARAMETERAGE
 * `change.the.unite.of.sensors.from.paramtere.user.1.3.pdf` (+ axes évidents).
 * valeur_in_B = valeur_in_A × k + c
 *
 * Affichage : valeur_affichée = valeur_brute_API × a + b (brut exprimé dans l’unité
 * par défaut du catalogue, alignée sur le PDF).
 * Changement d’unité U1→U2 : a' = a×k, b' = b×k + c.
 *
 * MJ/m² : le PDF donne MJ/m² = W/m² × durée_h × 0,0036. Le graphe linéaire W/m²→MJ/m²
 * avec k = 0,0036 correspond donc à une intégration sur 1 h (pas à un échantillon instantané générique).
 */

export type LinearStep = { k: number; c: number };

/** Normalize unit strings for stable matching. */
export function normalizeUnitString(raw: string): string {
  let s = raw.normalize('NFKC').trim().toLowerCase();
  s = s.replace(/\s+/g, '');
  s = s.replace(/²/g, '2');
  s = s.replace(/³/g, '3');
  // degree sign and ordinal º
  s = s.replace(/°|º/g, 'deg');
  // micro sign U+00B5, Greek mu U+03BC
  s = s.replace(/\u00b5|\u03bc/g, 'u');
  // Latin-1 micro sometimes rendered as µ (U+00B5 already); keep ASCII legacy
  s = s.replace(/µ/g, 'u');
  s = s.replace(/\//g, '_');
  return s;
}

/**
 * Map free-form / i18n unit labels to catalogue strings our conversion graph knows.
 * Prevents composeCalibrationWithUnitChange from failing (leaving stale a,b while the label changes).
 */
export function expandUnitLabelForAxisLookup(unit: string): string {
  const t = unit.normalize('NFKC').trim();
  if (!t) return unit;
  const compact = t.replace(/\s+/g, '');
  const tl = t.toLowerCase();

  // ---- débit volumique (m³/h catalogue) : "m³" seul = souvent m³/h en irrigation
  if (/^m(\^3|³|3)$/i.test(compact)) return 'm³/h';
  if (/^m(\^3|³|3)\/h$/i.test(compact)) return 'm³/h';

  // ASCII m^3/h
  if (/^m\^3\/h$/i.test(compact)) return 'm³/h';

  // litres / temps (FR/EN)
  if (
    /lit(?:er|re)s?\/h/i.test(tl) ||
    /^l\/h$/i.test(compact) ||
    /^lph$/i.test(compact)
  ) {
    return 'L/h';
  }
  if (
    /lit(?:er|re)s?\/min/i.test(tl) ||
    /^l\/min$/i.test(compact) ||
    /^lpm$/i.test(compact)
  ) {
    return 'L/min';
  }

  // "liter" / "l" seul : en irrigation, L/min est le débit courant (évite ×60 vs m³/h par rapport à L/h)
  if (/^(l|lit(?:er|re)s?)$/i.test(tl)) return 'L/min';

  return t;
}

/** Internal quantity axis id (not an SI string). */
type Axis =
  | 't_c'
  | 't_f'
  | 't_k'
  | 'm_s'
  | 'kmh'
  | 'w_m2'
  | 'kw_m2'
  | 'mj_m2'
  | 'pa'
  | 'hpa'
  | 'kpa'
  | 'bar'
  | 'mpa'
  | 'us_cm'
  | 'ms_cm'
  | 'ds_m'
  | 'm3_h'
  | 'l_min'
  | 'l_h'
  | 'ml_min'
  | 'm3_ha'
  | 'l_ha'
  | 'mm'
  | 'cm'
  | 'm_len'
  | 'mg_l'
  | 'g_l'
  | 'mg_kg'
  | 'g_kg'
  | 'wh'
  | 'kwh';

/** Map normalized spellings → axis. */
function toAxisId(normalized: string): Axis | null {
  const m: Record<string, Axis> = {
    // temperature
    degc: 't_c',
    celsius: 't_c',
    degf: 't_f',
    fahrenheit: 't_f',
    kelvin: 't_k',
    k: 't_k',
    // wind
    m_s: 'm_s',
    kmh: 'kmh',
    km_h: 'kmh',
    // solar
    w_m2: 'w_m2',
    wm2: 'w_m2',
    kw_m2: 'kw_m2',
    kwm2: 'kw_m2',
    mj_m2: 'mj_m2',
    mjm2: 'mj_m2',
    // pressure
    pa: 'pa',
    hpa: 'hpa',
    mbar: 'hpa',
    bar: 'bar',
    kpa: 'kpa',
    mpa: 'mpa',
    // EC
    us_cm: 'us_cm',
    uscm: 'us_cm',
    uc_cm: 'us_cm',
    ms_cm: 'ms_cm',
    mscm: 'ms_cm',
    ds_m: 'ds_m',
    dsm: 'ds_m',
    // flow (time)
    m3_h: 'm3_h',
    m3h: 'm3_h',
    l_min: 'l_min',
    lmin: 'l_min',
    l_h: 'l_h',
    lh: 'l_h',
    ml_min: 'ml_min',
    mlmin: 'ml_min',
    // irrigation / ha
    m3_ha: 'm3_ha',
    m3ha: 'm3_ha',
    l_ha: 'l_ha',
    lha: 'l_ha',
    // length (fruit, level…)
    mm: 'mm',
    cm: 'cm',
    m: 'm_len',
    // concentrations
    mg_l: 'mg_l',
    mgl: 'mg_l',
    g_l: 'g_l',
    gl: 'g_l',
    mg_kg: 'mg_kg',
    mgkg: 'mg_kg',
    g_kg: 'g_kg',
    gkg: 'g_kg',
    // energy
    wh: 'wh',
    kwh: 'kwh',
    kw_h: 'kwh',
  };
  return m[normalized] ?? null;
}

export function axisIdFromUnitLabel(unit: string): Axis | null {
  const expanded = expandUnitLabelForAxisLookup(unit);
  return toAxisId(normalizeUnitString(expanded));
}

type Adj = Array<{ to: Axis; k: number; c: number }>;

function buildAdjacency(): Map<Axis, Adj> {
  const edges: Array<{ from: Axis; to: Axis; k: number; c: number }> = [
    // PDF — température
    { from: 't_c', to: 't_f', k: 1.8, c: 32 },
    { from: 't_c', to: 't_k', k: 1, c: 273.15 },
    // PDF — vent km/h = m/s × 3.6
    { from: 'm_s', to: 'kmh', k: 3.6, c: 0 },
    // kW/m² ↔ W/m² (same axis family as graph calibration: raw API is W/m²)
    { from: 'w_m2', to: 'kw_m2', k: 0.001, c: 0 },
    // PDF — MJ/m² = W/m² × durée_h × 0,0036 → facteur 0,0036 = cas durée = 1 h
    { from: 'w_m2', to: 'mj_m2', k: 0.0036, c: 0 },
    // PDF — pression météo
    { from: 'hpa', to: 'bar', k: 0.001, c: 0 },
    { from: 'hpa', to: 'kpa', k: 0.1, c: 0 },
    { from: 'pa', to: 'hpa', k: 0.01, c: 0 },
    { from: 'kpa', to: 'mpa', k: 0.001, c: 0 },
    // PDF — EC
    { from: 'us_cm', to: 'ms_cm', k: 0.001, c: 0 },
    { from: 'us_cm', to: 'ds_m', k: 0.001, c: 0 },
    { from: 'ms_cm', to: 'ds_m', k: 1, c: 0 },
    // PDF — débit L/min = m³/h × 1000/60
    { from: 'm3_h', to: 'l_min', k: 1000 / 60, c: 0 },
    // m³/h ↔ L/h : 1 m³/h = 1000 L/h
    { from: 'm3_h', to: 'l_h', k: 1000, c: 0 },
    // mL/min ↔ L/min
    { from: 'ml_min', to: 'l_min', k: 0.001, c: 0 },
    // PDF — irrigation L/ha = m³/ha × 1000
    { from: 'm3_ha', to: 'l_ha', k: 1000, c: 0 },
    // PDF — eau bar = kPa/100
    { from: 'kpa', to: 'bar', k: 0.01, c: 0 },
    // PDF — fruit / niveau
    { from: 'mm', to: 'cm', k: 0.1, c: 0 },
    { from: 'm_len', to: 'cm', k: 100, c: 0 },
    // PDF — salinité / NPK
    { from: 'mg_l', to: 'g_l', k: 0.001, c: 0 },
    { from: 'mg_kg', to: 'g_kg', k: 0.001, c: 0 },
    // PDF — électricité kWh = Wh/1000
    { from: 'wh', to: 'kwh', k: 0.001, c: 0 },
  ];

  const adj = new Map<Axis, Adj>();
  const add = (from: Axis, to: Axis, k: number, c: number) => {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push({ to, k, c });
  };

  for (const { from, to, k, c } of edges) {
    add(from, to, k, c);
    if (k !== 0) {
      add(to, from, 1 / k, -c / k);
    }
  }
  return adj;
}

const ADJ = buildAdjacency();

/**
 * Affine step from display unit `unitFrom` to `unitTo`: v_to = k × v_from + c.
 * Uses BFS on the conversion graph when there is no single direct edge.
 */
export function getLinearStepBetweenUnits(
  unitFrom: string,
  unitTo: string
): LinearStep | null {
  const start = axisIdFromUnitLabel(unitFrom.trim());
  const end = axisIdFromUnitLabel(unitTo.trim());
  if (!start || !end) return null;
  if (start === end) return { k: 1, c: 0 };

  type State = { axis: Axis; k: number; c: number };
  const visited = new Set<Axis>();
  const queue: State[] = [{ axis: start, k: 1, c: 0 }];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.axis === end) {
      return { k: cur.k, c: cur.c };
    }
    if (visited.has(cur.axis)) continue;
    visited.add(cur.axis);

    const nexts = ADJ.get(cur.axis);
    if (!nexts) continue;

    for (const { to, k: ke, c: ce } of nexts) {
      const nk = ke * cur.k;
      const nc = ke * cur.c + ce;
      queue.push({ axis: to, k: nk, c: nc });
    }
  }

  return null;
}

/**
 * If direct A→B is unknown (labels differ but same physics), try
 * A←D and B←D where D is the catalogue default unit for that sensor.
 * v_B = (k_BD/k_AD) × v_A + (c_BD - k_BD×c_AD/k_AD).
 */
export function getLinearStepBetweenUnitsWithFallback(
  unitFrom: string,
  unitTo: string,
  catalogDefaultUnit?: string
): LinearStep | null {
  const direct = getLinearStepBetweenUnits(unitFrom, unitTo);
  if (direct) return direct;
  if (!catalogDefaultUnit?.trim()) return null;
  const sA = getLinearStepBetweenUnits(catalogDefaultUnit, unitFrom);
  const sB = getLinearStepBetweenUnits(catalogDefaultUnit, unitTo);
  if (!sA || !sB || sA.k === 0) return null;
  return {
    k: sB.k / sA.k,
    c: sB.c - (sB.k * sA.c) / sA.k,
  };
}

/**
 * When the user changes display unit, update calibration so that
 * valeur_affichée = brut × a + b stays coherent (PDF).
 *
 * @param catalogDefaultUnit optional catalogue default for this row (e.g. °C, km/h) to resolve synonyms
 */
export function composeCalibrationWithUnitChange(
  prevScaleA: number,
  prevOffsetB: number,
  oldUnit: string,
  newUnit: string,
  catalogDefaultUnit?: string
): { scaleA: number; offsetB: number } {
  const step =
    getLinearStepBetweenUnits(oldUnit, newUnit) ??
    getLinearStepBetweenUnitsWithFallback(oldUnit, newUnit, catalogDefaultUnit);
  if (!step) {
    return { scaleA: prevScaleA, offsetB: prevOffsetB };
  }
  return {
    scaleA: prevScaleA * step.k,
    offsetB: prevOffsetB * step.k + step.c,
  };
}

/**
 * Return only units compatible with `baseUnit`.
 * If `baseUnit` is not in the conversion graph (e.g. %, pH), keep only itself.
 */
export function getCompatibleUnitOptions(
  baseUnit: string,
  candidates: string[]
): string[] {
  const base = baseUnit.trim();
  if (!base) return [];

  const out = new Set<string>([base]);
  const baseAxis = axisIdFromUnitLabel(base);

  for (const raw of candidates) {
    const candidate = raw.trim();
    if (!candidate) continue;

    if (normalizeUnitString(candidate) === normalizeUnitString(base)) {
      out.add(candidate);
      continue;
    }

    if (!baseAxis) continue;
    if (getLinearStepBetweenUnits(base, candidate)) out.add(candidate);
  }

  return [...out].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );
}
