const PREFIX = 'farmZoneImage:';

export function getFarmImageDataUrl(zoneId: number): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${PREFIX}${zoneId}`);
}

export function setFarmImageDataUrl(zoneId: number, dataUrl: string | null) {
  if (typeof window === 'undefined') return;
  const k = `${PREFIX}${zoneId}`;
  if (dataUrl) localStorage.setItem(k, dataUrl);
  else localStorage.removeItem(k);
}
