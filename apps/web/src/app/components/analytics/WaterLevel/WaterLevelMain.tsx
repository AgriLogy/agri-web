import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { useFrequencySeries } from '../../common/ChartFrequencyContext';
import { SensorData } from '@/app/types';
import api from '@agri/api-client/api';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import {
  distanceToBasinPoint,
  rawToMetres,
  resolveBasin,
  type BasinGeometryRect,
} from '@/app/utils/basinVolume';
import WaterLevelChart, { type BasinChartRow } from './WaterLevelChart';
import WaterLevelLastData, { type BasinGeometry } from './WaterLevelLastData';
import BasinConfigForm, { readBasinOverride } from './BasinConfigForm';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

const mergeGeom = (
  zone: BasinGeometry,
  local: BasinGeometryRect | null
): BasinGeometry =>
  ({
    lengthM: zone.lengthM ?? local?.lengthM ?? null,
    widthM: zone.widthM ?? local?.widthM ?? null,
    heightM: zone.heightM ?? local?.heightM ?? null,
    sensorToMaxM: zone.sensorToMaxM ?? local?.sensorToMaxM ?? null,
    maxDepthM: zone.maxDepthM ?? null,
    areaM2: zone.areaM2 ?? null,
    offsetM: zone.offsetM ?? null,
  }) as BasinGeometry;

const WaterLevelMain = ({
  filters,
  basin = {},
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
  // Optional: when basin dimensions aren't available the section still renders
  // the raw level + chart; the basin-fill/capacity viz only shows with geometry.
  basin?: BasinGeometry;
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [override, setOverride] = useState<BasinGeometryRect | null>(null);

  useEffect(() => {
    setOverride(readBasinOverride(selectedZone));
  }, [selectedZone]);

  useEffect(() => {
    const params = {
      start_date: startDate,
      end_date: endDate,
      zone: selectedZone,
    };
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<SensorData[]>('/sensors/waterlevel', {
          params,
        });
        if (cancelled) return;
        setData(res.data ?? []);
      } catch (error) {
        logOptionalApiFailure('WaterLevelMain: waterlevel', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, selectedZone]);

  const geom = useMemo(
    () => mergeGeom(basin, override),

    [basin, override]
  );
  const resolved = useMemo(() => resolveBasin(geom), [geom]);

  // Raw D(t) -> volume litres + fill% per point (chart evolution).
  const volumeRows: BasinChartRow[] = useMemo(
    () =>
      data.flatMap((item) => {
        if (typeof item.value !== 'number') return [];
        const dM = rawToMetres(item.value, item.default_unit);
        const p = distanceToBasinPoint(dM, resolved);
        if (!p) return [];
        return [
          {
            timestamp: item.timestamp,
            distance: item.value,
            waterHeight: p.hM,
            fillPct: p.fillPct,
            volumeL: p.volumeL,
          },
        ];
      }),
    [data, resolved]
  );

  const { series: sortedData, timeline } = useFrequencySeries(volumeRows);

  return (
    <ChartLastDataShell
      spacing={2}
      direction={{ base: 'column', md: 'row' }}
      align="start"
      width="100%"
      className="Box"
      maxH={CHART_SHELL_MAX_HEIGHT}
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={2} align="stretch" width="100%">
                <WaterLevelChart
                  data={sortedData.slice(startIdx, endIdx + 1)}
                  loading={loading}
                  vMaxL={resolved.vMaxL}
                  hasGeometry={resolved.hMaxM != null}
                />
                <ChartDateRangeDragger
                  timestamps={timeline}
                  startIdx={startIdx}
                  endIdx={endIdx}
                  onChange={(r) => setRange(r)}
                />
                <BasinConfigForm
                  zoneId={selectedZone}
                  initial={geom}
                  onChange={setOverride}
                />
              </VStack>
            )}
          </ChartDateRangeGate>
        </Box>
      }
      lastData={
        <Box
          flex={1}
          p={3}
          width="100%"
          minW={0}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="stretch"
        >
          <WaterLevelLastData data={data} basin={geom} />
        </Box>
      }
    />
  );
};

export default WaterLevelMain;
