'use client';

import React from 'react';
import { Tooltip as AntdTooltip } from 'antd';
import { Tooltip as ChakraTooltip } from '@chakra-ui/react';

/**
 * Disable-with-reason wrapper for RBAC action controls (agri-web #99).
 *
 * A single place for the "prefer disabled + tooltip for discoverability"
 * pattern, so no component reinvents it (and no tier string leaks past the
 * `useCan` helper). When `blocked`, the child control is disabled via the prop
 * name its UI library understands (`disabled` for AntD, `isDisabled` for
 * Chakra) and a tooltip explains why; when not, the child renders untouched.
 *
 * ⚠ UX only — the server still enforces the tier. A keyboard user who reaches a
 * disabled control and forces the write simply gets the 403 handler's message.
 */
export function PermissionGate({
  blocked,
  reason,
  ui,
  children,
}: {
  blocked: boolean;
  reason: string;
  ui: 'antd' | 'chakra';
  children: React.ReactElement;
}) {
  if (!blocked) return children;

  const disabledProp =
    ui === 'antd' ? { disabled: true } : { isDisabled: true };
  const child = React.cloneElement(
    children,
    disabledProp as Partial<unknown> as never
  );

  if (ui === 'antd') {
    return (
      <AntdTooltip title={reason}>
        <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>
          {child}
        </span>
      </AntdTooltip>
    );
  }

  return (
    <ChakraTooltip label={reason} hasArrow shouldWrapChildren>
      {child}
    </ChakraTooltip>
  );
}
