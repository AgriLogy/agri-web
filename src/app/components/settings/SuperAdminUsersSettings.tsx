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
import api from '@/app/lib/api';
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
  const toast = useToast();
  const { textColor, bgColor, borderColor, mutedTextColor } =
    useColorModeStyles();
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
          title: 'Liste utilisateurs',
          description: 'Accès refusé ou API indisponible.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshUsers();
  }, []);

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
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      toast({
        title: 'Champs requis',
        description: 'Nom d’utilisateur et mot de passe.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const keys = [...selectedKeys];
    if (keys.length === 0) {
      toast({
        title: 'Capteurs',
        description: 'Sélectionnez au moins une lecture visible.',
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
        title: 'Utilisateur créé',
        description:
          'Les droits capteurs sont aussi enregistrés localement pour le filtrage du tableau de bord.',
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
        title: 'Création API',
        description:
          'Si le serveur a refusé la requête, les droits capteurs ont quand même été enregistrés localement.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const accessMap = useMemo(() => loadUserSensorAccessMap(), [users]);

  if (loading) {
    return <Text color={textColor}>Chargement des utilisateurs…</Text>;
  }

  return (
    <Box>
      <Text fontSize="sm" color={mutedTextColor} mb={3}>
        Super-admin : créez des comptes avec rôle utilisateur ou administrateur,
        et choisissez quelles lectures (capteurs) ils peuvent voir. Les
        préférences capteurs sont stockées localement ; l’API peut ignorer des
        champs supplémentaires jusqu’à adaptation backend.
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
          Nouvel utilisateur
        </Text>
        <Flex gap={3} flexWrap="wrap" mb={3}>
          <FormControl maxW="220px">
            <FormLabel fontSize="sm">Nom d&apos;utilisateur</FormLabel>
            <Input
              size="sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </FormControl>
          <FormControl maxW="220px">
            <FormLabel fontSize="sm">Mot de passe</FormLabel>
            <Input
              size="sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormControl>
          <FormControl maxW="200px">
            <FormLabel fontSize="sm">Rôle</FormLabel>
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
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </chakra.select>
          </FormControl>
        </Flex>

        <Text fontSize="sm" fontWeight="semibold" mb={2} color={textColor}>
          Lectures visibles sur le tableau de bord
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

        <Button type="submit" size="sm" colorScheme="brand">
          Créer l&apos;utilisateur
        </Button>
      </Box>

      <Text fontWeight="bold" mb={2} color={textColor}>
        Utilisateurs existants
      </Text>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Utilisateur</Th>
            <Th>Email</Th>
            <Th>Rôle API</Th>
            <Th>Capteurs (local)</Th>
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
                    <Badge colorScheme="brand">Admin</Badge>
                  ) : (
                    <Badge>User</Badge>
                  )}
                </Td>
                <Td fontSize="xs">
                  {local
                    ? `${local.sensorKeys.length} lecture(s) — ${local.role}`
                    : '—'}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
};

export default SuperAdminUsersSettings;
