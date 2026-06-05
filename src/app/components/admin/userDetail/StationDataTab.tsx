'use client';

import { Alert, Button, Empty, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { adminZoneApi, type AdminZone } from '@/app/lib/adminZoneApi';

export type StationDataTabProps = { username: string };

export function StationDataTab({ username }: StationDataTabProps) {
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
    return <Empty description={t('admin.stationData.noZones')} />;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <span>{t('admin.stationData.zoneLabel')}</span>
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
        message={t('admin.stationData.alertTitle')}
        description={
          <Space direction="vertical">
            <span>{t('admin.stationData.alertDescription')}</span>
            <Button
              type="primary"
              href={`/station${zoneId ? `?zone_id=${zoneId}` : ''}`}
              target="_blank"
            >
              {t('admin.stationData.openStationView')}
            </Button>
          </Space>
        }
      />
    </Space>
  );
}

export default StationDataTab;
