'use client';

import { Empty, Input, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

export type AdminCrudTableProps<T> = {
  rowKey: keyof T | ((row: T) => React.Key);
  columns: ColumnsType<T>;
  data: T[];
  loading?: boolean;
  /** Toggle the search input above the table. */
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: Array<keyof T>;
  /** Custom empty-state node (defaults to antd `Empty`). */
  emptyDescription?: string;
  /** Trailing slot (typically a "Nouveau …" primary button). */
  toolbar?: React.ReactNode;
  pagination?: false | { pageSize?: number };
};

/**
 * Shared antd Table preset for admin CRUD pages.
 *
 *   <AdminCrudTable<UserRow>
 *     rowKey="id"
 *     columns={cols}
 *     data={users}
 *     loading={loading}
 *     searchable
 *     searchKeys={['username', 'email']}
 *     toolbar={<Button type="primary">Nouveau</Button>}
 *   />
 */
export function AdminCrudTable<T extends Record<string, unknown>>({
  rowKey,
  columns,
  data,
  loading = false,
  searchable = false,
  searchPlaceholder,
  searchKeys,
  emptyDescription,
  toolbar,
  pagination = { pageSize: 20 },
}: AdminCrudTableProps<T>) {
  const t = useTranslations();
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? t('admin.crudTable.searchPlaceholder');
  const resolvedEmptyDescription =
    emptyDescription ?? t('admin.crudTable.empty');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      const keys =
        searchKeys && searchKeys.length > 0
          ? searchKeys
          : (Object.keys(row) as Array<keyof T>);
      return keys.some((k) => {
        const value = row[k];
        return typeof value === 'string' && value.toLowerCase().includes(q);
      });
    });
  }, [data, query, searchable, searchKeys]);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {(searchable || toolbar) && (
        <Space
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {searchable ? (
            <Input
              prefix={<SearchOutlined />}
              placeholder={resolvedSearchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              allowClear
              style={{ maxWidth: 320 }}
            />
          ) : (
            <span />
          )}
          {toolbar ?? null}
        </Space>
      )}
      <Table<T>
        rowKey={rowKey as never}
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={pagination}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={resolvedEmptyDescription}
            />
          ),
        }}
      />
    </Space>
  );
}

export default AdminCrudTable;
