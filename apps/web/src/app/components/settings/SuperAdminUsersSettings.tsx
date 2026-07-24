'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  chakra,
  useToast,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import api from '@agri/api-client/api';
import { useCan } from '@/app/hooks/useAccessLevel';
import { PermissionGate } from '@/app/components/common/PermissionGate';
import { getAllSensorsCatalog } from '@/app/utils/sensorCatalog';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import {
  loadUserSensorAccessMap,
  setUserSensorAccess,
  type UserSensorAccess,
} from '@/app/utils/userSensorAccessStorage';

type ListedUser = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
};

const SuperAdminUsersSettings = () => {
  const t = useTranslations();
  const toast = useToast();
  const { textColor, bgColor, borderColor, mutedTextColor } =
    useColorModeStyles();
  const { canManageUsers } = useCan();
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const catalog = useMemo(() => getAllSensorsCatalog(true), []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    return new Set(catalog.map((c) => c.key));
  });

  const refreshUsers = () => {
    api
      .get<ListedUser[]>('/users')
      .then((r) => setUsers(r.data ?? []))
      .catch(() =>
        toast({
          title: t('settings.users.listToastTitle'),
          description: t('settings.users.listToastDesc'),
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // GET /users is admin-only (403 otherwise). Skip the doomed request — and
    // its "Access denied" toast — for non-admins; the tab is hidden for them
    // anyway (SettingsMain), this is just belt-and-suspenders.
    if (!canManageUsers) {
      setLoading(false);
      return;
    }
    refreshUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageUsers]);

  useEffect(() => {
    setSelectedKeys(new Set(catalog.map((c) => c.key)));
  }, [catalog]);

  const toggleKey = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // User management is admin-only (agri-web #99). The server enforces this
    // too; the early return just avoids a doomed request from a keyboard submit.
    if (!canManageUsers) return;
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      toast({
        title: t('settings.users.requiredFieldsTitle'),
        description: t('settings.users.requiredFieldsDesc'),
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const keys = [...selectedKeys];
    if (keys.length === 0) {
      toast({
        title: t('settings.users.sensorsTitle'),
        description: t('settings.users.selectAtLeastOne'),
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const payload = {
      username: u,
      password: p,
      firstname: u,
      lastname: u,
      email: `${u}@local.invalid`,
      phone_number: '',
      is_staff: role === 'admin' ? '1' : '0',
      allowed_sensor_keys: keys,
    };

    try {
      await api.post('/users', payload);
      setUserSensorAccess(u, {
        sensorKeys: keys,
        role,
      } as UserSensorAccess);
      toast({
        title: t('settings.users.createdTitle'),
        description: t('settings.users.createdDesc'),
        status: 'success',
        duration: 4500,
        isClosable: true,
      });
      setUsername('');
      setPassword('');
      refreshUsers();
    } catch (err: unknown) {
      console.error(err);
      setUserSensorAccess(u, {
        sensorKeys: keys,
        role,
      } as UserSensorAccess);
      toast({
        title: t('settings.users.createApiTitle'),
        description: t('settings.users.createApiDesc'),
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const accessMap = useMemo(() => loadUserSensorAccessMap(), [users]);

  if (loading) {
    return <Text color={textColor}>{t('settings.users.loading')}</Text>;
  }

  if (!canManageUsers) {
    return (
      <Text fontSize="sm" color={mutedTextColor}>
        {t('access.manageUsersRequiresAdmin')}
      </Text>
    );
  }

  return (
    <Box>
      <Text fontSize="sm" color={mutedTextColor} mb={3}>
        {t('settings.users.intro')}
      </Text>

      <Box
        as="form"
        onSubmit={createUser}
        borderWidth="1px"
        borderColor={borderColor}
        bg={bgColor}
        borderRadius="md"
        p={4}
        mb={6}
      >
        <Text fontWeight="bold" mb={3} color={textColor}>
          {t('settings.users.newUserHeading')}
        </Text>
        <Flex gap={3} flexWrap="wrap" mb={3}>
          <FormControl maxW="220px">
            <FormLabel fontSize="sm">
              {t('settings.users.usernameLabel')}
            </FormLabel>
            <Input
              size="sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </FormControl>
          <FormControl maxW="220px">
            <FormLabel fontSize="sm">
              {t('settings.users.passwordLabel')}
            </FormLabel>
            <Input
              size="sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormControl>
          <FormControl maxW="200px">
            <FormLabel fontSize="sm">{t('settings.users.roleLabel')}</FormLabel>
            <chakra.select
              rounded="md"
              borderWidth="1px"
              h="8"
              px={2}
              bg={bgColor}
              value={role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setRole(e.target.value as 'user' | 'admin')
              }
            >
              <option value="user">{t('settings.users.roleUser')}</option>
              <option value="admin">{t('settings.users.roleAdmin')}</option>
            </chakra.select>
          </FormControl>
        </Flex>

        <Text fontSize="sm" fontWeight="semibold" mb={2} color={textColor}>
          {t('settings.users.visibleReadingsHeading')}
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2} mb={4}>
          {catalog.map((c) => (
            <Checkbox
              key={c.key}
              isChecked={selectedKeys.has(c.key)}
              onChange={(e) => toggleKey(c.key, e.target.checked)}
              size="sm"
            >
              <Text as="span" fontSize="xs">
                {c.readingLabel}{' '}
                <Text as="span" color={mutedTextColor}>
                  ({c.key})
                </Text>
              </Text>
            </Checkbox>
          ))}
        </SimpleGrid>

        <PermissionGate
          blocked={!canManageUsers}
          reason={t('access.manageUsersRequiresAdmin')}
          ui="chakra"
        >
          <Button type="submit" size="sm" colorScheme="brand">
            {t('settings.users.createButton')}
          </Button>
        </PermissionGate>
      </Box>

      <Text fontWeight="bold" mb={2} color={textColor}>
        {t('settings.users.existingHeading')}
      </Text>
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>{t('settings.users.colUser')}</Th>
              <Th>{t('settings.users.colEmail')}</Th>
              <Th>{t('settings.users.colApiRole')}</Th>
              <Th>{t('settings.users.colSensorsLocal')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((u) => {
              const local = accessMap[u.username.toLowerCase()];
              return (
                <Tr key={u.id}>
                  <Td>{u.username}</Td>
                  <Td fontSize="xs">{u.email}</Td>
                  <Td>
                    {u.is_staff ? (
                      <Badge colorScheme="brand">
                        {t('settings.users.badgeAdmin')}
                      </Badge>
                    ) : (
                      <Badge>{t('settings.users.badgeUser')}</Badge>
                    )}
                  </Td>
                  <Td fontSize="xs">
                    {local
                      ? t('settings.users.localSensorsCell', {
                          count: local.sensorKeys.length,
                          role: local.role,
                        })
                      : '—'}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SuperAdminUsersSettings;
