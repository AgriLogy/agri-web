/**
 * mapbox-gl-draw mode helpers for the farm map. Pure: the Draw modes are plain
 * objects of handlers, so these wrap or define them without importing Draw
 * (testable under jest with fake modes).
 *
 * - `staticDrawMode`: Draw ignores every click / drag. Used while the measure
 *   tool is on (QA A4) so a click inside a sector adds a measure point instead
 *   of selecting the sector and opening its panel.
 * - `guardReadOnlySelect`: simple_select that still selects a sector (to open
 *   its read-only panel) but never moves, reshapes or deletes one while
 *   `isReadOnly()` holds (technician / monitor logins, QA A2).
 */

/** Name the static mode is registered under. */
export const STATIC_DRAW_MODE = 'agrilogy_static';

interface ModeThis {
  setActionableState: (actions?: {
    trash?: boolean;
    combineFeatures?: boolean;
    uncombineFeatures?: boolean;
  }) => void;
}

/** A Draw mode that displays the features and reacts to nothing. */
export const staticDrawMode = {
  onSetup(this: ModeThis) {
    this.setActionableState({
      trash: false,
      combineFeatures: false,
      uncombineFeatures: false,
    });
    return {};
  },
  toDisplayFeatures(
    _state: unknown,
    geojson: unknown,
    display: (g: unknown) => void
  ) {
    display(geojson);
  },
};

/**
 * simple_select handlers that edit: start / perform a drag-move, enter
 * direct_select through a vertex, delete or (un)combine.
 */
export const READ_ONLY_BLOCKED_HANDLERS = [
  'onMouseDown',
  'onTouchStart',
  'onDrag',
  'clickOnVertex',
  'onTrash',
  'onCombineFeatures',
  'onUncombineFeatures',
] as const;

type Handler = (this: unknown, ...args: unknown[]) => unknown;

interface ClickEvent {
  featureTarget?: { properties?: { id?: unknown } };
}

/**
 * `base` (Draw's simple_select) with its editing handlers turned into no-ops
 * while `isReadOnly()` is true. Clicking an already-selected sector would
 * enter direct_select (vertex editing): that click is ignored too, so the
 * sector just stays selected. Checked on every event, so a tier that resolves
 * after the map was built takes effect immediately.
 */
export function guardReadOnlySelect<M extends object>(
  base: M,
  isReadOnly: () => boolean
): M {
  const src = base as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  for (const key of READ_ONLY_BLOCKED_HANDLERS) {
    const fn = src[key];
    if (typeof fn !== 'function') continue;
    out[key] = function (this: unknown, ...args: unknown[]) {
      if (isReadOnly()) return undefined;
      return (fn as Handler).apply(this, args);
    };
  }
  const click = src.clickOnFeature;
  if (typeof click === 'function') {
    out.clickOnFeature = function (
      this: { isSelected?: (id: string) => boolean },
      state: unknown,
      e: ClickEvent
    ) {
      const id = e?.featureTarget?.properties?.id;
      if (isReadOnly() && id != null && this.isSelected?.(String(id))) {
        return undefined;
      }
      return (click as Handler).call(this, state, e);
    };
  }
  return out as M;
}
