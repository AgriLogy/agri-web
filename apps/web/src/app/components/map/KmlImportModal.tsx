'use client';

/**
 * KML / KMZ sector import (agri-api#459 phase 3,
 * `POST /farm-map/sectors/import-kml`): pick a file → dry run → preview what
 * would be created and what is skipped (with the reason) → confirm (real run)
 * → the map reloads its sectors. Editor level; the toolbar hides the button for
 * monitors and technicians and the server 403s them anyway.
 */

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { farmMapApi, type KmlImportResult } from '@agri/api-client/farmMapApi';
import { formatArea, formatPerimeter } from '@/app/lib/farmMap/mapModel';
import { DASH, knownCode } from '@/app/lib/farmMap/insights';
import {
  apiDetail,
  checkKmlFile,
  createdIds,
  httpStatus,
  KML_ACCEPT,
  KML_SKIP_REASONS,
  previewTotalArea,
} from '@/app/lib/farmMap/kmlImport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** After a confirmed import: ids created (the map refetches its sectors). */
  onImported: (createdIds: number[], count: number) => void | Promise<void>;
}

export default function KmlImportModal({ isOpen, onClose, onImported }: Props) {
  const t = useTranslations();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<KmlImportResult | null>(null);
  const [busy, setBusy] = useState<'idle' | 'preview' | 'import'>('idle');
  const [error, setError] = useState('');

  const describeError = (e: unknown) => {
    if (httpStatus(e) === 403) return t('misc.map.kml.forbidden');
    const detail = apiDetail(e);
    if (httpStatus(e) === 400 && detail)
      return t('misc.map.kml.unreadable', { detail });
    return t('misc.map.kml.failed');
  };

  const pick = async (f: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!f) return;
    setPreview(null);
    setError('');
    setFile(f);
    const problem = checkKmlFile(f);
    if (problem) {
      setError(t(`misc.map.kml.fileProblem.${problem}`));
      return;
    }
    setBusy('preview');
    try {
      setPreview(await farmMapApi.importKml(f, true));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy('idle');
    }
  };

  const confirm = async () => {
    if (!file || !preview?.sectors.length) return;
    setBusy('import');
    setError('');
    try {
      const done = await farmMapApi.importKml(file, false);
      await onImported(createdIds(done), done.sectors.length);
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy('idle');
    }
  };

  const count = preview?.sectors.length ?? 0;
  const total = preview ? previewTotalArea(preview) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => busy !== 'import' && onClose()}
      size="lg"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="md">{t('misc.map.kml.title')}</ModalHeader>
        <ModalCloseButton isDisabled={busy === 'import'} />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            <Text fontSize="xs" color={muted}>
              {t('misc.map.kml.hint')}
            </Text>
            <Box>
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                isDisabled={busy !== 'idle'}
              >
                {t('misc.map.kml.chooseFile')}
              </Button>
              {file ? (
                <Text as="span" fontSize="sm" ms={2} wordBreak="break-all">
                  {file.name}
                </Text>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                accept={KML_ACCEPT}
                hidden
                data-testid="kml-file-input"
                onChange={(e) => void pick(e.target.files?.[0])}
              />
            </Box>

            {busy === 'preview' ? (
              <Flex align="center" gap={2} fontSize="sm">
                <Spinner size="xs" />
                <Text>{t('misc.map.kml.analysing')}</Text>
              </Flex>
            ) : null}
            {error ? (
              <Text fontSize="sm" color="red.500" role="alert">
                {error}
              </Text>
            ) : null}

            {preview ? (
              <>
                <Text fontSize="sm" fontWeight={600}>
                  {t('misc.map.kml.toCreate', { count })}
                  {total != null
                    ? ` · ${t('misc.map.kml.totalArea', {
                        area: formatArea(total) ?? DASH,
                      })}`
                    : ''}
                </Text>
                {count ? (
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>{t('misc.map.kml.colName')}</Th>
                          <Th isNumeric>{t('misc.map.kml.colArea')}</Th>
                          <Th isNumeric>{t('misc.map.kml.colPerimeter')}</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {preview.sectors.map((s, i) => (
                          <Tr key={`${s.name}-${i}`}>
                            <Td>{s.name || DASH}</Td>
                            <Td isNumeric>{formatArea(s.area_ha) ?? DASH}</Td>
                            <Td isNumeric>
                              {formatPerimeter(s.perimeter_m) ?? DASH}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                ) : null}
                {preview.skipped.length ? (
                  <Box>
                    <Text fontSize="sm" fontWeight={600} mb={1}>
                      {t('misc.map.kml.skipped', {
                        count: preview.skipped.length,
                      })}
                    </Text>
                    <VStack align="stretch" spacing={0}>
                      {preview.skipped.map((s, i) => (
                        <Text key={`${s.name}-${i}`} fontSize="xs">
                          {s.name || DASH} —{' '}
                          {t(
                            `misc.map.kml.reason.${
                              knownCode(s.reason, KML_SKIP_REASONS) ?? 'other'
                            }`
                          )}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                ) : null}
              </>
            ) : null}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            isDisabled={busy === 'import'}
          >
            {t('misc.map.kml.cancel')}
          </Button>
          <Button
            size="sm"
            colorScheme="brand"
            onClick={() => void confirm()}
            isDisabled={!count || busy !== 'idle'}
            isLoading={busy === 'import'}
          >
            {t('misc.map.kml.confirm', { count })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
