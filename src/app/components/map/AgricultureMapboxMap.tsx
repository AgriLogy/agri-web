'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon } from '@chakra-ui/icons';
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
  MenuList,
  Text,
  VStack,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { ensureSectorColorsOnDraw } from '@/app/utils/ensureSectorColorsOnDraw';
import {
  FARM_SENSORS_LAYER_ID,
  FARM_SENSORS_SOURCE_ID,
  loadFarmSensors,
  saveFarmSensors as persistFarmSensors,
  type FarmSensorFeatureCollection,
  type FarmSensorProperties,
} from '@/app/utils/farmSensorsStorage';
import {
  loadFarmSectors,
  saveFarmSectors,
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
  sensorTypeColorMatchExpression,
  sensorTypeI18nKey,
} from '@/app/utils/sensorTypes';

const AGRICULTURE_MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';
const LABEL_SOURCE_ID = 'agrilogy-sector-labels';
const LABEL_LAYER_ID = 'agrilogy-sector-labels-symbol';
const SENSORS_HALO_LAYER_ID = 'agrilogy-sensors-halo';

/** Clone draw state, normalize secteur names, persist to localStorage (same rules as manual Enregistrer). */
function normalizeAndPersistFarmSectorsFromDraw(
  draw: { getAll: () => GeoJSON.FeatureCollection },
  /** Apply this rename on the clone so storage matches even if `getAll()` lags after `setFeatureProperty`. */
  patch?: { featureId: string; name: string } | null
) {
  const fc = JSON.parse(
    JSON.stringify(draw.getAll())
  ) as FarmSectorFeatureCollection;
  if (patch) {
    const pid = String(patch.featureId);
    const patched = patch.name.trim() || 'Secteur';
    for (const f of fc.features) {
      if (f.id != null && String(f.id) === pid) {
        if (!f.properties) f.properties = { name: patched };
        else f.properties.name = patched;
        break;
      }
    }
  }
  for (const f of fc.features) {
    if (!f.properties) f.properties = { name: 'Secteur' };
    if (typeof f.properties.name !== 'string' || !f.properties.name.trim()) {
      f.properties.name = 'Secteur';
    }
  }
  saveFarmSectors(fc);
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

/** Average of ring vertices; null if ring missing or only invalid coords (e.g. polygon mid-draw). */
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

function buildLabelFeatures(
  fc: FarmSectorFeatureCollection
): GeoJSON.Feature[] {
  const out: GeoJSON.Feature[] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    const halo =
      f.properties && isHexColor((f.properties as { color?: unknown }).color)
        ? (f.properties as { color: string }).color
        : '#1a3d1a';
    if (g.type === 'Polygon') {
      const ring = g.coordinates[0];
      const centroid = ringCentroid(ring);
      if (!centroid) continue;
      const name =
        (f.properties &&
          typeof f.properties.name === 'string' &&
          f.properties.name) ||
        'Secteur';
      out.push({
        type: 'Feature',
        properties: { name, halo },
        geometry: { type: 'Point', coordinates: centroid },
      });
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        const ring = poly[0];
        const centroid = ringCentroid(ring);
        if (!centroid) continue;
        const name =
          (f.properties &&
            typeof f.properties.name === 'string' &&
            f.properties.name) ||
          'Secteur';
        out.push({
          type: 'Feature',
          properties: { name, halo },
          geometry: { type: 'Point', coordinates: centroid },
        });
      }
    }
  }
  return out;
}

function syncLabelLayer(map: mapboxgl.Map, fc: FarmSectorFeatureCollection) {
  const src = map.getSource(LABEL_SOURCE_ID) as
    | mapboxgl.GeoJSONSource
    | undefined;
  if (!src) return;
  src.setData({ type: 'FeatureCollection', features: buildLabelFeatures(fc) });
}

function reassignSensorZones(
  sensors: FarmSensorFeatureCollection,
  sectorFeatures: GeoJSON.Feature[]
) {
  for (const f of sensors.features) {
    const g = f.geometry as GeoJSON.Point;
    const z = findContainingSector(
      g.coordinates[0],
      g.coordinates[1],
      sectorFeatures
    );
    const p = f.properties as FarmSensorProperties;
    p.zoneId = z?.zoneId ?? '';
    p.zoneName = z?.zoneName ?? '';
  }
}

function sectorFeatureCentroid(f: GeoJSON.Feature): [number, number] | null {
  const g = f.geometry;
  if (g.type === 'Polygon') {
    const ring = g.coordinates[0];
    return ringCentroid(ring);
  }
  if (g.type === 'MultiPolygon') {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const poly of g.coordinates) {
      const ring = poly[0];
      const cen = ringCentroid(ring);
      if (cen) {
        sx += cen[0];
        sy += cen[1];
        n += 1;
      }
    }
    if (n === 0) return null;
    return [sx / n, sy / n];
  }
  return null;
}

/**
 * When a secteur’s geometry moves, shift captors that belong to that secteur (`zoneId`)
 * by the same centroid delta so markers stay inside / aligned with their zone.
 */
function shiftSensorsWithSectorMotion(
  sensors: FarmSensorFeatureCollection,
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
          const p = sf.properties as FarmSensorProperties;
          if (p.zoneId === id) {
            const pt = sf.geometry as GeoJSON.Point;
            pt.coordinates[0] += dLng;
            pt.coordinates[1] += dLat;
          }
        }
      }
    }
  }
  centroidPrevBySectorId.clear();
  next.forEach((v, k) => centroidPrevBySectorId.set(k, v));
}

interface AgricultureMapboxMapProps {
  lat: number;
  lon: number;
  showToolsPanel?: boolean;
}

export default function AgricultureMapboxMap({
  lat,
  lon,
  showToolsPanel = true,
}: AgricultureMapboxMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingNameRef = useRef('');
  const sectorIndexRef = useRef(1);
  const sensorsFcRef = useRef<FarmSensorFeatureCollection>(
    typeof window !== 'undefined'
      ? (loadFarmSensors() ?? { type: 'FeatureCollection', features: [] })
      : { type: 'FeatureCollection', features: [] }
  );
  const placingSensorTypeRef = useRef<string | null>(null);
  const sensorInstanceCounterRef = useRef(0);
  const bumpSensorListRef = useRef<() => void>(() => {});
  const setSelectedSensorIdRef = useRef<(id: string | null) => void>(() => {});
  const selectedSensorIdRef = useRef<string | null>(null);
  /** Last known secteur centroids (draw feature id → lng/lat) for captor motion on polygon edit. */
  const sectorCentroidPrevRef = useRef<Map<string, [number, number]>>(
    new Map()
  );
  /** Set in map effect: refreshes labels, capteur zones, persistence (e.g. after programmatic rename). */
  const syncSectorsAndSensorsRef = useRef<(() => void) | null>(null);
  /** One-shot secteur rename applied while persisting to localStorage (Mapbox Draw / getAll timing). */
  const pendingSectorNamePatchRef = useRef<{
    featureId: string;
    name: string;
  } | null>(null);

  const [nextSectorName, setNextSectorName] = useState('');
  const [drawMode, setDrawMode] = useState<string>('simple_select');
  const [nextAutoSectorIndex, setNextAutoSectorIndex] = useState(1);
  const [sensorPlacementType, setSensorPlacementType] = useState<string | null>(
    null
  );
  const [sensorListForUi, setSensorListForUi] = useState<GeoJSON.Feature[]>(
    () => {
      if (typeof window === 'undefined') return [];
      return loadFarmSensors()?.features ?? [];
    }
  );
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [renameSectorDraft, setRenameSectorDraft] = useState('');
  const [selectedSectorIdForRename, setSelectedSectorIdForRename] = useState<
    string | null
  >(null);

  const t = useTranslations();
  const toast = useToast();
  const { colorMode } = useColorMode();
  const toolbarBg = useColorModeValue('whiteAlpha.900', 'blackAlpha.600');
  const toolbarBorder = useColorModeValue('gray.200', 'gray.600');

  const pushLabelsFromDraw = useCallback(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw) return;
    syncLabelLayer(map, draw.getAll() as FarmSectorFeatureCollection);
  }, []);

  useEffect(() => {
    pendingNameRef.current = nextSectorName;
  }, [nextSectorName]);

  useEffect(() => {
    placingSensorTypeRef.current = sensorPlacementType;
  }, [sensorPlacementType]);

  useEffect(() => {
    bumpSensorListRef.current = () =>
      setSensorListForUi(
        sensorsFcRef.current.features.map((f) => ({
          ...f,
          properties: {
            ...(f.properties && typeof f.properties === 'object'
              ? (f.properties as Record<string, unknown>)
              : {}),
          },
        }))
      );
  }, []);

  useEffect(() => {
    setSelectedSensorIdRef.current = setSelectedSensorId;
  }, [setSelectedSensorId]);

  useEffect(() => {
    selectedSensorIdRef.current = selectedSensorId;
  }, [selectedSensorId]);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) {
      canvas.style.cursor = sensorPlacementType ? 'crosshair' : '';
    }
  }, [sensorPlacementType]);

  const removeSensorById = useCallback(
    (id: string) => {
      sensorsFcRef.current.features = sensorsFcRef.current.features.filter(
        (f) => String(f.id) !== id
      );
      const src = mapRef.current?.getSource(FARM_SENSORS_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      src?.setData(sensorsFcRef.current);
      persistFarmSensors(sensorsFcRef.current);
      setSelectedSensorId((s) => (s === id ? null : s));
      bumpSensorListRef.current();
      toast({
        title: t('misc.map.sensorDeleted'),
        status: 'info',
        duration: 2000,
      });
    },
    [toast, t]
  );

  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: AGRICULTURE_MAP_STYLE,
      center: [lon, lat],
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: true }),
      'top-right'
    );

    const drawOptions: MapboxDraw.MapboxDrawOptions & {
      suppressAPIEvents?: boolean;
    } = {
      displayControlsDefault: false,
      defaultMode: MapboxDraw.constants.modes.SIMPLE_SELECT,
      userProperties: true,
      /** So `setFeatureProperty` (rename) emits `draw.update` and Draw redraws; default `true` swallows API events. */
      suppressAPIEvents: false,
      styles: sectorMapDrawStyles,
    };
    const draw = new MapboxDraw(drawOptions);

    map.addControl(draw, 'top-left');
    mapRef.current = map;
    drawRef.current = draw;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    const loadedSensors = loadFarmSensors();
    sensorsFcRef.current =
      loadedSensors && Array.isArray(loadedSensors.features)
        ? loadedSensors
        : { type: 'FeatureCollection', features: [] };
    sensorInstanceCounterRef.current = sensorsFcRef.current.features.length;
    setSensorListForUi([...sensorsFcRef.current.features]);

    const syncSectorsAndSensors = () => {
      const d = drawRef.current;
      const m = mapRef.current;
      if (!d || !m?.getSource(FARM_SENSORS_SOURCE_ID)) return;
      const allSectorFeats = d.getAll().features;
      const remainingSectorIds = new Set(
        allSectorFeats
          .filter(
            (f) =>
              f.geometry.type === 'Polygon' ||
              f.geometry.type === 'MultiPolygon'
          )
          .map((f) => (f.id != null ? String(f.id) : ''))
          .filter(Boolean)
      );
      sensorsFcRef.current.features = sensorsFcRef.current.features.filter(
        (sf) => {
          const zid = (sf.properties as FarmSensorProperties).zoneId ?? '';
          if (!zid) return true;
          return remainingSectorIds.has(zid);
        }
      );
      const sensorIds = new Set(
        sensorsFcRef.current.features.map((f) => String(f.id ?? ''))
      );
      const sel = selectedSensorIdRef.current;
      if (sel && !sensorIds.has(sel)) {
        setSelectedSensorIdRef.current(null);
      }

      const polys = allSectorFeats.filter(
        (f) =>
          f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
      );
      shiftSensorsWithSectorMotion(
        sensorsFcRef.current,
        polys,
        sectorCentroidPrevRef.current
      );
      ensureSectorColorsOnDraw(d);
      const sectorsForLookup = d.getAll().features;
      syncLabelLayer(m, d.getAll() as FarmSectorFeatureCollection);
      reassignSensorZones(sensorsFcRef.current, sectorsForLookup);
      (m.getSource(FARM_SENSORS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
        sensorsFcRef.current
      );
      persistFarmSensors(sensorsFcRef.current);
      const sectorPatch = pendingSectorNamePatchRef.current;
      pendingSectorNamePatchRef.current = null;
      normalizeAndPersistFarmSectorsFromDraw(d, sectorPatch);
      bumpSensorListRef.current();
    };

    syncSectorsAndSensorsRef.current = syncSectorsAndSensors;

    const DRAG_THRESHOLD_PX = 8;
    let sensorDrag: {
      index: number;
      start: mapboxgl.Point;
      moved: boolean;
    } | null = null;

    const onSensorMouseDown = (e: mapboxgl.MapLayerMouseEvent) => {
      if (placingSensorTypeRef.current) return;
      const f = e.features?.[0];
      if (!f?.id) return;
      const id = String(f.id);
      const idx = sensorsFcRef.current.features.findIndex(
        (x) => String(x.id) === id
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
      const ll = e.lngLat;
      const g = sensorsFcRef.current.features[sensorDrag.index]
        ?.geometry as GeoJSON.Point;
      if (g) {
        g.coordinates = [ll.lng, ll.lat];
        const src = map.getSource(
          FARM_SENSORS_SOURCE_ID
        ) as mapboxgl.GeoJSONSource;
        src.setData(sensorsFcRef.current);
      }
    };

    const onMapMouseUpSensor = () => {
      if (!sensorDrag) return;
      const { index, moved } = sensorDrag;
      const id = String(sensorsFcRef.current.features[index]?.id ?? '');
      if (!moved) {
        setSelectedSensorIdRef.current(id);
      } else {
        const drawInst = drawRef.current;
        const g = sensorsFcRef.current.features[index]
          ?.geometry as GeoJSON.Point;
        if (g && drawInst) {
          const z = findContainingSector(
            g.coordinates[0],
            g.coordinates[1],
            drawInst.getAll().features
          );
          const p = sensorsFcRef.current.features[index]
            .properties as FarmSensorProperties;
          p.zoneId = z?.zoneId ?? '';
          p.zoneName = z?.zoneName ?? '';
        }
        persistFarmSensors(sensorsFcRef.current);
        bumpSensorListRef.current();
        toast({
          title: t('misc.map.sensorMoved'),
          description: t('misc.map.zoneRecalculated'),
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

    const sensorPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: 'agrilogy-sensor-popup',
    });

    const onSensorMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      if (!placingSensorTypeRef.current) {
        map.getCanvas().style.cursor = 'grab';
      }
      const f = e.features[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      const props = f.properties as
        | Record<string, string | undefined>
        | undefined;
      const name = props?.name ?? t('misc.map.sensor');
      const typeKey = props?.sensorType ?? '';
      const typeLabel = typeKey
        ? t(`sensors.${sensorTypeI18nKey(typeKey)}`)
        : t('misc.map.sensor');
      const zoneName = props?.zoneName;
      const zoneLine =
        zoneName && zoneName.length > 0
          ? `<div style="margin-top:4px;font-size:11px;opacity:0.9">${escapeHtml(t('misc.map.zoneLabel', { zone: zoneName }))}</div>`
          : `<div style="margin-top:4px;font-size:11px;opacity:0.85">${escapeHtml(t('misc.map.outOfZone'))}</div>`;
      sensorPopup
        .setLngLat(coords)
        .setHTML(
          `<div style="padding:2px 4px;font-size:13px;line-height:1.35"><strong>${escapeHtml(name)}</strong><div style="font-size:11px;opacity:0.9;margin-top:2px">${escapeHtml(typeLabel)}</div>${zoneLine}</div>`
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

    const onCanvasClickCapture = (domEv: MouseEvent) => {
      if (!placingSensorTypeRef.current) return;
      domEv.stopPropagation();
      domEv.stopImmediatePropagation();
      const drawInst = drawRef.current;
      if (!drawInst) return;
      const canvasEl = map.getCanvas();
      const rect = canvasEl.getBoundingClientRect();
      const x = domEv.clientX - rect.left;
      const y = domEv.clientY - rect.top;
      const lngLat = map.unproject([x, y]);
      const zone = findContainingSector(
        lngLat.lng,
        lngLat.lat,
        drawInst.getAll().features
      );
      const typeId = placingSensorTypeRef.current;
      if (!typeId) return;
      sensorInstanceCounterRef.current += 1;
      const typeName = typeId
        ? t(`sensors.${sensorTypeI18nKey(typeId)}`)
        : t('misc.map.sensor');
      const name = `${typeName} ${sensorInstanceCounterRef.current}`;
      const sid = `sensor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const props: FarmSensorProperties = {
        name,
        sensorType: typeId,
        zoneId: zone?.zoneId ?? '',
        zoneName: zone?.zoneName ?? '',
      };
      const feat: GeoJSON.Feature<GeoJSON.Point, FarmSensorProperties> = {
        type: 'Feature',
        id: sid,
        properties: props,
        geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] },
      };
      sensorsFcRef.current.features.push(feat);
      const ssrc = map.getSource(
        FARM_SENSORS_SOURCE_ID
      ) as mapboxgl.GeoJSONSource;
      ssrc.setData(sensorsFcRef.current);
      persistFarmSensors(sensorsFcRef.current);
      bumpSensorListRef.current();
      toast({
        title: t('misc.map.sensorAdded', { name }),
        description: zone
          ? t('misc.map.zoneNamed', { zone: zone.zoneName })
          : t('misc.map.outOfDrawnZone'),
        status: 'success',
        duration: 2800,
      });
    };

    const onLoad = async () => {
      map.addSource(FARM_SENSORS_SOURCE_ID, {
        type: 'geojson',
        data: sensorsFcRef.current,
      });

      map.addLayer({
        id: SENSORS_HALO_LAYER_ID,
        type: 'circle',
        source: FARM_SENSORS_SOURCE_ID,
        paint: {
          'circle-radius': 11,
          'circle-color':
            sensorTypeColorMatchExpression() as mapboxgl.ExpressionSpecification,
          'circle-opacity': 0.22,
          'circle-blur': 0.45,
        },
      });

      try {
        await registerSensorMapImages(map);
        map.addLayer({
          id: FARM_SENSORS_LAYER_ID,
          type: 'symbol',
          source: FARM_SENSORS_SOURCE_ID,
          layout: {
            'icon-image':
              sensorTypeIconImageMatchExpression() as mapboxgl.ExpressionSpecification,
            'icon-size': 0.32,
            'icon-anchor': 'center',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: {
            'icon-opacity': 1,
          },
        });
      } catch (e) {
        console.error('Capteurs: icônes carte indisponibles', e);
      }

      map.addSource(LABEL_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

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

      map.on('mouseenter', SENSORS_HALO_LAYER_ID, onSensorMouseEnter);
      map.on('mouseleave', SENSORS_HALO_LAYER_ID, onSensorMouseLeave);
      map.on('mousedown', SENSORS_HALO_LAYER_ID, onSensorMouseDown);
      map.on('mousemove', onMapMouseMoveSensor);
      map.on('mouseup', onMapMouseUpSensor);
      map.getCanvas().addEventListener('click', onCanvasClickCapture, true);

      if (placingSensorTypeRef.current) {
        map.getCanvas().style.cursor = 'crosshair';
      } else {
        map.getCanvas().style.cursor = 'grab';
      }

      const saved = loadFarmSectors();
      if (saved && saved.features.length > 0) {
        draw.set(saved);
        ensureSectorColorsOnDraw(draw);
        const maxN = saved.features.reduce((acc, f) => {
          const m = /^Secteur\s+(\d+)$/.exec(
            (f.properties?.name as string | undefined) ?? ''
          );
          return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
        }, 0);
        sectorIndexRef.current = maxN + 1;
        setNextAutoSectorIndex(maxN + 1);
      }

      syncSectorsAndSensors();
    };

    map.on('load', onLoad);

    const onCreate = (e: { features: GeoJSON.Feature[] }) => {
      const f = e.features[0];
      const id = String(f.id ?? '');
      if (!id) return;
      /**
       * `draw.set(saved)` from localStorage calls the same add path as a new draw and fires
       * `draw.create` per feature. Skip auto "Secteur N" / palette when props already exist.
       */
      const rawName =
        f.properties &&
        typeof (f.properties as { name?: unknown }).name === 'string'
          ? (f.properties as { name: string }).name
          : '';
      const existingName = rawName.trim();
      const storedColor =
        f.properties && (f.properties as { color?: unknown }).color;

      if (existingName) {
        const m = /^Secteur\s+(\d+)$/i.exec(existingName);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!Number.isNaN(n)) {
            sectorIndexRef.current = Math.max(sectorIndexRef.current, n + 1);
            setNextAutoSectorIndex(sectorIndexRef.current);
          }
        }
      } else {
        const name =
          pendingNameRef.current.trim() || `Secteur ${sectorIndexRef.current}`;
        if (!pendingNameRef.current.trim()) {
          sectorIndexRef.current += 1;
          setNextAutoSectorIndex(sectorIndexRef.current);
        }
        draw.setFeatureProperty(id, 'name', name);
      }

      if (!isHexColor(storedColor)) {
        const polys = draw
          .getAll()
          .features.filter(
            (feat) =>
              feat.geometry.type === 'Polygon' ||
              feat.geometry.type === 'MultiPolygon'
          );
        const colorIdx = Math.max(0, polys.length - 1);
        draw.setFeatureProperty(id, 'color', colorForSectorIndex(colorIdx));
      }

      setNextSectorName('');
      pendingNameRef.current = '';
      syncSectorsAndSensors();
    };

    const onSelectionChange = (e: { features: GeoJSON.Feature[] }) => {
      const fs = e.features ?? [];
      if (fs.length === 1) {
        const g0 = fs[0].geometry;
        if (g0.type === 'Polygon' || g0.type === 'MultiPolygon') {
          const sid = fs[0].id != null ? String(fs[0].id) : null;
          const n =
            fs[0].properties &&
            typeof (fs[0].properties as { name?: unknown }).name === 'string'
              ? (fs[0].properties as { name: string }).name
              : '';
          setSelectedSectorIdForRename(sid);
          setRenameSectorDraft(n);
          return;
        }
      }
      setSelectedSectorIdForRename(null);
      setRenameSectorDraft('');
    };

    map.on('draw.create', onCreate);
    map.on('draw.update', syncSectorsAndSensors);
    map.on('draw.delete', syncSectorsAndSensors);
    map.on('draw.selectionchange', onSelectionChange);
    map.on('draw.modechange', (e: { mode: string }) => setDrawMode(e.mode));

    return () => {
      resizeObserver.disconnect();
      map.off('load', onLoad);
      map.off('mouseenter', SENSORS_HALO_LAYER_ID, onSensorMouseEnter);
      map.off('mouseleave', SENSORS_HALO_LAYER_ID, onSensorMouseLeave);
      map.off('mousedown', SENSORS_HALO_LAYER_ID, onSensorMouseDown);
      map.off('mousemove', onMapMouseMoveSensor);
      map.off('mouseup', onMapMouseUpSensor);
      map.getCanvas()?.removeEventListener('click', onCanvasClickCapture, true);
      sensorPopup.remove();
      map.off('draw.create', onCreate);
      map.off('draw.update', syncSectorsAndSensors);
      map.off('draw.delete', syncSectorsAndSensors);
      map.off('draw.selectionchange', onSelectionChange);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      syncSectorsAndSensorsRef.current = null;
    };
  }, [token, lat, lon, pushLabelsFromDraw, toast, t]);

  useEffect(() => {
    if (showToolsPanel) return;
    drawRef.current?.changeMode(MapboxDraw.constants.modes.SIMPLE_SELECT);
  }, [showToolsPanel]);

  /* Re-sync Mapbox canvas size after Chakra color-mode transition settles. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.resize(), 400);
    return () => window.clearTimeout(id);
  }, [colorMode]);

  const handleSave = () => {
    const draw = drawRef.current;
    if (!draw) return;
    normalizeAndPersistFarmSectorsFromDraw(draw);
    persistFarmSensors(sensorsFcRef.current);
    toast({
      title: t('misc.map.sectorsAndSensorsSaved'),
      status: 'success',
      duration: 2500,
    });
  };

  const handleDrawPolygon = () => {
    setSensorPlacementType(null);
    drawRef.current?.changeMode(MapboxDraw.constants.modes.DRAW_POLYGON);
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
    pushLabelsFromDraw();
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
    if (!feat) return;
    const g = feat.geometry;
    if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return;

    let name = renameSectorDraft.trim();
    if (!name) name = 'Secteur';
    const fid = String(ids[0]);
    pendingSectorNamePatchRef.current = { featureId: fid, name };
    d.setFeatureProperty(ids[0], 'name', name);
    /* If `draw.update` ran synchronously, sync already consumed the patch. Otherwise run once. */
    if (pendingSectorNamePatchRef.current != null) {
      syncSectorsAndSensorsRef.current?.();
    }
    toast({
      title: t('misc.map.sectorRenamed'),
      description: t('misc.map.savedLocally'),
      status: 'success',
      duration: 2200,
    });
  };

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
      minH={{ base: '320px', md: '460px' }}
    >
      <Collapse in={showToolsPanel} animateOpacity>
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
                  onClick={handleSave}
                  colorScheme="brand"
                  variant="solid"
                >
                  {t('misc.map.save')}
                </Button>
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

            <Collapse in={Boolean(selectedSectorIdForRename)} animateOpacity>
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
                    variant="solid"
                    alignSelf={{ base: 'stretch', sm: 'flex-end' }}
                    onClick={handleApplySectorRename}
                  >
                    {t('misc.map.applyName')}
                  </Button>
                </Flex>
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
              maxH="200px"
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
                    const p = f.properties as FarmSensorProperties | undefined;
                    const name = p?.name ?? '—';
                    const zone =
                      p?.zoneName && p.zoneName.length > 0
                        ? p.zoneName
                        : t('misc.map.outOfSector');
                    const sym = getSensorTypeMeta(
                      p?.sensorType ?? ''
                    ).mapSymbol;
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
                        onClick={() => setSelectedSensorId(id)}
                        justify="space-between"
                      >
                        <HStack spacing={2} flex="1" minW={0}>
                          <Text fontSize="md" aria-hidden>
                            {sym}
                          </Text>
                          <Text fontSize="sm" fontWeight="medium" isTruncated>
                            {name}
                          </Text>
                          <Text fontSize="xs" color="gray.600" isTruncated>
                            → {zone}
                          </Text>
                        </HStack>
                        <IconButton
                          aria-label={t('misc.map.deleteThisSensor')}
                          icon={<DeleteIcon />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            removeSensorById(id);
                          }}
                        />
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

      <Box
        ref={containerRef}
        w="100%"
        flex="1"
        minH={{ base: '240px', md: '360px' }}
        borderRadius="md"
        overflow="hidden"
        position="relative"
        borderWidth="1px"
        borderColor={toolbarBorder}
        sx={{
          '& .mapboxgl-ctrl-logo': { display: 'none !important' },
          '& .mapboxgl-ctrl-attrib': { display: 'none !important' },
          '& .mapboxgl-ctrl-attrib-button': { display: 'none !important' },
        }}
      />
    </VStack>
  );
}
