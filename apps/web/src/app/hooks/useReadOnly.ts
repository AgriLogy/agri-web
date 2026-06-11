'use client';

import { useEffect, useState } from 'react';

/**
 * True when the logged-in user is a technician (scoped read-only access).
 * Technicians may view granted zones/graphs but never write — UI write
 * controls should hide/disable when this is true. The server enforces the
 * boundary regardless (see agriapi.api.scope); this is a UX nicety.
 */
export function useReadOnly(): boolean {
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const read = () =>
      setReadOnly(localStorage.getItem('isTechnician') === '1');
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  return readOnly;
}
