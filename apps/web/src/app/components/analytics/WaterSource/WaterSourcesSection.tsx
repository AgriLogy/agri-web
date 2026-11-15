import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { FaPlus } from 'react-icons/fa';
import { GiWaterTank } from 'react-icons/gi';
import {
  waterLevelApi,
  type WaterSourceWithStatus,
} from '@agri/api-client/waterLevelApi';
import type { ZoneOption } from '@/app/components/layout/ZoneSelect';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import WaterSourceCard from './WaterSourceCard';
import WaterSourceFormModal from './WaterSourceFormModal';

/**
 * Water Station: one card per configured well / basin / tank (agrilogy-front
 * #261). Independent of the zone picker — a source can supply several zones.
 */
const WaterSourcesSection = ({ zones }: { zones: ZoneOption[] }) => {
  const t = useTranslations('analytics.waterSource');
  const muted = useColorModeValue('gray.500', 'gray.400');
  const [sources, setSources] = useState<WaterSourceWithStatus[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<WaterSourceWithStatus | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const modal = useDisclosure();

  const load = useCallback(() => {
    waterLevelApi
      .list()
      .then((rows) => {
        setSources(rows);
        setFailed(false);
      })
      .catch((e) => {
        logOptionalApiFailure('WaterSourcesSection: list', e);
        setFailed(true);
        setSources((s) => s ?? []);
      });
  }, []);

  useEffect(load, [load]);

  const zoneName = (id: number) => zones.find((z) => z.id === id)?.name;
  const open = (source: WaterSourceWithStatus | null) => {
    setEditing(source);
    setOpenCount((n) => n + 1);
    modal.onOpen();
  };

  return (
    <Box w="100%">
      <Flex justify="space-between" align="center" mb={3} gap={2} wrap="wrap">
        <Box>
          <Text fontWeight="bold" fontSize="lg">
            {t('sectionTitle')}
          </Text>
          <Text fontSize="sm" color={muted}>
            {t('sectionSubtitle')}
          </Text>
        </Box>
        <Button
          size="sm"
          colorScheme="blue"
          leftIcon={<FaPlus />}
          onClick={() => open(null)}
        >
          {t('add')}
        </Button>
      </Flex>

      {sources == null ? (
        <Flex justify="center" py={8}>
          <Spinner />
        </Flex>
      ) : sources.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          py={8}
          gap={2}
          textAlign="center"
        >
          <GiWaterTank size={40} />
          <Text fontWeight="semibold">
            {failed ? t('loadFailed') : t('emptyTitle')}
          </Text>
          {!failed && (
            <Text fontSize="sm" color={muted} maxW="md">
              {t('emptyHint')}
            </Text>
          )}
        </Flex>
      ) : (
        <Stack spacing={4}>
          {sources.map((s) => (
            <WaterSourceCard
              key={`${s.id}-${s.updated_at}`}
              source={s}
              zoneNames={s.zone_ids
                .map(zoneName)
                .filter((n): n is string => Boolean(n))}
              onEdit={() => open(s)}
            />
          ))}
        </Stack>
      )}

      <WaterSourceFormModal
        key={openCount}
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        source={editing}
        zones={zones}
        onSaved={load}
      />
    </Box>
  );
};

export default WaterSourcesSection;
