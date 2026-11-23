import {
  guardReadOnlySelect,
  READ_ONLY_BLOCKED_HANDLERS,
  STATIC_DRAW_MODE,
  staticDrawMode,
} from './drawModes';

function fakeSelect() {
  const calls: string[] = [];
  const mode: Record<string, (...a: unknown[]) => unknown> = {
    onSetup: () => {
      calls.push('onSetup');
      return {};
    },
    onClick: () => calls.push('onClick'),
    clickOnFeature: () => calls.push('clickOnFeature'),
  };
  for (const k of READ_ONLY_BLOCKED_HANDLERS)
    mode[k] = () => {
      calls.push(k);
      return k;
    };
  return { mode, calls };
}

describe('staticDrawMode', () => {
  it('has a distinct name and disables every action', () => {
    expect(STATIC_DRAW_MODE).not.toMatch(/^(simple|direct)_select$/);
    const setActionableState = jest.fn();
    expect(staticDrawMode.onSetup.call({ setActionableState })).toEqual({});
    expect(setActionableState).toHaveBeenCalledWith({
      trash: false,
      combineFeatures: false,
      uncombineFeatures: false,
    });
  });

  it('displays features unchanged and defines no click/drag handlers', () => {
    const display = jest.fn();
    const g = { type: 'Feature' };
    staticDrawMode.toDisplayFeatures({}, g, display);
    expect(display).toHaveBeenCalledWith(g);
    for (const k of ['onClick', 'onMouseDown', 'onDrag', 'onTap', 'onTrash'])
      expect(staticDrawMode).not.toHaveProperty(k);
  });
});

describe('guardReadOnlySelect', () => {
  it('passes everything through for an editor', () => {
    const { mode, calls } = fakeSelect();
    const g = guardReadOnlySelect(mode, () => false) as typeof mode;
    for (const k of READ_ONLY_BLOCKED_HANDLERS) expect(g[k]!()).toBe(k);
    g.clickOnFeature!.call(
      { isSelected: () => true },
      {},
      { featureTarget: { properties: { id: 'a' } } }
    );
    expect(calls).toEqual([...READ_ONLY_BLOCKED_HANDLERS, 'clickOnFeature']);
  });

  it('blocks drag, vertex edit, delete and combine when read-only', () => {
    const { mode, calls } = fakeSelect();
    const g = guardReadOnlySelect(mode, () => true) as typeof mode;
    for (const k of READ_ONLY_BLOCKED_HANDLERS) expect(g[k]!()).toBeUndefined();
    expect(calls).toEqual([]);
    // Non-editing handlers are untouched.
    g.onSetup!();
    g.onClick!();
    expect(calls).toEqual(['onSetup', 'onClick']);
  });

  it('still selects a sector read-only, but never enters direct_select', () => {
    const { mode, calls } = fakeSelect();
    const g = guardReadOnlySelect(mode, () => true) as typeof mode;
    const ev = { featureTarget: { properties: { id: 'a' } } };
    g.clickOnFeature!.call({ isSelected: () => false }, {}, ev);
    expect(calls).toEqual(['clickOnFeature']);
    g.clickOnFeature!.call({ isSelected: () => true }, {}, ev);
    expect(calls).toEqual(['clickOnFeature']);
  });

  it('re-reads the tier on every event', () => {
    const { mode, calls } = fakeSelect();
    let ro = true;
    const g = guardReadOnlySelect(mode, () => ro) as typeof mode;
    g.onDrag!();
    ro = false;
    g.onDrag!();
    expect(calls).toEqual(['onDrag']);
  });

  it('does not mutate the base mode', () => {
    const { mode } = fakeSelect();
    const before = mode.onDrag;
    guardReadOnlySelect(mode, () => true);
    expect(mode.onDrag).toBe(before);
  });
});
