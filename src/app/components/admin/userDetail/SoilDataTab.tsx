'use client';

import { Alert, Button, Empty, Select, Space } from 'antd';
import { useEffect, useState } from 'react';

import { adminZoneApi, type AdminZone } from '@/app/lib/adminZoneApi';

export type SoilDataTabProps = { username: string };

/**
 * Admin read-only soil charts. Until the back exposes
 * `POST /users<u>/sensor-data/` (Sprint 7 backend), this
 * tab points at the user-facing /soil page with a zone preselected.
 */
export function SoilDataTab({ username }: SoilDataTabProps) {
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [zoneId, setZoneId] = useState<number | null>(null);

  useEffect(() => {
    void adminZoneApi.list(username).then((rows) => {
      setZones(rows);
      if (rows.length > 0) setZoneId(rows[0].id);
    });
  }, [username]);

  if (zones.length === 0) {
    return (
      <Empty description="Aucune zone — créez-en une dans l’onglet Zones" />
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <span>Zone :</span>
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
        message="Visualisation des données du sol"
        description={
          <Space direction="vertical">
            <span>
              Les graphiques détaillés (humidité, température, pH, conductivité,
              irrigation) sont consultables depuis la vue utilisateur —
              l’endpoint admin global est en cours d’expédition côté back.
            </span>
            <Button
              type="primary"
              href={`/soil${zoneId ? `?zone_id=${zoneId}` : ''}`}
              target="_blank"
            >
              Ouvrir la vue sol →
            </Button>
          </Space>
        }
      />
    </Space>
  );
}

export default SoilDataTab;
