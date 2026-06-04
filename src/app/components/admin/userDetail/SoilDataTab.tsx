'use client';

import { Alert, Button, Empty, Select, Space } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { adminZoneApi, type AdminZone } from '@/app/lib/adminZoneApi';

export type SoilDataTabProps = { username: string };

/**
 * Admin read-only soil charts. Until the back exposes
 * `POST /users<u>/sensor-data/` (Sprint 7 backend), this
 * tab points at the user-facing /soil page with a zone preselected.
 */
export function SoilDataTab({ username }: SoilDataTabProps) {
  const t = useTranslations();
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [zoneId, setZoneId] = useState<number | null>(null);

  useEffect(() => {
    void adminZoneApi.list(username).then((rows) => {
      setZones(rows);
      if (rows.length > 0) setZoneId(rows[0].id);
    });
  }, [username]);

  if (zones.length === 0) {
    return <Empty description={t('admin.soilDataTab.noZonesCreateInTab')} />;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <span>{t('admin.soilDataTab.zoneLabel')}</span>
        <Select<number>
          value={zoneId ?? undefined}
          onChange={setZoneId}
          options={zones.map((z) => ({ value: z.id, label: z.name }))}
          style={{ minWidth: 220 }}
        />
      </Space>

      <Alert
        type="info"
        showIcon
        message={t('admin.soilDataTab.alertTitle')}
        description={
          <Space direction="vertical">
            <span>{t('admin.soilDataTab.alertDescription')}</span>
            <Button
              type="primary"
              href={`/soil${zoneId ? `?zone_id=${zoneId}` : ''}`}
              target="_blank"
            >
              {t('admin.soilDataTab.openSoilView')}
            </Button>
          </Space>
        }
      />
    </Space>
  );
}

export default SoilDataTab;
