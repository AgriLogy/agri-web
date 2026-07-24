/**
 * The "Users" tab is the admin-only super-admin account manager (GET /users
 * 403s for everyone else). It must be hidden from non-admins so a normal user
 * never meets its "Access denied" error; technicians stay available to all.
 * agri-web #99 / RBAC.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

let mockCanManageUsers = false;

jest.mock('next-intl', () => ({
  __esModule: true,
  // t(key) → key, so tab labels are their i18n keys and assertable by key.
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}));

jest.mock('@/app/hooks/useAccessLevel', () => ({
  __esModule: true,
  useCan: () => ({
    level: mockCanManageUsers ? 'admin' : 'editor',
    loading: false,
    canEdit: true,
    canDelete: mockCanManageUsers,
    canManageUsers: mockCanManageUsers,
  }),
}));

jest.mock('@/app/utils/useColorModeStyles', () => ({
  __esModule: true,
  default: () => ({ tabAccent: 'green.500', iconColor: 'gray.500' }),
}));

// Stub every tab body so no child fires network calls during the test.
const stub = (name: string) => ({
  __esModule: true,
  default: () => <div data-testid={`body-${name}`} />,
});
jest.mock('@/app/components/settings/ProfileSection', () => stub('profile'));
jest.mock('@/app/components/settings/DefaultContactSection', () =>
  stub('contact')
);
jest.mock('@/app/components/settings/TechniciansSection', () =>
  stub('technicians')
);
jest.mock('@/app/components/settings/FarmSettingsSection', () => stub('farms'));
jest.mock('@/app/components/settings/SensorDirectorySettings', () =>
  stub('sensors')
);
jest.mock('@/app/components/settings/SensorCalibrationSettings', () =>
  stub('calibration')
);
jest.mock('@/app/components/settings/SensorGroupsSettings', () =>
  stub('groups')
);
jest.mock('@/app/components/settings/SensorReadingsSettings', () =>
  stub('readings')
);
jest.mock('@/app/components/settings/SuperAdminUsersSettings', () =>
  stub('users')
);
jest.mock('@/app/components/layout/PageInfoBar', () => ({
  __esModule: true,
  PageInfoBar: () => <div />,
}));

import SettingsMain from './SettingsMain';

const renderMain = () =>
  render(
    <ChakraProvider>
      <SettingsMain />
    </ChakraProvider>
  );

describe('SettingsMain — Users tab gating', () => {
  it('hides the Users tab for a non-admin', () => {
    mockCanManageUsers = false;
    renderMain();
    expect(
      screen.queryByText('settings.main.tabUsers')
    ).not.toBeInTheDocument();
    // technicians tab stays visible to everyone
    expect(
      screen.getByText('settings.main.tabTechnicians')
    ).toBeInTheDocument();
  });

  it('shows the Users tab for an admin', () => {
    mockCanManageUsers = true;
    renderMain();
    expect(screen.getByText('settings.main.tabUsers')).toBeInTheDocument();
  });
});
