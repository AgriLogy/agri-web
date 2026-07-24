/**
 * Tests for the login form after its antd → Chakra migration (agri-web #114).
 *
 * Only the two seams are faked: `next/navigation`'s router and the axios
 * `post` behind `@agri/api-client/api`. next-intl is globally mocked (keys
 * echo through), so assertions match on the translation KEY.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

// jest hoists jest.mock above these — names must start with "mock" to be
// allowed as out-of-scope references inside the factory.
const mockPush = jest.fn();
const mockPost = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import LoginBox from './LoginBox';

const renderLogin = () =>
  render(
    <ChakraProvider>
      <LoginBox />
    </ChakraProvider>
  );

beforeEach(() => {
  localStorage.clear();
  mockPush.mockReset();
  mockPost.mockReset();
});

describe('LoginBox (Chakra)', () => {
  it('renders the username and password fields and the submit button', () => {
    renderLogin();
    expect(screen.getByLabelText('username')).toBeInTheDocument();
    expect(screen.getByLabelText('password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
  });

  it('shows both required errors and does NOT call the API on empty submit', async () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() =>
      expect(screen.getByText('usernameRequired')).toBeInTheDocument()
    );
    expect(screen.getByText('passwordRequired')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('posts to /auth/sessions, stores tokens, and routes a non-staff user home', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
        is_staff: false,
        is_technician: false,
      },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText('username'), {
      target: { value: 'farmer' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/auth/sessions', {
        username: 'farmer',
        password: 'secret',
      })
    );

    await waitFor(() =>
      expect(localStorage.getItem('accessToken')).toBe('access-token')
    );
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    expect(localStorage.getItem('isTechnician')).toBe('0');
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('shows the error toast when the API rejects the credentials', async () => {
    mockPost.mockRejectedValue(new Error('401'));
    renderLogin();

    fireEvent.change(screen.getByLabelText('username'), {
      target: { value: 'farmer' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() =>
      expect(screen.getByText('invalidCredentials')).toBeInTheDocument()
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
