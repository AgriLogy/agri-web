'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Collapse,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Text,
  VStack,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useCan } from '@/app/hooks/useAccessLevel';
import { ensureSectorColorsOnDraw } from '@/app/utils/ensureSectorColorsOnDraw';
import {
  FARM_SENSORS_LAYER_ID,
  FARM_SENSORS_SOURCE_ID,
  loadFarmSensors,
} from '@/app/utils/farmSensorsStorage';
import {
  loadFarmSectors,
  type FarmSectorFeatureCollection,
} from '@/app/utils/farmSectorsStorage';
import { escapeHtml } from '@/app/utils/htmlEscape';
import { colorForSectorIndex, isHexColor } from '@/app/utils/sectorColors';
import { sectorMapDrawStyles } from '@/app/utils/sectorMapDrawStyles';
import { findContainingSector } from '@/app/utils/sectorZoneLookup';
import {
  registerSensorMapImages,
  sensorTypeIconImageMatchExpression,
} from '@/app/utils/sensorMapIcons';
import {
  SENSOR_TYPES,
  getSensorTypeMeta,
  sensorTypeI18nKey,
} from '@/app/utils/sensorTypes';
import { sensorCountsBySector } from '@/app/utils/sectorSensorCounts';
import { myDevicesApi, devicesToGeoJSON } from '@agri/api-client/myDevicesApi';
import {
  farmMapApi,
  type Basemap,
  type FarmMapStatus,
  type LayerPref,
  type MapPreferences,
  type MapSector,
  type SensorInstallation,
  type SensorInstallationWrite,
  type SectorWrite,
  type SensorKeyOption,
  type ZoneOption,
} from '@agri/api-client/farmMapApi';
import {
  applyStatusToFeatures,
  BASEMAPS,
  boundsOf,
  formatArea,
  formatReading,
  GeoJSONImportError,
  installationToFeature,
  isBasemap,
  legacySensorsToWrites,
  parseSectorImport,
  readingAge,
  sectorToDrawFeature,
  sectorsToGeoJSON,
  statusColorExpression,
  STATUS_COLORS,
  type LngLatBounds,
  type SensorFeatureProps,
} from '@/app/lib/farmMap/mapModel';
import {
  diffSectors,
  isCompleteSectorGeometry,
  sectorFingerprint,
  type SyncedSector,
} from '@/app/lib/farmMap/sectorSync';
import MapLayerPanel, {
  DEFAULT_LAYER_PREFS,
  MAP_LAYERS,
  type MapLayerId,
} from './MapLayerPanel';
import SectorDetailsPanel from './SectorDetailsPanel';
import {
  NO_SENSOR_FILTER,
  isFiltering,
  matchesSensorFilter,
  sensorFilterExpression,
  toggleIn,
  type SensorFilter,
} from '@/app/lib/farmMap/sensorFilter';
import {
  formatAreaM2,
  formatDistance,
  pathLengthM,
  polygonAreaM2,
} from '@/app/lib/farmMap/measure';
import type { NdviOverlay } from './SectorNdviPanel';
import { bboxCorners } from '@/app/lib/farmMap/ndvi';
import SensorInstallationModal, {
  type SensorModalTarget,
} from './SensorInstallationModal';

const LABEL_SOURCE_ID = 'agrilogy-sector-labels';
const LABEL_LAYER_ID = 'agrilogy-sector-labels-symbol';
const SENSORS_HALO_LAYER_ID = 'agrilogy-sensors-halo';
const SENSOR_NAMES_LAYER_ID = 'agrilogy-sensors-names';
// Zoomed out past CLUSTER_UNTIL_ZOOM, sensors merge into numbered clusters.
const SENSOR_CLUSTER_SOURCE_ID = 'agrilogy-sensors-cluster';
const SENSOR_CLUSTER_LAYER_ID = 'agrilogy-sensors-cluster-circles';
const SENSOR_CLUSTER_COUNT_LAYER_ID = 'agrilogy-sensors-cluster-count';
const SENSOR_CLUSTER_POINT_LAYER_ID = 'agrilogy-sensors-cluster-point';
const CLUSTER_UNTIL_ZOOM = 13;
const SENSOR_TYPE_IDS = SENSOR_TYPES.map((x) => x.id as string);
const SENSOR_STATUS_IDS = [
  'normal',
  'warning',
  'critical',
  'offline',
  'no_data',
  'unlinked',
];
const FILTERED_SENSOR_LAYERS = [
  SENSORS_HALO_LAYER_ID,
  FARM_SENSORS_LAYER_ID,
  SENSOR_NAMES_LAYER_ID,
];
const SECTOR_STATUS_SOURCE_ID = 'agrilogy-sector-status';
const SECTOR_STATUS_LAYER_ID = 'agrilogy-sector-status-fill';
// Real registered devices, plotted at their captured GPS position (MAP-1),
// distinct from the placed sensor installations.
const REGISTERED_DEVICES_SOURCE_ID = 'agrilogy-registered-devices';
const REGISTERED_DEVICES_LAYER_ID = 'agrilogy-registered-devices-markers';
/** Mapbox Draw renders each style twice (`.cold` / `.hot`). */
const DRAW_FILL_LAYERS = [
  'gl-draw-polygon-fill.cold',
  'gl-draw-polygon-fill.hot',
];
const DRAW_LINE_LAYERS = ['gl-draw-lines.cold', 'gl-draw-lines.hot'];

const LEGACY_SECTORS_KEY = 'agrilogy-farm-sectors-v1';
const LEGACY_SENSORS_KEY = 'agrilogy-farm-sensors-v1';
const STATUS_POLL_MS = 60_000;
const SENSOR_LABEL_MIN_ZOOM = 15;

type SensorFeature = GeoJSON.Feature<GeoJSON.Point, SensorFeatureProps>;
type SensorFC = GeoJSON.FeatureCollection<GeoJSON.Point, SensorFeatureProps>;

const emptyFC = (): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
});

/** Move a legacy localStorage entry aside once it has been imported. */
function retireLegacyKey(key: string) {
  try {
    const v = localStorage.getItem(key);
    if (v != null) {
      localStorage.setItem(`${key}.migrated`, v);
      localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable — the import is idempotent anyway */
  }
}

function apiErrorDetail(e: unknown): { status?: number; detail?: string } {
  const r = (
    e as { response?: { status?: number; data?: { detail?: unknown } } }
  )?.response;
  const d = r?.data?.detail;
  return { status: r?.status, detail: typeof d === 'string' ? d : undefined };
}

function isValidLngLatPair(c: unknown): c is [number, number] {
  return (
    Array.isArray(c) &&
    c.length >= 2 &&
    typeof c[0] === 'number' &&
    typeof c[1] === 'number' &&
    Number.isFinite(c[0]) &&
    Number.isFinite(c[1])
  );
}

/** Average of ring vertices; null if ring missing or only invalid coords. */
function ringCentroid(
  ring: number[][] | null | undefined
): [number, number] | null {
  if (!ring?.length) return null;
  let lon = 0;
  let lat = 0;
  let n = 0;
  for (const c of ring) {
    if (!isValidLngLatPair(c)) continue;
    lon += c[0];
    lat += c[1];
    n += 1;
  }
  if (n === 0) return null;
  return [lon / n, lat / n];
}

function sectorFeatureCentroid(f: GeoJSON.Feature): [number, number] | null {
  const g = f.geometry;
  if (g.type === 'Polygon') return ringCentroid(g.coordinates[0]);
  if (g.type === 'MultiPolygon') {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const poly of g.coordinates) {
      const cen = ringCentroid(poly[0]);
      if (cen) {
        sx += cen[0];
        sy += cen[1];
        n += 1;
      }
    }
    return n === 0 ? null : [sx / n, sy / n];
  }
  return null;
}

function isPolygonFeature(f: GeoJSON.Feature): boolean {
  return f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon';
}

/**
 * One label per sector polygon: "Name · 2.41 ha · 3 capteurs".
 * `extraByDrawId` carries the server-computed area.
 */
function buildLabelFeatures(
  fc: FarmSectorFeatureCollection,
  counts: Map<string, number>,
  countSuffix: (n: number) => string,
  extraByDrawId: Map<string, string>
): GeoJSON.Feature[] {
  const out: GeoJSON.Feature[] = [];
  for (const f of fc.features) {
    const halo =
      f.properties && isHexColor((f.properties as { color?: unknown }).color)
        ? (f.properties as { color: string }).color
        : '#1a3d1a';
    const name =
      (f.properties &&
        typeof f.properties.name === 'string' &&
        f.properties.name) ||
      'Secteur';
    const n = counts.get(name) ?? 0;
    const extra = f.id != null ? extraByDrawId.get(String(f.id)) : undefined;
    const label = `${name}${extra ? ` · ${extra}` : ''}${n > 0 ? countSuffix(n) : ''}`;
    const rings =
      f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates[0]]
        : f.geometry.type === 'MultiPolygon'
          ? f.geometry.coordinates.map((p) => p[0])
          : [];
    for (const ring of rings) {
      const centroid = ringCentroid(ring);
      if (!centroid) continue;
      out.push({
        type: 'Feature',
        properties: { name: label, halo },
        geometry: { type: 'Point', coordinates: centroid },
      });
    }
  }
  return out;
}

/** Recompute which drawn sector contains each sensor (mutates). */
function reassignSensorZones(
  sensors: SensorFC,
  sectorFeatures: GeoJSON.Feature[]
) {
  for (const f of sensors.features) {
    const z = findContainingSector(
      f.geometry.coordinates[0],
      f.geometry.coordinates[1],
      sectorFeatures
    );
    f.properties.zoneId = z?.zoneId ?? '';
    f.properties.zoneName = z?.zoneName ?? '';
  }
}

/**
 * When a sector moves, shift the sensors that belong to it by the same
 * centroid delta so markers stay aligned with their sector.
 */
function shiftSensorsWithSectorMotion(
  sensors: SensorFC,
  sectorPolyFeatures: GeoJSON.Feature[],
  centroidPrevBySectorId: Map<string, [number, number]>
) {
  const next = new Map<string, [number, number]>();
  for (const f of sectorPolyFeatures) {
    const id = f.id != null ? String(f.id) : '';
    if (!id) continue;
    const c = sectorFeatureCentroid(f);
    if (!c) continue;
    next.set(id, c);
    const prev = centroidPrevBySectorId.get(id);
    if (prev) {
      const dLng = c[0] - prev[0];
      const dLat = c[1] - prev[1];
      if (Math.abs(dLng) > 1e-9 || Math.abs(dLat) > 1e-9) {
        for (const sf of sensors.features) {
          if (sf.properties.zoneId === id) {
            sf.geometry.coordinates[0] += dLng;
            sf.geometry.coordinates[1] += dLat;
          }
        }
      }
    }
  }
  centroidPrevBySectorId.clear();
  next.forEach((v, k) => centroidPrevBySectorId.set(k, v));
}

function setSourceData(
  map: mapboxgl.Map,
  id: string,
  data: GeoJSON.FeatureCollection
) {
  (map.getSource(id) as mapboxgl.GeoJSONSource | undefined)?.setData(data);
}

function setVisibility(map: mapboxgl.Map, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

function setPaint(
  map: mapboxgl.Map,
  layerId: string,
  prop: string,
  value: unknown
) {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, prop as never, value as never);
  }
}

/** Push the layer panel state onto the map (idempotent; tolerates missing layers). */
function applyLayerPrefs(
  map: mapboxgl.Map,
  prefs: Record<MapLayerId, LayerPref>
) {
  const s = prefs.sectors;
  for (const id of [...DRAW_FILL_LAYERS, ...DRAW_LINE_LAYERS])
    setVisibility(map, id, s.visible);
  for (const id of DRAW_FILL_LAYERS)
    setPaint(map, id, 'fill-opacity', 0.38 * s.opacity);
  for (const id of DRAW_LINE_LAYERS)
    setPaint(map, id, 'line-opacity', s.opacity);

  setVisibility(map, SECTOR_STATUS_LAYER_ID, prefs.sector_status.visible);
  setPaint(
    map,
    SECTOR_STATUS_LAYER_ID,
    'fill-opacity',
    0.55 * prefs.sector_status.opacity
  );

  setVisibility(map, LABEL_LAYER_ID, prefs.labels.visible);

  const sn = prefs.sensors;
  setVisibility(map, SENSORS_HALO_LAYER_ID, sn.visible);
  setVisibility(map, FARM_SENSORS_LAYER_ID, sn.visible);
  setPaint(map, SENSORS_HALO_LAYER_ID, 'circle-opacity', 0.75 * sn.opacity);
  setPaint(map, SENSORS_HALO_LAYER_ID, 'circle-stroke-opacity', sn.opacity);
  setPaint(map, FARM_SENSORS_LAYER_ID, 'icon-opacity', sn.opacity);

  setVisibility(
    map,
    SENSOR_NAMES_LAYER_ID,
    sn.visible && prefs.sensor_names.visible
  );
  setVisibility(map, REGISTERED_DEVICES_LAYER_ID, prefs.devices.visible);
}

function mergeLayerPrefs(
  saved: Record<string, LayerPref> | undefined
): Record<MapLayerId, LayerPref> {
  const out = { ...DEFAULT_LAYER_PREFS };
  for (const { id } of MAP_LAYERS) {
    const p = saved?.[id];
    if (p && typeof p.visible === 'boolean' && typeof p.opacity === 'number') {
      out[id] = {
        visible: p.visible,
        opacity: Math.min(1, Math.max(0.1, p.opacity)),
      };
    }
  }
  return out;
}

function applyBasemapConfig(map: mapboxgl.Map, basemap: Basemap) {
  const config = BASEMAPS[basemap].config;
  if (!config) return;
  for (const [key, value] of Object.entries(config)) {
    try {
      map.setConfigProperty('basemap', key, value);
    } catch {
      /* property not supported by this style version — ignore */
    }
  }
}

interface AgricultureMapboxMapProps {
  lat: number;
  lon: number;
  showToolsPanel?: boolean;
  /** Stretch to the parent's height (e.g. inside the expanded-map modal)
   *  instead of sizing to content; the map canvas takes the leftover space. */
  fillHeight?: boolean;
}

export default function AgricultureMapboxMap({
  lat,
  lon,
  showToolsPanel = true,
  fillHeight = false,
}: AgricultureMapboxMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
  // Read-only tiers (monitor) get no drawing/save/delete tools (#99), but
  // keep the basemap, layers and camera controls.
  const { canEdit } = useCan();
  const toolsEnabled = showToolsPanel && canEdit;
  const canEditRef = useRef(canEdit);
  useEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingNameRef = useRef('');
  const sectorIndexRef = useRef(1);
  const sensorsFcRef = useRef<SensorFC>({
    type: 'FeatureCollection',
    features: [],
  });
  const devicesFcRef = useRef<GeoJSON.FeatureCollection>(emptyFC());
  const placingSensorTypeRef = useRef<string | null>(null);
  const bumpSensorListRef = useRef<() => void>(() => {});
  const setSelectedSensorIdRef = useRef<(id: string | null) => void>(() => {});
  const selectedSensorIdRef = useRef<string | null>(null);
  const sectorCentroidPrevRef = useRef<Map<string, [number, number]>>(
    new Map()
  );
  const syncSectorsAndSensorsRef = useRef<(() => void) | null>(null);

  // --- server sync state -------------------------------------------------
  /** drawId → last server acknowledgement for that sector. */
  const syncedSectorsRef = useRef(new Map<string, SyncedSector>());
  const inFlightSectorsRef = useRef(new Set<string>());
  /** server sector id → row (area, perimeter, crop details). */
  const sectorRowsRef = useRef(new Map<number, MapSector>());
  /** installation id → row. */
  const installationsRef = useRef(new Map<number, SensorInstallation>());
  /** installation id → last saved position + sector. */
  const syncedSensorRef = useRef(
    new Map<number, { lng: number; lat: number; sectorId: number | null }>()
  );
  const serverSyncEnabledRef = useRef(false);
  const syncRunningRef = useRef(false);
  const syncAgainRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const legacySensorsRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const migratingSectorsRef = useRef(false);
  const statusRef = useRef<FarmMapStatus | null>(null);
  const runServerSyncRef = useRef<() => Promise<void>>(async () => {});
  const refreshStatusRef = useRef<() => Promise<void>>(async () => {});

  // --- preferences -------------------------------------------------------
  const basemapRef = useRef<Basemap>('satellite_labels');
  const layerPrefsRef = useRef<Record<MapLayerId, LayerPref>>({
    ...DEFAULT_LAYER_PREFS,
  });
  const prefsTimerRef = useRef<number | null>(null);
  const pendingPrefsRef = useRef<Partial<MapPreferences>>({});
  const cameraReadyRef = useRef(false);

  const [nextSectorName, setNextSectorName] = useState('');
  const [drawMode, setDrawMode] = useState<string>('simple_select');
  // Undo / redo of sector edits (draw, move, reshape, delete, rename).
  const historyRef = useRef<{ past: string[]; future: string[] }>({
    past: [],
    future: [],
  });
  const lastSnapshotRef = useRef<string | null>(null);
  const restoringRef = useRef(false);
  const [historyDepth, setHistoryDepth] = useState({ past: 0, future: 0 });
  const [sensorFilter, setSensorFilter] =
    useState<SensorFilter>(NO_SENSOR_FILTER);
  const sensorFilterRef = useRef<SensorFilter>(NO_SENSOR_FILTER);
  // Measure tool: clicks add points; shows path length and enclosed area.
  const [measuring, setMeasuring] = useState(false);
  const measuringRef = useRef(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const measurePointsRef = useRef<[number, number][]>([]);
  // NDVI image laid over one sector (agri-api#459 phase 2).
  const [ndviOverlay, setNdviOverlay] = useState<NdviOverlay | null>(null);
  const ndviOverlayRef = useRef<NdviOverlay | null>(null);
  const [nextAutoSectorIndex, setNextAutoSectorIndex] = useState(1);
  const [sensorPlacementType, setSensorPlacementType] = useState<string | null>(
    null
  );
  const [sensorListForUi, setSensorListForUi] = useState<SensorFeature[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [renameSectorDraft, setRenameSectorDraft] = useState('');
  const [selectedSectorDrawId, setSelectedSectorDrawId] = useState<
    string | null
  >(null);
  const [basemap, setBasemap] = useState<Basemap>('satellite_labels');
  const [layerPrefs, setLayerPrefs] = useState<Record<MapLayerId, LayerPref>>({
    ...DEFAULT_LAYER_PREFS,
  });
  /** Render snapshot of server rows + live status (refs are never read in render). */
  const [view, setView] = useState<{
    sectors: { drawId: string; row: MapSector }[];
    status: FarmMapStatus | null;
  }>({ sectors: [], status: null });
  const [loadError, setLoadError] = useState(false);
  const [modalTarget, setModalTarget] = useState<SensorModalTarget | null>(
    null
  );
  const [modalSaving, setModalSaving] = useState(false);
  const [sectorSaving, setSectorSaving] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [sensorKeys, setSensorKeys] = useState<SensorKeyOption[]>([]);

  const t = useTranslations();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const sectorCountSuffix = (n: number): string =>
    ` · ${tRef.current('misc.map.sectorSensorCount', { count: n })}`;
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  const { colorMode } = useColorMode();
  const toolbarBg = useColorModeValue('whiteAlpha.900', 'blackAlpha.600');
  const toolbarBorder = useColorModeValue('gray.200', 'gray.600');

  const bumpData = useCallback(() => {
    const sectors: { drawId: string; row: MapSector }[] = [];
    syncedSectorsRef.current.forEach((s, drawId) => {
      const row = sectorRowsRef.current.get(s.serverId);
      if (row) sectors.push({ drawId, row });
    });
    setView({ sectors, status: statusRef.current });
  }, []);

  // ---------------------------------------------------------------------
  // Helpers bound to the live map
  // ---------------------------------------------------------------------
  const drawIdByServerId = useCallback((): Map<number, string> => {
    const m = new Map<number, string>();
    syncedSectorsRef.current.forEach((s, drawId) => m.set(s.serverId, drawId));
    return m;
  }, []);

  const refreshLabels = useCallback(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw) return;
    const extra = new Map<string, string>();
    syncedSectorsRef.current.forEach((s, drawId) => {
      const area = formatArea(sectorRowsRef.current.get(s.serverId)?.area_ha);
      if (area) extra.set(drawId, area);
    });
    const fc = draw.getAll() as FarmSectorFeatureCollection;
    setSourceData(map, LABEL_SOURCE_ID, {
      type: 'FeatureCollection',
      features: buildLabelFeatures(
        fc,
        sensorCountsBySector(sensorsFcRef.current.features),
        sectorCountSuffix,
        extra
      ),
    });
    // Sector status overlay = drawn polygons coloured by their sensors' state.
    const statusById = new Map(
      (statusRef.current?.sectors ?? []).map((s) => [s.id, s.status])
    );
    setSourceData(map, SECTOR_STATUS_SOURCE_ID, {
      type: 'FeatureCollection',
      features: fc.features
        .filter((f) => isCompleteSectorGeometry(f.geometry))
        .map((f) => {
          const serverId = syncedSectorsRef.current.get(String(f.id))?.serverId;
          return {
            type: 'Feature' as const,
            properties: {
              status:
                (serverId != null && statusById.get(serverId)) || 'no_data',
            },
            geometry: f.geometry,
          };
        }),
    });
  }, []);

  /** Cluster source = the sensors the current filter lets through. */
  const pushClusterData = useCallback((map: mapboxgl.Map) => {
    const f = sensorFilterRef.current;
    setSourceData(map, SENSOR_CLUSTER_SOURCE_ID, {
      type: 'FeatureCollection',
      features: sensorsFcRef.current.features.filter((x) =>
        matchesSensorFilter(x.properties, f)
      ),
    } as SensorFC);
  }, []);

  const pushSensors = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      setSourceData(map, FARM_SENSORS_SOURCE_ID, sensorsFcRef.current);
      pushClusterData(map);
    }
    bumpSensorListRef.current();
  }, [pushClusterData]);

  const savePrefs = useCallback((patch: Partial<MapPreferences>) => {
    if (!cameraReadyRef.current) return;
    pendingPrefsRef.current = { ...pendingPrefsRef.current, ...patch };
    if (prefsTimerRef.current) window.clearTimeout(prefsTimerRef.current);
    prefsTimerRef.current = window.setTimeout(() => {
      const body = pendingPrefsRef.current;
      pendingPrefsRef.current = {};
      farmMapApi.savePreferences(body).catch(() => {
        /* preferences are a convenience — never interrupt the user */
      });
    }, 1200);
  }, []);

  const fitFarm = useCallback(
    (animate = true) => {
      const map = mapRef.current;
      const draw = drawRef.current;
      if (!map) return;
      const bounds = boundsOf([
        ...(draw
          ?.getAll()
          .features.filter(isPolygonFeature)
          .map((f) => f.geometry) ?? []),
        ...sensorsFcRef.current.features.map((f) => f.geometry),
      ]);
      if (bounds) {
        map.fitBounds(bounds as LngLatBounds, {
          padding: 56,
          maxZoom: 17,
          duration: animate ? 800 : 0,
        });
      } else {
        map.easeTo({
          center: [lon, lat],
          zoom: 14,
          duration: animate ? 800 : 0,
        });
      }
    },
    [lat, lon]
  );

  const zoomToSector = useCallback((drawId: string) => {
    const map = mapRef.current;
    const f = drawRef.current?.get(drawId) as GeoJSON.Feature | undefined;
    if (!map || !f) return;
    const b = boundsOf([f.geometry]);
    if (b)
      map.fitBounds(b as LngLatBounds, {
        padding: 64,
        maxZoom: 18,
        duration: 700,
      });
  }, []);

  const notifyError = useCallback((e: unknown, fallbackKey: string) => {
    const { detail } = apiErrorDetail(e);
    toastRef.current({
      title: tRef.current(fallbackKey),
      description: detail,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }, []);

  // ---------------------------------------------------------------------
  // Server sync (sectors + sensor positions), debounced
  // ---------------------------------------------------------------------
  const runServerSync = useCallback(async () => {
    if (!serverSyncEnabledRef.current || !canEditRef.current) return;
    if (syncRunningRef.current) {
      syncAgainRef.current = true;
      return;
    }
    const draw = drawRef.current;
    if (!draw) return;
    syncRunningRef.current = true;
    const synced = syncedSectorsRef.current;
    let changed = false;
    try {
      const features = draw.getAll().features;
      const diff = diffSectors(features, synced, inFlightSectorsRef.current);
      const fpAtSend = new Map(
        features
          .filter((f) => f.id != null)
          .map((f) => [String(f.id), sectorFingerprint(f)])
      );

      for (const c of diff.creates) {
        inFlightSectorsRef.current.add(c.drawId);
        try {
          const row = await farmMapApi.createSector(c.body);
          synced.set(c.drawId, {
            serverId: row.id,
            fingerprint: fpAtSend.get(c.drawId) ?? '',
          });
          sectorRowsRef.current.set(row.id, row);
          changed = true;
        } catch (e) {
          notifyError(e, 'misc.map.syncFailed');
        } finally {
          inFlightSectorsRef.current.delete(c.drawId);
        }
      }

      for (const u of diff.updates) {
        try {
          const row = await farmMapApi.updateSector(u.serverId, u.body);
          synced.set(u.drawId, {
            serverId: row.id,
            fingerprint: fpAtSend.get(u.drawId) ?? '',
          });
          sectorRowsRef.current.set(row.id, row);
          changed = true;
        } catch (e) {
          notifyError(e, 'misc.map.syncFailed');
        }
      }

      for (const d of diff.deletes) {
        try {
          await farmMapApi.deleteSector(d.serverId);
          synced.delete(d.drawId);
          sectorRowsRef.current.delete(d.serverId);
          changed = true;
        } catch (e) {
          // Put the sector back: the server still has it (e.g. deleting needs
          // the admin tier), and the map must not pretend otherwise.
          const { status } = apiErrorDetail(e);
          notifyError(
            e,
            status === 403
              ? 'misc.map.needAdminToDelete'
              : 'misc.map.syncFailed'
          );
          const row = sectorRowsRef.current.get(d.serverId);
          const restored = row ? sectorToDrawFeature(row) : null;
          if (restored) {
            restored.id = d.drawId;
            draw.add(restored);
          }
        }
      }

      // One-time import of browser-stored sectors finished?
      if (
        migratingSectorsRef.current &&
        inFlightSectorsRef.current.size === 0 &&
        draw
          .getAll()
          .features.filter(isPolygonFeature)
          .every((f) => synced.has(String(f.id)))
      ) {
        migratingSectorsRef.current = false;
        retireLegacyKey(LEGACY_SECTORS_KEY);
      }

      // One-time import of browser-stored sensors (after their sectors exist).
      if (legacySensorsRef.current && !migratingSectorsRef.current) {
        const legacyIds = new Map<string, number>();
        synced.forEach((s, drawId) => legacyIds.set(drawId, s.serverId));
        const writes = legacySensorsToWrites(
          legacySensorsRef.current,
          legacyIds
        );
        legacySensorsRef.current = null;
        let ok = 0;
        for (const w of writes) {
          try {
            const row = await farmMapApi.createInstallation(w);
            installationsRef.current.set(row.id, row);
            ok += 1;
          } catch (e) {
            notifyError(e, 'misc.map.syncFailed');
          }
        }
        if (ok === writes.length) retireLegacyKey(LEGACY_SENSORS_KEY);
        if (ok > 0) {
          const byServer = drawIdByServerId();
          const names = new Map(
            [...sectorRowsRef.current.values()].map((r) => [r.id, r.name])
          );
          sensorsFcRef.current.features = [
            ...installationsRef.current.values(),
          ].map((row) => installationToFeature(row, byServer, names));
          for (const row of installationsRef.current.values()) {
            syncedSensorRef.current.set(row.id, {
              lng: row.longitude,
              lat: row.latitude,
              sectorId: row.sector_id,
            });
          }
          toastRef.current({
            title: tRef.current('misc.map.migrated'),
            status: 'success',
            duration: 3500,
          });
          changed = true;
        }
      }

      // Sensor positions / sector membership changed on the map.
      for (const f of sensorsFcRef.current.features) {
        const id = f.properties.installationId;
        const zid = f.properties.zoneId;
        if (zid && !synced.has(zid)) continue; // its sector is not saved yet
        const sectorId = zid ? (synced.get(zid)?.serverId ?? null) : null;
        const [lng, lat_] = f.geometry.coordinates;
        const prev = syncedSensorRef.current.get(id);
        if (
          prev &&
          Math.abs(prev.lng - lng) < 1e-9 &&
          Math.abs(prev.lat - lat_) < 1e-9 &&
          prev.sectorId === sectorId
        ) {
          continue;
        }
        try {
          const row = await farmMapApi.updateInstallation(id, {
            latitude: lat_,
            longitude: lng,
            sector_id: sectorId,
          });
          installationsRef.current.set(row.id, row);
          syncedSensorRef.current.set(id, { lng, lat: lat_, sectorId });
          changed = true;
        } catch (e) {
          notifyError(e, 'misc.map.syncFailed');
          syncedSensorRef.current.set(id, { lng, lat: lat_, sectorId }); // no retry storm
        }
      }
    } finally {
      syncRunningRef.current = false;
      if (changed) {
        refreshLabels();
        pushSensors();
        bumpData();
        void refreshStatusRef.current();
      }
      if (syncAgainRef.current) {
        syncAgainRef.current = false;
        void runServerSyncRef.current();
      }
    }
  }, [bumpData, drawIdByServerId, notifyError, pushSensors, refreshLabels]);

  useEffect(() => {
    runServerSyncRef.current = runServerSync;
  }, [runServerSync]);

  const scheduleServerSync = useCallback(() => {
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      void runServerSyncRef.current();
    }, 400);
  }, []);

  // ---------------------------------------------------------------------
  // Live status
  // ---------------------------------------------------------------------
  const refreshStatus = useCallback(async () => {
    try {
      const st = await farmMapApi.status();
      statusRef.current = st;
      applyStatusToFeatures(sensorsFcRef.current.features, st.installations);
      pushSensors();
      refreshLabels();
      bumpData();
    } catch {
      /* status is best-effort; the map stays usable without it */
    }
  }, [bumpData, pushSensors, refreshLabels]);

  useEffect(() => {
    refreshStatusRef.current = refreshStatus;
  }, [refreshStatus]);

  // ---------------------------------------------------------------------
  // React state mirrors
  // ---------------------------------------------------------------------
  useEffect(() => {
    pendingNameRef.current = nextSectorName;
  }, [nextSectorName]);

  useEffect(() => {
    placingSensorTypeRef.current = sensorPlacementType;
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = sensorPlacementType ? 'crosshair' : '';
  }, [sensorPlacementType]);

  useEffect(() => {
    bumpSensorListRef.current = () =>
      setSensorListForUi(
        sensorsFcRef.current.features.map((f) => ({
          ...f,
          properties: { ...f.properties },
        }))
      );
    setSelectedSensorIdRef.current = setSelectedSensorId;
  }, []);

  useEffect(() => {
    selectedSensorIdRef.current = selectedSensorId;
  }, [selectedSensorId]);

  // ---------------------------------------------------------------------
  // Map lifecycle
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: BASEMAPS.satellite_labels.style,
      center: [lon, lat],
      zoom: 14,
      maxZoom: 20,
      // Mapbox's terms require visible attribution: compact control below.
      attributionControl: false,
    });
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right'
    );
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: true }),
      'top-right'
    );
    map.addControl(
      new mapboxgl.ScaleControl({ unit: 'metric' }),
      'bottom-left'
    );

    const drawOptions: MapboxDraw.MapboxDrawOptions & {
      suppressAPIEvents?: boolean;
    } = {
      displayControlsDefault: false,
      defaultMode: MapboxDraw.constants.modes.SIMPLE_SELECT,
      userProperties: true,
      /** So `setFeatureProperty` (rename) emits `draw.update` and Draw redraws. */
      suppressAPIEvents: false,
      styles: sectorMapDrawStyles,
    };
    const draw = new MapboxDraw(drawOptions);
    map.addControl(draw, 'top-left');
    mapRef.current = map;
    drawRef.current = draw;

    // Keep the canvas sized to its container (tools panel, tabs, window).
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    /** Local reconcile after any sector edit, then schedule the server sync. */
    const syncSectorsAndSensors = () => {
      const d = drawRef.current;
      const m = mapRef.current;
      if (!d || !m?.getSource(FARM_SENSORS_SOURCE_ID)) return;
      const polys = d.getAll().features.filter(isPolygonFeature);
      shiftSensorsWithSectorMotion(
        sensorsFcRef.current,
        polys,
        sectorCentroidPrevRef.current
      );
      if (canEditRef.current) ensureSectorColorsOnDraw(d);
      // A sensor in a deleted sector is kept and becomes "out of sector":
      // deleting a sector never deletes the physical sensor's record.
      reassignSensorZones(sensorsFcRef.current, d.getAll().features);
      const sel = selectedSensorIdRef.current;
      if (
        sel &&
        !sensorsFcRef.current.features.some((f) => String(f.id) === sel)
      ) {
        setSelectedSensorIdRef.current(null);
      }
      refreshLabels();
      pushSensors();
      recordHistory(d);
      scheduleServerSync();
    };
    syncSectorsAndSensorsRef.current = syncSectorsAndSensors;

    // ----- sensor drag -----
    const DRAG_THRESHOLD_PX = 8;
    let sensorDrag: {
      index: number;
      start: mapboxgl.Point;
      moved: boolean;
    } | null = null;

    const onSensorMouseDown = (e: mapboxgl.MapLayerMouseEvent) => {
      if (placingSensorTypeRef.current || !canEditRef.current) return;
      const f = e.features?.[0];
      if (f?.id == null) return;
      const idx = sensorsFcRef.current.features.findIndex(
        (x) => String(x.id) === String(f.id)
      );
      if (idx < 0) return;
      e.preventDefault();
      sensorDrag = { index: idx, start: e.point, moved: false };
    };

    const onMapMouseMoveSensor = (e: mapboxgl.MapMouseEvent) => {
      if (!sensorDrag) return;
      const dx = e.point.x - sensorDrag.start.x;
      const dy = e.point.y - sensorDrag.start.y;
      if (!sensorDrag.moved) {
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
        sensorDrag.moved = true;
        map.dragPan.disable();
        map.getCanvas().style.cursor = 'grabbing';
        sensorPopup.remove();
        window.addEventListener('mouseup', onMapMouseUpSensor, { once: true });
      }
      const g = sensorsFcRef.current.features[sensorDrag.index]?.geometry;
      if (g) {
        g.coordinates = [e.lngLat.lng, e.lngLat.lat];
        setSourceData(map, FARM_SENSORS_SOURCE_ID, sensorsFcRef.current);
        pushClusterData(map);
      }
    };

    const onMapMouseUpSensor = () => {
      if (!sensorDrag) return;
      const { index, moved } = sensorDrag;
      const feat = sensorsFcRef.current.features[index];
      if (!moved) {
        setSelectedSensorIdRef.current(String(feat?.id ?? ''));
      } else if (feat && drawRef.current) {
        const z = findContainingSector(
          feat.geometry.coordinates[0],
          feat.geometry.coordinates[1],
          drawRef.current.getAll().features
        );
        feat.properties.zoneId = z?.zoneId ?? '';
        feat.properties.zoneName = z?.zoneName ?? '';
        refreshLabels();
        pushSensors();
        scheduleServerSync();
        toastRef.current({
          title: tRef.current('misc.map.sensorMoved'),
          description: tRef.current('misc.map.zoneRecalculated'),
          status: 'success',
          duration: 2200,
        });
        map.dragPan.enable();
      }
      map.getCanvas().style.cursor = placingSensorTypeRef.current
        ? 'crosshair'
        : 'grab';
      sensorDrag = null;
    };

    // ----- sensor popup (live values) -----
    const sensorPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: 'agrilogy-sensor-popup',
    });

    const ageText = (iso: string | null | undefined) => {
      const a = readingAge(iso);
      return a
        ? tRef.current(`misc.map.age.${a.unit}`, { count: a.value })
        : '';
    };

    const onSensorMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      if (!placingSensorTypeRef.current) map.getCanvas().style.cursor = 'grab';
      const f = e.features[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      const props = (f.properties ?? {}) as Partial<SensorFeatureProps>;
      const tr = tRef.current;
      const name = props.name ?? tr('misc.map.sensor');
      const typeLabel = props.sensorType
        ? tr(`sensors.${sensorTypeI18nKey(props.sensorType)}`)
        : tr('misc.map.sensor');
      const st = statusRef.current?.installations.find(
        (s) => s.id === Number(props.installationId)
      );
      const status = (st?.status ??
        props.status ??
        'no_data') as keyof typeof STATUS_COLORS;
      const rows: string[] = [];
      const value = formatReading(st?.latest);
      rows.push(
        value
          ? `${escapeHtml(tr('misc.map.popup.value'))}: <strong>${escapeHtml(value)}</strong> <span style="opacity:.75">(${escapeHtml(ageText(st?.latest?.timestamp))})</span>`
          : escapeHtml(
              tr(
                status === 'unlinked'
                  ? 'misc.map.popup.unlinked'
                  : 'misc.map.noReading'
              )
            )
      );
      const battery = formatReading(st?.battery);
      if (battery)
        rows.push(
          `${escapeHtml(tr('misc.map.popup.battery'))}: ${escapeHtml(battery)}`
        );
      const signal = formatReading(st?.signal);
      if (signal)
        rows.push(
          `${escapeHtml(tr('misc.map.popup.signal'))}: ${escapeHtml(signal)}`
        );
      rows.push(
        escapeHtml(
          props.zoneName
            ? tr('misc.map.zoneLabel', { zone: props.zoneName })
            : tr('misc.map.outOfZone')
        )
      );
      if (st?.alerts.length) {
        rows.push(
          `<span style="color:${STATUS_COLORS.critical}">${escapeHtml(tr('misc.map.popup.alerts'))}: ${escapeHtml(st.alerts.map((a) => a.name).join(', '))}</span>`
        );
      }
      sensorPopup
        .setLngLat(coords)
        .setHTML(
          `<div style="padding:2px 4px;font-size:13px;line-height:1.4;min-width:170px">` +
            `<div style="display:flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:50%;background:${STATUS_COLORS[status]};display:inline-block"></span><strong>${escapeHtml(name)}</strong></div>` +
            `<div style="font-size:11px;opacity:.85">${escapeHtml(typeLabel)} · ${escapeHtml(tr(`misc.map.status.${status}`))}</div>` +
            rows
              .map(
                (r) => `<div style="font-size:12px;margin-top:2px">${r}</div>`
              )
              .join('') +
            `</div>`
        )
        .addTo(map);
    };

    const onSensorMouseLeave = () => {
      sensorPopup.remove();
      const c = map.getCanvas();
      if (sensorDrag?.moved) {
        c.style.cursor = 'grabbing';
        return;
      }
      c.style.cursor = placingSensorTypeRef.current ? 'crosshair' : 'grab';
    };

    // ----- placement: a map click opens the sensor form -----
    const onCanvasClickCapture = (domEv: MouseEvent) => {
      if (measuringRef.current) {
        domEv.stopPropagation();
        domEv.stopImmediatePropagation();
        const r = map.getCanvas().getBoundingClientRect();
        const p = map.unproject([
          domEv.clientX - r.left,
          domEv.clientY - r.top,
        ]);
        setMeasurePoints((pts) => [...pts, [p.lng, p.lat]]);
        return;
      }
      const typeId = placingSensorTypeRef.current;
      if (!typeId) return;
      domEv.stopPropagation();
      domEv.stopImmediatePropagation();
      const d = drawRef.current;
      if (!d) return;
      const rect = map.getCanvas().getBoundingClientRect();
      const ll = map.unproject([
        domEv.clientX - rect.left,
        domEv.clientY - rect.top,
      ]);
      const zone = findContainingSector(ll.lng, ll.lat, d.getAll().features);
      const sectorServerId = zone
        ? (syncedSectorsRef.current.get(zone.zoneId)?.serverId ?? null)
        : null;
      const sameType = sensorsFcRef.current.features.filter(
        (f) => f.properties.sensorType === typeId
      ).length;
      setModalTarget({
        mode: 'create',
        sensorType: typeId,
        latitude: ll.lat,
        longitude: ll.lng,
        sectorServerId,
        defaultName: `${tRef.current(`sensors.${sensorTypeI18nKey(typeId)}`)} ${sameType + 1}`,
      });
    };

    // ----- layers (re-added after every style change) -----
    const addCustomLayers = async () => {
      if (!map.getSource(SECTOR_STATUS_SOURCE_ID)) {
        map.addSource(SECTOR_STATUS_SOURCE_ID, {
          type: 'geojson',
          data: emptyFC(),
        });
      }
      if (!map.getLayer(SECTOR_STATUS_LAYER_ID)) {
        map.addLayer({
          id: SECTOR_STATUS_LAYER_ID,
          type: 'fill',
          source: SECTOR_STATUS_SOURCE_ID,
          paint: {
            'fill-color':
              statusColorExpression() as mapboxgl.ExpressionSpecification,
            'fill-opacity': 0.33,
          },
        });
      }
      if (!map.getSource(FARM_SENSORS_SOURCE_ID)) {
        map.addSource(FARM_SENSORS_SOURCE_ID, {
          type: 'geojson',
          data: sensorsFcRef.current,
        });
      }
      if (!map.getLayer(SENSORS_HALO_LAYER_ID)) {
        map.addLayer({
          id: SENSORS_HALO_LAYER_ID,
          type: 'circle',
          source: FARM_SENSORS_SOURCE_ID,
          minzoom: CLUSTER_UNTIL_ZOOM,
          paint: {
            'circle-radius': 13,
            'circle-color':
              statusColorExpression() as mapboxgl.ExpressionSpecification,
            'circle-opacity': 0.75,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
      try {
        await registerSensorMapImages(map);
        if (!map.getLayer(FARM_SENSORS_LAYER_ID)) {
          map.addLayer({
            id: FARM_SENSORS_LAYER_ID,
            type: 'symbol',
            source: FARM_SENSORS_SOURCE_ID,
            minzoom: CLUSTER_UNTIL_ZOOM,
            layout: {
              'icon-image':
                sensorTypeIconImageMatchExpression() as mapboxgl.ExpressionSpecification,
              'icon-size': 0.32,
              'icon-anchor': 'center',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });
        }
      } catch (e) {
        console.error('Capteurs: icônes carte indisponibles', e);
      }
      if (!map.getSource(SENSOR_CLUSTER_SOURCE_ID)) {
        map.addSource(SENSOR_CLUSTER_SOURCE_ID, {
          type: 'geojson',
          data: emptyFC(),
          cluster: true,
          clusterRadius: 40,
          clusterMaxZoom: CLUSTER_UNTIL_ZOOM - 1,
        });
      }
      if (!map.getLayer(SENSOR_CLUSTER_LAYER_ID)) {
        map.addLayer({
          id: SENSOR_CLUSTER_LAYER_ID,
          type: 'circle',
          source: SENSOR_CLUSTER_SOURCE_ID,
          maxzoom: CLUSTER_UNTIL_ZOOM,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#15803d',
            'circle-opacity': 0.85,
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              14,
              5,
              18,
              20,
              24,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
        map.addLayer({
          id: SENSOR_CLUSTER_COUNT_LAYER_ID,
          type: 'symbol',
          source: SENSOR_CLUSTER_SOURCE_ID,
          maxzoom: CLUSTER_UNTIL_ZOOM,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
            'text-allow-overlap': true,
          },
          paint: { 'text-color': '#ffffff' },
        });
        map.addLayer({
          id: SENSOR_CLUSTER_POINT_LAYER_ID,
          type: 'circle',
          source: SENSOR_CLUSTER_SOURCE_ID,
          maxzoom: CLUSTER_UNTIL_ZOOM,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 7,
            'circle-color':
              statusColorExpression() as mapboxgl.ExpressionSpecification,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
      if (!map.getLayer(SENSOR_NAMES_LAYER_ID)) {
        map.addLayer({
          id: SENSOR_NAMES_LAYER_ID,
          type: 'symbol',
          source: FARM_SENSORS_SOURCE_ID,
          minzoom: SENSOR_LABEL_MIN_ZOOM,
          layout: {
            'text-field': [
              'case',
              ['!=', ['get', 'valueText'], ''],
              ['concat', ['get', 'name'], '\n', ['get', 'valueText']],
              ['get', 'name'],
            ],
            'text-size': 11,
            'text-offset': [0, 1.6],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#111827',
            'text-halo-width': 1.5,
          },
        });
      }
      if (!map.getSource(LABEL_SOURCE_ID)) {
        map.addSource(LABEL_SOURCE_ID, { type: 'geojson', data: emptyFC() });
      }
      if (!map.getLayer(LABEL_LAYER_ID)) {
        map.addLayer({
          id: LABEL_LAYER_ID,
          type: 'symbol',
          source: LABEL_SOURCE_ID,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 13,
            'text-anchor': 'center',
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': ['coalesce', ['get', 'halo'], '#1a3d1a'],
            'text-halo-width': 2,
          },
        });
      }
      if (!map.getSource(REGISTERED_DEVICES_SOURCE_ID)) {
        map.addSource(REGISTERED_DEVICES_SOURCE_ID, {
          type: 'geojson',
          data: devicesFcRef.current,
        });
      }
      if (!map.getLayer(REGISTERED_DEVICES_LAYER_ID)) {
        map.addLayer({
          id: REGISTERED_DEVICES_LAYER_ID,
          type: 'circle',
          source: REGISTERED_DEVICES_SOURCE_ID,
          paint: {
            'circle-radius': 7,
            'circle-color': '#2563eb',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
      refreshLabels();
      setSourceData(map, FARM_SENSORS_SOURCE_ID, sensorsFcRef.current);
      pushClusterData(map);
      applyLayerPrefs(map, layerPrefsRef.current);
      applySensorFilter(map, sensorFilterRef.current);
      applyMeasure(map, measurePointsRef.current);
      applyNdviOverlay(map, ndviOverlayRef.current);
    };

    // One layer setup per loaded style: `style.load` and `load` both ask for
    // it on first paint, and registering the sensor icons twice races.
    let layersReady: Promise<void> | null = null;
    const ensureCustomLayers = () => (layersReady ??= addCustomLayers());

    const onStyleLoad = () => {
      layersReady = null; // a new style dropped every custom layer + image
      applyBasemapConfig(map, basemapRef.current);
      void ensureCustomLayers();
    };
    // Draw re-adds its own layers after a style change; re-apply our
    // visibility/opacity to them once they exist.
    const onStyleData = () => applyLayerPrefs(map, layerPrefsRef.current);

    // ----- initial data -----
    const loadData = async () => {
      let sectors: MapSector[];
      let installations: SensorInstallation[];
      let prefs: MapPreferences;
      try {
        [sectors, installations, prefs] = await Promise.all([
          farmMapApi.listSectors(),
          farmMapApi.listInstallations(),
          farmMapApi.getPreferences().catch(
            () =>
              ({
                basemap: 'satellite_labels',
                layers: {},
                camera: null,
              }) as MapPreferences
          ),
        ]);
      } catch (e) {
        // Server unreachable: show what this browser still has, read-only.
        setLoadError(true);
        notifyError(e, 'misc.map.loadFailed');
        const legacy = loadFarmSectors();
        if (legacy?.features.length) draw.set(legacy);
        cameraReadyRef.current = false;
        fitFarm(false);
        return;
      }
      if (!mapRef.current) return;

      sectorRowsRef.current = new Map(sectors.map((s) => [s.id, s]));
      const drawn = sectors
        .map(sectorToDrawFeature)
        .filter((f): f is GeoJSON.Feature => f != null);
      const legacySectors = loadFarmSectors();
      if (
        drawn.length === 0 &&
        legacySectors?.features.length &&
        canEditRef.current
      ) {
        // First visit since sectors moved server-side: import this browser's.
        migratingSectorsRef.current = true;
        draw.set(legacySectors);
      } else {
        draw.set({ type: 'FeatureCollection', features: drawn });
        for (const f of drawn) {
          const live = draw.get(String(f.id)) as GeoJSON.Feature | undefined;
          syncedSectorsRef.current.set(String(f.id), {
            serverId: Number(f.id),
            fingerprint: sectorFingerprint(live ?? f),
          });
        }
      }
      const maxN = draw.getAll().features.reduce((acc, f) => {
        const m = /^Secteur\s+(\d+)$/.exec(
          (f.properties?.name as string | undefined) ?? ''
        );
        return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
      }, 0);
      sectorIndexRef.current = maxN + 1;
      setNextAutoSectorIndex(maxN + 1);

      installationsRef.current = new Map(installations.map((i) => [i.id, i]));
      const byServer = drawIdByServerId();
      const names = new Map(sectors.map((s) => [s.id, s.name]));
      sensorsFcRef.current = {
        type: 'FeatureCollection',
        features: installations.map((i) =>
          installationToFeature(i, byServer, names)
        ),
      };
      for (const i of installations) {
        syncedSensorRef.current.set(i.id, {
          lng: i.longitude,
          lat: i.latitude,
          sectorId: i.sector_id,
        });
      }
      const legacySensors = loadFarmSensors();
      if (
        installations.length === 0 &&
        legacySensors?.features.length &&
        canEditRef.current
      ) {
        legacySensorsRef.current = legacySensors;
      }
      serverSyncEnabledRef.current = true;
      lastSnapshotRef.current = snapshotDraw(draw);
      historyRef.current = { past: [], future: [] };
      setHistoryDepth({ past: 0, future: 0 });
      sectorCentroidPrevRef.current.clear();
      for (const f of draw.getAll().features.filter(isPolygonFeature)) {
        const c = sectorFeatureCentroid(f);
        if (f.id != null && c)
          sectorCentroidPrevRef.current.set(String(f.id), c);
      }

      // Preferences: layers, basemap, camera.
      const layers = mergeLayerPrefs(prefs.layers);
      layerPrefsRef.current = layers;
      setLayerPrefs(layers);
      applyLayerPrefs(map, layers);
      const bm = isBasemap(prefs.basemap) ? prefs.basemap : 'satellite_labels';
      if (bm !== basemapRef.current) {
        const prev = basemapRef.current;
        basemapRef.current = bm;
        setBasemap(bm);
        if (BASEMAPS[bm].style !== BASEMAPS[prev].style)
          map.setStyle(BASEMAPS[bm].style);
        else applyBasemapConfig(map, bm);
      }
      const cam = prefs.camera;
      if (cam && Array.isArray(cam.center) && cam.center.length === 2) {
        map.jumpTo({
          center: cam.center,
          zoom: cam.zoom,
          bearing: cam.bearing ?? 0,
          pitch: cam.pitch ?? 0,
        });
      } else {
        fitFarm(false);
      }
      cameraReadyRef.current = true;

      refreshLabels();
      pushSensors();
      bumpData();
      void refreshStatusRef.current();
      if (migratingSectorsRef.current || legacySensorsRef.current)
        scheduleServerSync();
    };

    const onLoad = async () => {
      map.getCanvas().addEventListener('click', onCanvasClickCapture, true);
      map.getCanvas().style.cursor = placingSensorTypeRef.current
        ? 'crosshair'
        : 'grab';
      await ensureCustomLayers();
      myDevicesApi
        .list()
        .then((devices) => {
          devicesFcRef.current = devicesToGeoJSON(devices);
          setSourceData(
            map,
            REGISTERED_DEVICES_SOURCE_ID,
            devicesFcRef.current
          );
        })
        .catch(() => {
          /* not signed in / no devices — leave the device layer empty */
        });
      await loadData();
    };

    const onDeviceClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties ?? {};
      const [lng, lat_] = (f.geometry as GeoJSON.Point).coordinates;
      new mapboxgl.Popup({ offset: 12 })
        .setLngLat([lng, lat_])
        .setHTML(
          `<strong>${escapeHtml(String(props.name ?? ''))}</strong>` +
            `<br/>${escapeHtml(String(props.serial ?? ''))}`
        )
        .addTo(map);
    };
    const onDeviceEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onDeviceLeave = () => {
      map.getCanvas().style.cursor = placingSensorTypeRef.current
        ? 'crosshair'
        : 'grab';
    };
    const onMoveEnd = () => {
      if (!cameraReadyRef.current) return;
      const c = map.getCenter();
      savePrefs({
        camera: {
          center: [Number(c.lng.toFixed(6)), Number(c.lat.toFixed(6))],
          zoom: Number(map.getZoom().toFixed(2)),
          bearing: Number(map.getBearing().toFixed(1)),
          pitch: Number(map.getPitch().toFixed(1)),
        },
      });
    };

    const onCreate = (e: { features: GeoJSON.Feature[] }) => {
      const f = e.features[0];
      const id = String(f?.id ?? '');
      if (!id) return;
      // `draw.set` (initial load / restore) fires create per feature: keep
      // existing names and colours; only brand-new drawings get defaults.
      const existingName =
        f.properties &&
        typeof (f.properties as { name?: unknown }).name === 'string'
          ? (f.properties as { name: string }).name.trim()
          : '';
      if (existingName) {
        const m = /^Secteur\s+(\d+)$/i.exec(existingName);
        if (m) {
          sectorIndexRef.current = Math.max(
            sectorIndexRef.current,
            parseInt(m[1], 10) + 1
          );
          setNextAutoSectorIndex(sectorIndexRef.current);
        }
      } else if (canEditRef.current) {
        const name =
          pendingNameRef.current.trim() || `Secteur ${sectorIndexRef.current}`;
        if (!pendingNameRef.current.trim()) {
          sectorIndexRef.current += 1;
          setNextAutoSectorIndex(sectorIndexRef.current);
        }
        draw.setFeatureProperty(id, 'name', name);
      }
      const storedColor =
        f.properties && (f.properties as { color?: unknown }).color;
      if (!isHexColor(storedColor) && canEditRef.current) {
        const count = draw.getAll().features.filter(isPolygonFeature).length;
        draw.setFeatureProperty(
          id,
          'color',
          colorForSectorIndex(Math.max(0, count - 1))
        );
      }
      setNextSectorName('');
      pendingNameRef.current = '';
      syncSectorsAndSensors();
    };

    const onSelectionChange = (e: { features: GeoJSON.Feature[] }) => {
      const fs = e.features ?? [];
      if (fs.length === 1 && isPolygonFeature(fs[0])) {
        const sid = fs[0].id != null ? String(fs[0].id) : null;
        const n =
          fs[0].properties &&
          typeof (fs[0].properties as { name?: unknown }).name === 'string'
            ? (fs[0].properties as { name: string }).name
            : '';
        setSelectedSectorDrawId(sid);
        setRenameSectorDraft(n);
        return;
      }
      setSelectedSectorDrawId(null);
      setRenameSectorDraft('');
    };
    const onModeChange = (e: { mode: string }) => {
      setDrawMode(e.mode);
      // Finishing (or abandoning) a polygon: record it as one undo step once
      // draw has committed the final shape.
      if (e.mode !== MapboxDraw.constants.modes.DRAW_POLYGON) {
        window.setTimeout(() => recordHistory(draw), 0);
      }
    };

    map.on('style.load', onStyleLoad);
    map.on('styledata', onStyleData);
    map.on('load', onLoad);
    map.on('moveend', onMoveEnd);
    map.on('click', REGISTERED_DEVICES_LAYER_ID, onDeviceClick);
    const onClusterClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const clusterId = f?.properties?.cluster_id;
      const src = map.getSource(SENSOR_CLUSTER_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (clusterId == null || !src || f?.geometry.type !== 'Point') return;
      const center = f.geometry.coordinates as [number, number];
      src.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        map.easeTo({
          center,
          zoom: Math.max(zoom, CLUSTER_UNTIL_ZOOM),
        });
      });
    };
    map.on('click', SENSOR_CLUSTER_LAYER_ID, onClusterClick);
    map.on('mouseenter', REGISTERED_DEVICES_LAYER_ID, onDeviceEnter);
    map.on('mouseleave', REGISTERED_DEVICES_LAYER_ID, onDeviceLeave);
    map.on('mouseenter', SENSORS_HALO_LAYER_ID, onSensorMouseEnter);
    map.on('mouseleave', SENSORS_HALO_LAYER_ID, onSensorMouseLeave);
    map.on('mousedown', SENSORS_HALO_LAYER_ID, onSensorMouseDown);
    map.on('mousemove', onMapMouseMoveSensor);
    map.on('mouseup', onMapMouseUpSensor);
    map.on('draw.create', onCreate);
    map.on('draw.update', syncSectorsAndSensors);
    map.on('draw.delete', syncSectorsAndSensors);
    map.on('draw.selectionchange', onSelectionChange);
    map.on('draw.modechange', onModeChange);

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible')
        void refreshStatusRef.current();
    }, STATUS_POLL_MS);

    return () => {
      window.clearInterval(poll);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      if (prefsTimerRef.current) window.clearTimeout(prefsTimerRef.current);
      resizeObserver.disconnect();
      map.getCanvas()?.removeEventListener('click', onCanvasClickCapture, true);
      sensorPopup.remove();
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      syncSectorsAndSensorsRef.current = null;
      serverSyncEnabledRef.current = false;
      cameraReadyRef.current = false;
      syncedSectorsRef.current = new Map();
      syncedSensorRef.current = new Map();
    };
    // The map is created once per token/position; everything else flows
    // through refs so re-renders never rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, lat, lon]);

  useEffect(() => {
    if (toolsEnabled) return;
    drawRef.current?.changeMode(MapboxDraw.constants.modes.SIMPLE_SELECT);
    setSensorPlacementType(null);
  }, [toolsEnabled]);

  /* Re-sync Mapbox canvas size after Chakra color-mode transition settles. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.resize(), 400);
    return () => window.clearTimeout(id);
  }, [colorMode]);

  /* Zones + reading streams for the sensor form, loaded once it is needed. */
  useEffect(() => {
    if (!modalTarget || (zones.length && sensorKeys.length)) return;
    farmMapApi
      .listZones()
      .then(setZones)
      .catch(() => {});
    farmMapApi
      .listSensorKeys()
      .then((keys) =>
        setSensorKeys(
          keys.filter((k) => k.key !== 'battery' && k.key !== 'signal')
        )
      )
      .catch(() => {});
  }, [modalTarget, zones.length, sensorKeys.length]);

  // ---------------------------------------------------------------------
  // UI handlers
  // ---------------------------------------------------------------------
  const handleBasemapChange = (next: Basemap) => {
    const map = mapRef.current;
    const prev = basemapRef.current;
    basemapRef.current = next;
    setBasemap(next);
    if (map) {
      if (BASEMAPS[next].style !== BASEMAPS[prev].style)
        map.setStyle(BASEMAPS[next].style);
      else applyBasemapConfig(map, next);
    }
    savePrefs({ basemap: next });
  };

  const handleLayerChange = (id: MapLayerId, pref: LayerPref) => {
    const next = { ...layerPrefsRef.current, [id]: pref };
    layerPrefsRef.current = next;
    setLayerPrefs(next);
    if (mapRef.current) applyLayerPrefs(mapRef.current, next);
    savePrefs({ layers: next });
  };

  /** Image source + raster layer under the sector outlines (gl-draw). */
  const applyNdviOverlay = useCallback(
    (map: mapboxgl.Map, o: NdviOverlay | null) => {
      const SRC = 'ndvi-overlay';
      if (map.getLayer(SRC)) map.removeLayer(SRC);
      if (map.getSource(SRC)) map.removeSource(SRC);
      if (!o) return;
      const corners = bboxCorners(
        sectorRowsRef.current.get(o.sectorId)?.geometry ?? null
      );
      if (!corners) return;
      map.addSource(SRC, {
        type: 'image',
        url: o.url,
        coordinates: corners as [
          [number, number],
          [number, number],
          [number, number],
          [number, number],
        ],
      });
      const firstDraw = map
        .getStyle()
        ?.layers?.find((l) => l.id.startsWith('gl-draw'))?.id;
      map.addLayer(
        {
          id: SRC,
          type: 'raster',
          source: SRC,
          paint: {
            'raster-opacity': o.opacity ?? 0.85,
            'raster-resampling': 'nearest',
          },
        },
        firstDraw
      );
    },
    []
  );

  useEffect(() => {
    const prev = ndviOverlayRef.current;
    ndviOverlayRef.current = ndviOverlay;
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      // Opacity-only change: repaint instead of re-adding the image.
      if (
        prev &&
        ndviOverlay &&
        prev.url === ndviOverlay.url &&
        map.getLayer('ndvi-overlay')
      ) {
        map.setPaintProperty(
          'ndvi-overlay',
          'raster-opacity',
          ndviOverlay.opacity
        );
      } else {
        applyNdviOverlay(map, ndviOverlay);
      }
    }
    if (prev && prev.url !== ndviOverlay?.url) URL.revokeObjectURL(prev.url);
  }, [ndviOverlay, applyNdviOverlay]);

  const handleSaveNow = async () => {
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    await runServerSync();
    toast({ title: t('misc.map.synced'), status: 'success', duration: 2200 });
  };

  function applySensorFilter(map: mapboxgl.Map, f: SensorFilter) {
    const expr = sensorFilterExpression(
      f
    ) as mapboxgl.FilterSpecification | null;
    for (const id of FILTERED_SENSOR_LAYERS) {
      if (map.getLayer(id)) map.setFilter(id, expr);
    }
  }

  useEffect(() => {
    sensorFilterRef.current = sensorFilter;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applySensorFilter(map, sensorFilter);
    pushClusterData(map);
  }, [sensorFilter, pushClusterData]);

  function applyMeasure(map: mapboxgl.Map, pts: [number, number][]) {
    const SRC = 'agrilogy-measure';
    const features: GeoJSON.Feature[] = pts.map((p) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: p },
    }));
    if (pts.length >= 2) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: pts },
      });
    }
    if (pts.length >= 3) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]!]] },
      });
    }
    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };
    const src = map.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
      return;
    }
    map.addSource(SRC, { type: 'geojson', data });
    map.addLayer({
      id: `${SRC}-fill`,
      type: 'fill',
      source: SRC,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#facc15', 'fill-opacity': 0.18 },
    });
    map.addLayer({
      id: `${SRC}-line`,
      type: 'line',
      source: SRC,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-color': '#facc15',
        'line-width': 2.5,
        'line-dasharray': [2, 1],
      },
    });
    map.addLayer({
      id: `${SRC}-points`,
      type: 'circle',
      source: SRC,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 4,
        'circle-color': '#facc15',
        'circle-stroke-color': '#111827',
        'circle-stroke-width': 1.5,
      },
    });
  }

  useEffect(() => {
    measuringRef.current = measuring;
    measurePointsRef.current = measurePoints;
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) applyMeasure(map, measurePoints);
    if (map) map.getCanvas().style.cursor = measuring ? 'crosshair' : '';
  }, [measuring, measurePoints]);

  const toggleMeasure = () => {
    if (measuring) {
      setMeasuring(false);
      setMeasurePoints([]);
      return;
    }
    setSensorPlacementType(null);
    drawRef.current?.changeMode(MapboxDraw.constants.modes.SIMPLE_SELECT);
    setMeasurePoints([]);
    setMeasuring(true);
  };

  const UNDO_LIMIT = 50;
  function snapshotDraw(d: MapboxDraw): string {
    return JSON.stringify(d.getAll().features.filter(isPolygonFeature));
  }
  /** What counts as a user edit: outlines and names only. Automatic
   * property writes (default colour, sync bookkeeping) are not undo steps. */
  function historyKey(snap: string): string {
    const fs = JSON.parse(snap) as GeoJSON.Feature[];
    return JSON.stringify(
      fs
        .map((f) => [
          String(f.id),
          (f.properties as { name?: unknown } | null)?.name ?? '',
          f.geometry,
        ])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    );
  }
  function recordHistory(d: MapboxDraw) {
    if (!serverSyncEnabledRef.current || restoringRef.current) return;
    // A polygon still being drawn is one step once finished, not one per
    // corner: keep the pre-draw snapshot until draw_polygon ends.
    if (d.getMode() === MapboxDraw.constants.modes.DRAW_POLYGON) return;
    const now = snapshotDraw(d);
    const last = lastSnapshotRef.current;
    if (last == null || historyKey(now) === historyKey(last)) {
      lastSnapshotRef.current = now;
      return;
    }
    const h = historyRef.current;
    h.past.push(last);
    if (h.past.length > UNDO_LIMIT) h.past.shift();
    h.future = [];
    lastSnapshotRef.current = now;
    setHistoryDepth({ past: h.past.length, future: 0 });
  }
  const restoreSnapshot = (snap: string) => {
    const d = drawRef.current;
    if (!d) return;
    restoringRef.current = true;
    try {
      d.changeMode(MapboxDraw.constants.modes.SIMPLE_SELECT);
      d.set({ type: 'FeatureCollection', features: JSON.parse(snap) });
    } finally {
      restoringRef.current = false;
    }
    lastSnapshotRef.current = snap;
    // Same path as a manual edit: labels, sensor sectors, server sync.
    syncSectorsAndSensorsRef.current?.();
  };
  const handleUndo = () => {
    const h = historyRef.current;
    const prev = h.past.pop();
    if (prev == null || lastSnapshotRef.current == null) return;
    h.future.push(lastSnapshotRef.current);
    restoreSnapshot(prev);
    setHistoryDepth({ past: h.past.length, future: h.future.length });
  };
  const handleRedo = () => {
    const h = historyRef.current;
    const next = h.future.pop();
    if (next == null || lastSnapshotRef.current == null) return;
    h.past.push(lastSnapshotRef.current);
    restoreSnapshot(next);
    setHistoryDepth({ past: h.past.length, future: h.future.length });
  };
  const undoRef = useRef(handleUndo);
  const redoRef = useRef(handleRedo);
  undoRef.current = handleUndo;
  redoRef.current = handleRedo;

  useEffect(() => {
    if (!toolsEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redoRef.current();
      else undoRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toolsEnabled]);

  const handleDrawPolygon = () => {
    setSensorPlacementType(null);
    drawRef.current?.changeMode(MapboxDraw.constants.modes.DRAW_POLYGON);
  };

  // Leaving draw_polygon commits the shape when it has >= 3 corners
  // (mapbox-gl-draw fires draw.create on stop), so "Finish" = switch mode.
  const handleFinishDrawing = () => {
    drawRef.current?.changeMode(MapboxDraw.constants.modes.SIMPLE_SELECT);
  };

  // trash() in draw_polygon drops the shape in progress and exits the mode.
  const handleCancelDrawing = () => {
    drawRef.current?.trash();
  };

  const handleSelect = () => {
    setSensorPlacementType(null);
    drawRef.current?.changeMode(MapboxDraw.constants.modes.SIMPLE_SELECT);
  };

  const handleEditVertices = () => {
    setSensorPlacementType(null);
    const d = drawRef.current;
    if (!d) return;
    const ids = d.getSelectedIds();
    if (ids.length !== 1) {
      toast({
        title: t('misc.map.selectSector'),
        description: t('misc.map.selectSectorHint'),
        status: 'info',
        duration: 3000,
      });
      return;
    }
    d.changeMode(MapboxDraw.constants.modes.DIRECT_SELECT, {
      featureId: ids[0],
    });
  };

  const handleDeleteSelected = () => {
    setSensorPlacementType(null);
    const d = drawRef.current;
    if (!d) return;
    const ids = d.getSelectedIds();
    if (ids.length === 0) {
      toast({
        title: t('misc.map.nothingToDelete'),
        description: t('misc.map.selectOneOrMoreSectors'),
        status: 'warning',
        duration: 2500,
      });
      return;
    }
    d.delete(ids);
    syncSectorsAndSensorsRef.current?.();
    toast({
      title: t('misc.map.sectorsDeleted'),
      status: 'success',
      duration: 2000,
    });
  };

  const handleApplySectorRename = () => {
    setSensorPlacementType(null);
    const d = drawRef.current;
    if (!d) return;
    const ids = d.getSelectedIds();
    if (ids.length !== 1) {
      toast({
        title: t('misc.map.onlyOneSector'),
        description: t('misc.map.onlyOneSectorHint'),
        status: 'info',
        duration: 3000,
      });
      return;
    }
    const feat = d.get(ids[0]) as GeoJSON.Feature | undefined;
    if (!feat || !isPolygonFeature(feat)) return;
    const name = renameSectorDraft.trim() || 'Secteur';
    d.setFeatureProperty(ids[0], 'name', name);
    syncSectorsAndSensorsRef.current?.();
    toast({
      title: t('misc.map.sectorRenamed'),
      description: t('misc.map.savedLocally'),
      status: 'success',
      duration: 2200,
    });
  };

  const handleSaveSectorDetails = async (
    body: Omit<SectorWrite, 'name' | 'geometry' | 'color'>
  ) => {
    const drawId = selectedSectorDrawId;
    const serverId = drawId
      ? syncedSectorsRef.current.get(drawId)?.serverId
      : undefined;
    const row =
      serverId != null ? sectorRowsRef.current.get(serverId) : undefined;
    if (serverId == null || !row) return;
    setSectorSaving(true);
    try {
      const updated = await farmMapApi.updateSector(serverId, {
        name: row.name,
        ...body,
      });
      sectorRowsRef.current.set(serverId, updated);
      bumpData();
      toast({
        title: t('misc.map.sectorDetails.saved'),
        status: 'success',
        duration: 2000,
      });
    } catch (e) {
      notifyError(e, 'misc.map.syncFailed');
    } finally {
      setSectorSaving(false);
    }
  };

  const handleSensorSubmit = async (body: SensorInstallationWrite) => {
    const target = modalTarget;
    if (!target) return;
    setModalSaving(true);
    try {
      const row =
        target.mode === 'create'
          ? await farmMapApi.createInstallation(body)
          : await farmMapApi.updateInstallation(target.installation!.id, body);
      installationsRef.current.set(row.id, row);
      syncedSensorRef.current.set(row.id, {
        lng: row.longitude,
        lat: row.latitude,
        sectorId: row.sector_id,
      });
      const feature = installationToFeature(
        row,
        drawIdByServerId(),
        new Map([...sectorRowsRef.current.values()].map((s) => [s.id, s.name]))
      );
      const feats = sensorsFcRef.current.features;
      const idx = feats.findIndex(
        (f) => f.properties.installationId === row.id
      );
      if (idx >= 0) feats[idx] = feature;
      else feats.push(feature);
      setModalTarget(null);
      refreshLabels();
      pushSensors();
      void refreshStatus();
      toast({
        title:
          target.mode === 'create'
            ? t('misc.map.sensorAdded', { name: row.name })
            : t('misc.map.sensorSaved'),
        description: feature.properties.zoneName
          ? t('misc.map.zoneNamed', { zone: feature.properties.zoneName })
          : t('misc.map.outOfDrawnZone'),
        status: 'success',
        duration: 2800,
      });
    } catch (e) {
      notifyError(e, 'misc.map.syncFailed');
    } finally {
      setModalSaving(false);
    }
  };

  const openSensorEditor = (id: string) => {
    const inst = installationsRef.current.get(Number(id));
    const f = sensorsFcRef.current.features.find((x) => String(x.id) === id);
    if (!inst || !f) return;
    const zid = f.properties.zoneId;
    setModalTarget({
      mode: 'edit',
      installation: inst,
      sensorType: inst.sensor_type,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      sectorServerId: zid
        ? (syncedSectorsRef.current.get(zid)?.serverId ?? null)
        : inst.sector_id,
      defaultName: inst.name,
    });
  };

  const removeSensorById = async (id: string) => {
    try {
      await farmMapApi.deleteInstallation(Number(id));
    } catch (e) {
      notifyError(e, 'misc.map.syncFailed');
      return;
    }
    installationsRef.current.delete(Number(id));
    syncedSensorRef.current.delete(Number(id));
    sensorsFcRef.current.features = sensorsFcRef.current.features.filter(
      (f) => String(f.id) !== id
    );
    setSelectedSensorId((s) => (s === id ? null : s));
    refreshLabels();
    pushSensors();
    toast({
      title: t('misc.map.sensorDeleted'),
      status: 'info',
      duration: 2000,
    });
  };

  const focusSensor = (id: string) => {
    setSelectedSensorId(id);
    const f = sensorsFcRef.current.features.find((x) => String(x.id) === id);
    if (f && mapRef.current) {
      mapRef.current.easeTo({
        center: f.geometry.coordinates as [number, number],
        zoom: Math.max(mapRef.current.getZoom(), 17),
        duration: 600,
      });
    }
  };

  const handleExport = () => {
    const rows = [...syncedSectorsRef.current.values()]
      .map((s) => sectorRowsRef.current.get(s.serverId))
      .filter((r): r is MapSector => !!r);
    const blob = new Blob([JSON.stringify(sectorsToGeoJSON(rows), null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secteurs.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    const d = drawRef.current;
    if (!d) return;
    try {
      const imported = parseSectorImport(await file.text());
      const existing = d.getAll().features.filter(isPolygonFeature).length;
      imported.forEach((s, i) => {
        d.add({
          type: 'Feature',
          properties: {
            name: s.name,
            color: s.color ?? colorForSectorIndex(existing + i),
          },
          geometry: s.geometry,
        });
      });
      syncSectorsAndSensorsRef.current?.();
      fitFarm();
      toast({
        title: t('misc.map.importDone', { count: imported.length }),
        status: 'success',
        duration: 3000,
      });
    } catch (e) {
      const code = e instanceof GeoJSONImportError ? e.message : 'invalid_json';
      toast({
        title: t(`misc.map.importError.${code}`),
        status: 'error',
        duration: 4000,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------
  // Derived view data
  // ---------------------------------------------------------------------
  const selectedSector = useMemo(
    () =>
      view.sectors.find((x) => x.drawId === selectedSectorDrawId)?.row ?? null,
    [view, selectedSectorDrawId]
  );

  // Toolbar shortcut to the satellite panel: select a sector (the current
  // one, else the first drawn), frame it, and scroll the panel into view.
  const openSatellite = useCallback(() => {
    const target =
      view.sectors.find((x) => x.drawId === selectedSectorDrawId) ??
      view.sectors.find((x) => x.row?.geometry) ??
      view.sectors[0];
    if (!target) {
      toast({
        title: t('misc.map.ndvi.drawFirst'),
        status: 'info',
        duration: 3500,
      });
      return;
    }
    if (target.drawId !== selectedSectorDrawId) {
      drawRef.current?.changeMode(MapboxDraw.constants.modes.SIMPLE_SELECT, {
        featureIds: [target.drawId],
      });
      setSelectedSectorDrawId(target.drawId);
      setRenameSectorDraft(target.row?.name ?? '');
    }
    zoomToSector(target.drawId);
    window.setTimeout(() => {
      document
        .getElementById('sector-ndvi-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
  }, [view, selectedSectorDrawId, toast, t, zoomToSector]);

  // The NDVI image follows the selected sector: deselecting clears it.
  useEffect(() => {
    if (ndviOverlay && ndviOverlay.sectorId !== selectedSector?.id) {
      setNdviOverlay(null);
    }
  }, [selectedSector, ndviOverlay]);

  const selectedSectorStatus = useMemo(
    () =>
      selectedSector
        ? (view.status?.sectors.find((s) => s.id === selectedSector.id) ?? null)
        : null,
    [view, selectedSector]
  );

  const sectorOptions = useMemo(
    () =>
      view.sectors
        .map(({ row }) => ({ serverId: row.id, name: row.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [view]
  );

  if (!token) {
    return (
      <Alert status="warning" borderRadius="md" fontSize="sm">
        <AlertIcon />
        {t('misc.map.tokenMissingBefore')}{' '}
        <Text as="span" fontWeight="semibold" mx={1}>
          NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        </Text>{' '}
        {t('misc.map.tokenMissingAfter')}
      </Alert>
    );
  }

  return (
    <VStack
      align="stretch"
      spacing={3}
      w="100%"
      h={fillHeight ? '100%' : undefined}
      minH={{ base: '320px', md: '460px' }}
    >
      {loadError ? (
        <Alert status="warning" borderRadius="md" fontSize="sm">
          <AlertIcon />
          {t('misc.map.loadFailedBanner')}
        </Alert>
      ) : null}

      {/* View controls — available to every tier, tools open or not. */}
      <HStack spacing={2} flexWrap="wrap" rowGap={2}>
        <Popover placement="bottom-start" isLazy>
          <PopoverTrigger>
            <Button size="sm" variant="outline" rightIcon={<ChevronDownIcon />}>
              {t('misc.map.layersButton')}
            </Button>
          </PopoverTrigger>
          <PopoverContent w="auto" zIndex={2000}>
            <PopoverArrow />
            <PopoverBody>
              <MapLayerPanel
                basemap={basemap}
                layers={layerPrefs}
                onBasemapChange={handleBasemapChange}
                onLayerChange={handleLayerChange}
              />
            </PopoverBody>
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          variant={measuring ? 'solid' : 'outline'}
          colorScheme={measuring ? 'yellow' : undefined}
          onClick={toggleMeasure}
        >
          {t('misc.map.measure.button')}
        </Button>
        <Button
          size="sm"
          variant={ndviOverlay ? 'solid' : 'outline'}
          colorScheme={ndviOverlay ? 'brand' : undefined}
          onClick={openSatellite}
        >
          {t('misc.map.ndvi.button')}
        </Button>
        <Menu closeOnSelect={false}>
          <MenuButton
            as={Button}
            size="sm"
            variant={isFiltering(sensorFilter) ? 'solid' : 'outline'}
            colorScheme={isFiltering(sensorFilter) ? 'brand' : undefined}
            rightIcon={<ChevronDownIcon />}
          >
            {t('misc.map.filter.button')}
          </MenuButton>
          <MenuList zIndex={2000} maxH="60vh" overflowY="auto" minW="240px">
            <MenuOptionGroup
              title={t('misc.map.filter.types')}
              type="checkbox"
              value={sensorFilter.types ?? SENSOR_TYPE_IDS}
            >
              {SENSOR_TYPE_IDS.map((id) => (
                <MenuItemOption
                  key={id}
                  value={id}
                  onClick={() =>
                    setSensorFilter((f) => ({
                      ...f,
                      types: toggleIn(f.types, id, SENSOR_TYPE_IDS),
                    }))
                  }
                >
                  {t.has(`sensors.${id}`) ? t(`sensors.${id}`) : id}
                </MenuItemOption>
              ))}
            </MenuOptionGroup>
            <MenuOptionGroup
              title={t('misc.map.filter.statuses')}
              type="checkbox"
              value={sensorFilter.statuses ?? SENSOR_STATUS_IDS}
            >
              {SENSOR_STATUS_IDS.map((id) => (
                <MenuItemOption
                  key={id}
                  value={id}
                  onClick={() =>
                    setSensorFilter((f) => ({
                      ...f,
                      statuses: toggleIn(f.statuses, id, SENSOR_STATUS_IDS),
                    }))
                  }
                >
                  {t(`misc.map.status.${id}`)}
                </MenuItemOption>
              ))}
            </MenuOptionGroup>
            <Box px={3} py={2}>
              <Text fontSize="sm" fontWeight={600} mb={1}>
                {t('misc.map.filter.sector')}
              </Text>
              <Select
                size="sm"
                value={sensorFilter.sector}
                onChange={(e) =>
                  setSensorFilter((f) => ({ ...f, sector: e.target.value }))
                }
              >
                <option value="all">{t('misc.map.filter.allSectors')}</option>
                <option value="none">{t('misc.map.filter.noSector')}</option>
                {view.sectors.map((sec) => (
                  <option key={sec.drawId} value={sec.drawId}>
                    {sec.row?.name ?? sec.drawId}
                  </option>
                ))}
              </Select>
            </Box>
            {isFiltering(sensorFilter) ? (
              <MenuItem onClick={() => setSensorFilter(NO_SENSOR_FILTER)}>
                {t('misc.map.filter.reset')}
              </MenuItem>
            ) : null}
          </MenuList>
        </Menu>
        <Button size="sm" variant="outline" onClick={() => fitFarm()}>
          {t('misc.map.fitFarm')}
        </Button>
        {selectedSectorDrawId ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => zoomToSector(selectedSectorDrawId)}
          >
            {t('misc.map.zoomToSector')}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={handleExport}>
          {t('misc.map.exportGeoJSON')}
        </Button>
      </HStack>

      <Collapse in={toolsEnabled} animateOpacity>
        <VStack align="stretch" spacing={3}>
          <Box
            borderRadius="md"
            bg={toolbarBg}
            borderWidth="1px"
            borderColor={toolbarBorder}
            overflow="hidden"
          >
            <Flex
              direction={{ base: 'column', md: 'row' }}
              gap={3}
              flexWrap="wrap"
              align={{ md: 'flex-end' }}
              p={2}
            >
              <HStack flexWrap="wrap" spacing={2} rowGap={2}>
                <Button
                  size="sm"
                  onClick={handleDrawPolygon}
                  colorScheme="brand"
                  variant={drawMode === 'draw_polygon' ? 'solid' : 'outline'}
                >
                  {t('misc.map.draw')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSelect}
                  colorScheme="brand"
                  variant={drawMode === 'simple_select' ? 'solid' : 'outline'}
                >
                  {t('misc.map.select')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleEditVertices}
                  colorScheme="brand"
                  variant={drawMode === 'direct_select' ? 'solid' : 'outline'}
                >
                  {t('misc.map.vertices')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteSelected}
                  colorScheme="red"
                  variant="solid"
                >
                  {t('misc.map.delete')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUndo}
                  isDisabled={historyDepth.past === 0}
                  title={t('misc.map.undoHint')}
                >
                  {t('misc.map.undo')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRedo}
                  isDisabled={historyDepth.future === 0}
                  title={t('misc.map.redoHint')}
                >
                  {t('misc.map.redo')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNow}
                  colorScheme="brand"
                  variant="solid"
                >
                  {t('misc.map.save')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('misc.map.importGeoJSON')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".geojson,.json,application/geo+json,application/json"
                  hidden
                  onChange={(e) => void handleImportFile(e.target.files?.[0])}
                />
              </HStack>

              <FormControl maxW={{ md: '280px' }} flex="1" minW="0">
                <FormLabel mb={1} fontSize="xs">
                  {t('misc.map.nextSectorName')}
                </FormLabel>
                <Input
                  size="sm"
                  placeholder={t('misc.map.sectorNumber', {
                    n: nextAutoSectorIndex,
                  })}
                  value={nextSectorName}
                  onChange={(e) => setNextSectorName(e.target.value)}
                />
              </FormControl>
            </Flex>

            <Collapse in={Boolean(selectedSectorDrawId)} animateOpacity>
              <Box
                px={3}
                pb={3}
                pt={1}
                borderTopWidth="1px"
                borderColor={toolbarBorder}
              >
                <Text fontSize="xs" color="gray.600" mb={2} fontWeight="medium">
                  {t('misc.map.renameSelectedSector')}
                </Text>
                <Flex
                  direction={{ base: 'column', sm: 'row' }}
                  gap={2}
                  align={{ sm: 'flex-end' }}
                  mb={3}
                >
                  <FormControl flex="1" minW={0}>
                    <FormLabel mb={1} fontSize="xs" srOnly>
                      {t('misc.map.newName')}
                    </FormLabel>
                    <Input
                      size="sm"
                      placeholder={t('misc.map.sectorNamePlaceholder')}
                      value={renameSectorDraft}
                      onChange={(e) => setRenameSectorDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplySectorRename();
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    size="sm"
                    colorScheme="brand"
                    alignSelf={{ base: 'stretch', sm: 'flex-end' }}
                    onClick={handleApplySectorRename}
                  >
                    {t('misc.map.applyName')}
                  </Button>
                </Flex>
                <SectorDetailsPanel
                  sector={selectedSector}
                  status={selectedSectorStatus}
                  canEdit={canEdit}
                  isSaving={sectorSaving}
                  onZoom={() =>
                    selectedSectorDrawId && zoomToSector(selectedSectorDrawId)
                  }
                  onSave={(b) => void handleSaveSectorDetails(b)}
                  ndviOverlay={ndviOverlay}
                  onNdviOverlay={setNdviOverlay}
                />
              </Box>
            </Collapse>
          </Box>

          <Divider borderColor={toolbarBorder} />

          <Box>
            <Text fontSize="xs" color="gray.600" mb={2}>
              {t.rich('misc.map.helpText', {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </Text>
            <HStack flexWrap="wrap" spacing={2} align="center" mb={3}>
              <Menu closeOnSelect placement="bottom-start">
                <MenuButton
                  as={Button}
                  size="sm"
                  colorScheme="brand"
                  variant={sensorPlacementType ? 'solid' : 'outline'}
                  rightIcon={<ChevronDownIcon />}
                >
                  {sensorPlacementType
                    ? t(`sensors.${sensorTypeI18nKey(sensorPlacementType)}`)
                    : t('misc.map.chooseSensorType')}
                </MenuButton>
                <MenuList
                  maxH="min(70vh, 340px)"
                  overflowY="auto"
                  zIndex={2000}
                  minW="260px"
                  py={1}
                >
                  <MenuGroup title={t('misc.map.allSensorTypes')}>
                    {SENSOR_TYPES.map((t_) => (
                      <MenuItem
                        key={t_.id}
                        onClick={() => setSensorPlacementType(t_.id)}
                        bg={
                          sensorPlacementType === t_.id ? 'pink.50' : undefined
                        }
                        _dark={{
                          bg:
                            sensorPlacementType === t_.id
                              ? 'whiteAlpha.100'
                              : undefined,
                        }}
                      >
                        <HStack spacing={3} w="100%">
                          <Text fontSize="lg" aria-hidden>
                            {t_.mapSymbol}
                          </Text>
                          <Text fontSize="sm" flex="1">
                            {t(`sensors.${sensorTypeI18nKey(t_.id)}`)}
                          </Text>
                        </HStack>
                      </MenuItem>
                    ))}
                  </MenuGroup>
                </MenuList>
              </Menu>
              {sensorPlacementType ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSensorPlacementType(null)}
                >
                  {t('misc.map.cancelPlacement')}
                </Button>
              ) : null}
            </HStack>

            <Box
              borderWidth="1px"
              borderColor={toolbarBorder}
              borderRadius="md"
              p={2}
              maxH="220px"
              overflowY="auto"
              bg={toolbarBg}
            >
              <Text fontSize="xs" fontWeight="semibold" mb={2} color="gray.600">
                {t('misc.map.placedSensors')}
              </Text>
              {sensorListForUi.length === 0 ? (
                <Text fontSize="xs" color="gray.500">
                  {t('misc.map.noSensorsYet')}
                </Text>
              ) : (
                <VStack align="stretch" spacing={1}>
                  {sensorListForUi.map((f) => {
                    const id = String(f.id ?? '');
                    const p = f.properties;
                    const zone = p.zoneName || t('misc.map.outOfSector');
                    const sel = selectedSensorId === id;
                    return (
                      <Flex
                        key={id}
                        align="center"
                        gap={2}
                        py={1}
                        px={2}
                        borderRadius="md"
                        cursor="pointer"
                        bg={sel ? 'pink.100' : 'transparent'}
                        _dark={{ bg: sel ? 'whiteAlpha.200' : 'transparent' }}
                        onClick={() => focusSensor(id)}
                        justify="space-between"
                      >
                        <HStack spacing={2} flex="1" minW={0}>
                          <Box
                            w="8px"
                            h="8px"
                            borderRadius="full"
                            flexShrink={0}
                            bg={
                              STATUS_COLORS[p.status] ?? STATUS_COLORS.no_data
                            }
                            title={t(`misc.map.status.${p.status}`)}
                          />
                          <Text fontSize="md" aria-hidden>
                            {getSensorTypeMeta(p.sensorType).mapSymbol}
                          </Text>
                          <Text fontSize="sm" fontWeight="medium" isTruncated>
                            {p.name}
                          </Text>
                          {p.valueText ? (
                            <Text
                              fontSize="xs"
                              color="gray.700"
                              _dark={{ color: 'gray.300' }}
                            >
                              {p.valueText}
                            </Text>
                          ) : null}
                          <Text fontSize="xs" color="gray.600" isTruncated>
                            → {zone}
                          </Text>
                        </HStack>
                        <HStack spacing={0}>
                          <IconButton
                            aria-label={t('misc.map.editSensor')}
                            icon={<EditIcon />}
                            size="xs"
                            variant="ghost"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              openSensorEditor(id);
                            }}
                          />
                          <IconButton
                            aria-label={t('misc.map.deleteThisSensor')}
                            icon={<DeleteIcon />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              void removeSensorById(id);
                            }}
                          />
                        </HStack>
                      </Flex>
                    );
                  })}
                </VStack>
              )}
            </Box>
          </Box>

          <Text fontSize="xs" color="gray.500">
            {t('misc.map.bottomHint', { save: t('misc.map.save') })}
          </Text>
        </VStack>
      </Collapse>

      {!toolsEnabled && selectedSector ? (
        <Box
          borderWidth="1px"
          borderColor={toolbarBorder}
          borderRadius="md"
          p={3}
          bg={toolbarBg}
        >
          <SectorDetailsPanel
            sector={selectedSector}
            status={selectedSectorStatus}
            canEdit={false}
            isSaving={false}
            onZoom={() =>
              selectedSectorDrawId && zoomToSector(selectedSectorDrawId)
            }
            onSave={() => {}}
            ndviOverlay={ndviOverlay}
            onNdviOverlay={setNdviOverlay}
          />
        </Box>
      ) : null}

      <Box
        w="100%"
        flex="1"
        minH={{ base: '240px', md: '360px' }}
        position="relative"
        display="flex"
        flexDirection="column"
      >
        {/* Mapbox owns this node's children, so overlays sit in a sibling.
            Flex-sized, not absolute: .mapboxgl-map forces position:relative. */}
        <Box
          ref={containerRef}
          flex="1"
          minH={0}
          w="100%"
          borderRadius="md"
          overflow="hidden"
          borderWidth="1px"
          borderColor={toolbarBorder}
        />
        {toolsEnabled && drawMode === 'draw_polygon' ? (
          <Flex
            position="absolute"
            top={2}
            insetX={2}
            zIndex={2}
            justify="center"
            pointerEvents="none"
          >
            <Flex
              pointerEvents="auto"
              role="status"
              bg={toolbarBg}
              borderWidth="1px"
              borderColor={toolbarBorder}
              borderRadius="md"
              boxShadow="md"
              px={3}
              py={2}
              gap={3}
              align="center"
              flexWrap="wrap"
              maxW="100%"
            >
              <Text fontSize="sm">{t('misc.map.drawingHint')}</Text>
              <HStack spacing={2}>
                <Button
                  size="xs"
                  colorScheme="brand"
                  onClick={handleFinishDrawing}
                >
                  {t('misc.map.finishDrawing')}
                </Button>
                <Button size="xs" variant="ghost" onClick={handleCancelDrawing}>
                  {t('misc.map.cancelDrawing')}
                </Button>
              </HStack>
            </Flex>
          </Flex>
        ) : null}
        {measuring ? (
          <Flex
            position="absolute"
            bottom={8}
            insetX={2}
            zIndex={2}
            justify="center"
            pointerEvents="none"
          >
            <Flex
              pointerEvents="auto"
              role="status"
              bg={toolbarBg}
              borderWidth="1px"
              borderColor={toolbarBorder}
              borderRadius="md"
              boxShadow="md"
              px={3}
              py={2}
              gap={3}
              align="center"
              flexWrap="wrap"
            >
              <Text fontSize="sm">
                {measurePoints.length < 2
                  ? t('misc.map.measure.hint')
                  : t('misc.map.measure.result', {
                      distance: formatDistance(pathLengthM(measurePoints)),
                    })}
                {measurePoints.length >= 3
                  ? ` · ${t('misc.map.measure.area', {
                      area: formatAreaM2(polygonAreaM2(measurePoints)),
                    })}`
                  : ''}
              </Text>
              <HStack spacing={2}>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setMeasurePoints([])}
                  isDisabled={!measurePoints.length}
                >
                  {t('misc.map.measure.clear')}
                </Button>
                <Button size="xs" colorScheme="brand" onClick={toggleMeasure}>
                  {t('misc.map.measure.done')}
                </Button>
              </HStack>
            </Flex>
          </Flex>
        ) : null}
      </Box>

      <SensorInstallationModal
        target={modalTarget}
        sectors={sectorOptions}
        zones={zones}
        sensorKeys={sensorKeys}
        isSaving={modalSaving}
        onClose={() => setModalTarget(null)}
        onSubmit={(b) => void handleSensorSubmit(b)}
      />
    </VStack>
  );
}
