import mapboxgl from 'mapbox-gl';
import { SENSOR_TYPES } from '@/app/utils/sensorTypes';

/** Raster size for crisp small symbols when scaled down in the style. */
const SIZE = 96;

/**
 * Minimal line icons (viewBox 64×64): high contrast on satellite; readable when small.
 * Stroke-aligned where possible for a consistent “UI kit” look.
 */
const INNER_SVG: Record<string, string> = {
  soil_moisture: `<path fill="#ffffff" d="M32 15c4.2 6.2 9.5 13.8 9.5 20.8a9.5 9.5 0 1 1-19 0c0-7 5.3-14.6 9.5-20.8z"/>`,
  soil_temperature: `<g fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 17v20"/><circle cx="32" cy="41" r="5"/></g>`,
  air_temperature: `<g stroke="#ffffff" stroke-width="2" stroke-linecap="round"><circle cx="32" cy="32" r="6.5" fill="#ffffff" stroke="none"/><path d="M32 14.5v4M32 45.5v4M14.5 32h4M45.5 32h4"/></g>`,
  humidity_air: `<path fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" d="M15 29c4-2.2 9 2.2 17 0s13-2.2 17 0M15 36c4-2.2 9 2.2 17 0s13-2.2 17 0"/>`,
  weather_station: `<g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 44V21"/><rect x="26" y="15" width="12" height="8" rx="1.5"/><path d="M23.5 19h17"/></g>`,
  water_level: `<g fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"><rect x="18" y="19" width="28" height="26" rx="2"/><path stroke-linecap="round" d="M20 34.5c3.5-2 7 2.2 12 0s8.5-2 12 0"/></g>`,
  flow_meter: `<g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"><circle cx="32" cy="32" r="10.5"/><path d="M27.5 32h10"/><path d="M34 26.5l6 5.5-6 5.5"/></g>`,
  pressure: `<g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"><path d="M21.5 39a10.5 10.5 0 0 1 21 0"/><path d="M32 39V27"/><circle cx="32" cy="39" r="1.8" fill="#ffffff"/></g>`,
  ec_soil: `<path fill="#ffffff" d="M35 14L27.5 28h5.2L28 43.5 39.5 29h-5.3L35 14z"/>`,
  ph_soil: `<g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M26 17h12l-1.2 21H27.2z"/><path d="M26 17l-3.2-5.5M38 17l3.2-5.5"/></g>`,
};

export function sensorMapImageId(typeId: string): string {
  return `agrilogy-sensor-${typeId}`;
}

function buildSvg(typeId: string, color: string): string {
  const inner =
    INNER_SVG[typeId] ?? `<circle cx="32" cy="32" r="8" fill="#ffffff"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${SIZE}" height="${SIZE}">
  <circle cx="32" cy="32" r="28.5" fill="${color}" stroke="rgba(255,255,255,0.95)" stroke-width="2"/>
  ${inner}
</svg>`;
}

async function svgToImageBitmap(svg: string): Promise<ImageBitmap> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context');
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    URL.revokeObjectURL(url);
    return await createImageBitmap(canvas);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

const DEFAULT_IMAGE_ID = 'agrilogy-sensor-default';

/** Mapbox `match` for symbol layout `icon-image`. */
export function sensorTypeIconImageMatchExpression(): unknown[] {
  const pairs: unknown[] = [];
  for (const t of SENSOR_TYPES) {
    pairs.push(t.id, sensorMapImageId(t.id));
  }
  pairs.push(DEFAULT_IMAGE_ID);
  return ['match', ['get', 'sensorType'], ...pairs];
}

/**
 * Load raster icons into the map style (call once after style is loaded, before the symbol layer).
 */
export async function registerSensorMapImages(
  map: mapboxgl.Map
): Promise<void> {
  for (const t of SENSOR_TYPES) {
    const id = sensorMapImageId(t.id);
    if (map.hasImage(id)) continue;
    const bmp = await svgToImageBitmap(buildSvg(t.id, t.color));
    map.addImage(id, bmp, { pixelRatio: 1 });
  }
  if (!map.hasImage(DEFAULT_IMAGE_ID)) {
    const bmp = await svgToImageBitmap(buildSvg('unknown', '#64748b'));
    map.addImage(DEFAULT_IMAGE_ID, bmp, { pixelRatio: 1 });
  }
}
