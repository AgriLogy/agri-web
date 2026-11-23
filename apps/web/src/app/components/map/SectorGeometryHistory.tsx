'use client';

/**
 * "Historique du contour" (agri-api#459 phase 3): the sector's saved shapes,
 * newest first (`GET /sectors/{id}/geometry-history`), each restorable after a
 * confirmation (`POST …/{revision}/restore`, editor level — the caller only
 * mounts this for users who may edit; the server 403s technicians anyway).
 */

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import {
  farmMapApi,
  type GeometryRevision,
  type MapSector,
} from '@agri/api-client/farmMapApi';
import { formatArea } from '@/app/lib/farmMap/mapModel';
import { DASH, GEOMETRY_SOURCES, knownCode } from '@/app/lib/farmMap/insights';
import { httpStatus, sortRevisions } from '@/app/lib/farmMap/kmlImport';

interface Props {
  sectorId: number;
  /** Changes whenever the sector's shape changes, to refetch the list. */
  geometryVersion?: string | null;
  onRestored: (sector: MapSector) => void;
}

type Load = 'idle' | 'loading' | 'ready' | 'error';

export default function SectorGeometryHistory({
  sectorId,
  geometryVersion,
  onRestored,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const toast = useToast();
  const border = useColorModeValue('gray.200', 'gray.600');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const [open, setOpen] = useState(false);
  const key = `${sectorId}:${geometryVersion ?? ''}`;
  const [result, setResult] = useState<{
    key: string;
    revs: GeometryRevision[] | null;
  } | null>(null);
  const [pending, setPending] = useState<GeometryRevision | null>(null);
  const [restoring, setRestoring] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    if (!open) return;
    farmMapApi
      .geometryHistory(sectorId)
      .then((r) => alive && setResult({ key, revs: sortRevisions(r) }))
      .catch(() => alive && setResult({ key, revs: null }));
    return () => {
      alive = false;
    };
  }, [open, sectorId, key]);

  const state: Load = !open
    ? 'idle'
    : result?.key !== key
      ? 'loading'
      : result.revs
        ? 'ready'
        : 'error';
  const revs = state === 'ready' ? (result?.revs ?? []) : [];

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };
  const sourceLabel = (s: string) =>
    t(
      `misc.map.shapeHistory.source.${knownCode(s, GEOMETRY_SOURCES) ?? 'other'}`
    );

  const confirmRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    try {
      const updated = await farmMapApi.restoreGeometry(sectorId, pending.id);
      onRestored(updated);
      toast({
        title: t('misc.map.shapeHistory.restored'),
        status: 'success',
        duration: 2500,
      });
      setPending(null);
    } catch (e) {
      toast({
        title: t(
          httpStatus(e) === 403
            ? 'misc.map.shapeHistory.forbidden'
            : 'misc.map.shapeHistory.failed'
        ),
        status: 'error',
        duration: 4000,
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Box borderTopWidth="1px" borderColor={border} pt={2} mt={1}>
      <Button
        size="xs"
        variant="ghost"
        px={1}
        rightIcon={open ? <ChevronUpIcon /> : <ChevronDownIcon />}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {t('misc.map.shapeHistory.title')}
      </Button>
      <Collapse in={open} animateOpacity>
        <Box pt={1}>
          {state === 'loading' ? (
            <Spinner size="xs" />
          ) : state === 'error' ? (
            <Text fontSize="xs" color="red.500">
              {t('misc.map.shapeHistory.loadError')}
            </Text>
          ) : state === 'ready' && !revs.length ? (
            <Text fontSize="xs" color={muted}>
              {t('misc.map.shapeHistory.empty')}
            </Text>
          ) : (
            <VStack align="stretch" spacing={1} maxH="220px" overflowY="auto">
              {revs.map((r, i) => (
                <Flex
                  key={r.id}
                  align="center"
                  justify="space-between"
                  gap={2}
                  fontSize="xs"
                  py={1}
                  borderBottomWidth={i < revs.length - 1 ? '1px' : 0}
                  borderColor={border}
                >
                  <Box minW={0}>
                    <Text>{fmtDate(r.created_at)}</Text>
                    <Text color={muted}>
                      {sourceLabel(r.source)} · {formatArea(r.area_ha) ?? DASH}
                    </Text>
                  </Box>
                  {i === 0 ? (
                    <Badge variant="subtle" colorScheme="green">
                      {t('misc.map.shapeHistory.current')}
                    </Badge>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      isDisabled={!r.geometry}
                      onClick={() => setPending(r)}
                    >
                      {t('misc.map.shapeHistory.restore')}
                    </Button>
                  )}
                </Flex>
              ))}
            </VStack>
          )}
        </Box>
      </Collapse>

      <AlertDialog
        isOpen={!!pending}
        leastDestructiveRef={cancelRef}
        onClose={() => !restoring && setPending(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="md">
              {t('misc.map.shapeHistory.confirmTitle')}
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              {pending
                ? t('misc.map.shapeHistory.confirmBody', {
                    date: fmtDate(pending.created_at),
                    area: formatArea(pending.area_ha) ?? DASH,
                  })
                : null}
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button
                ref={cancelRef}
                size="sm"
                variant="ghost"
                onClick={() => setPending(null)}
                isDisabled={restoring}
              >
                {t('misc.map.shapeHistory.cancel')}
              </Button>
              <Button
                size="sm"
                colorScheme="brand"
                isLoading={restoring}
                onClick={() => void confirmRestore()}
              >
                {t('misc.map.shapeHistory.confirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
