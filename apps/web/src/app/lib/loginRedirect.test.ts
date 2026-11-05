import { shouldRedirectToLogin } from '@agri/api-client/loginRedirect';

describe('shouldRedirectToLogin (#138 login reload loop)', () => {
  it('does not redirect when a 401 fires on the login page itself', () => {
    expect(shouldRedirectToLogin('/login', '/login')).toBe(false);
  });

  it('ignores a trailing slash and query/hash on either side', () => {
    expect(shouldRedirectToLogin('/login/', '/login')).toBe(false);
    expect(shouldRedirectToLogin('/login', '/login/?next=/')).toBe(false);
    expect(shouldRedirectToLogin('/login', '/login#form')).toBe(false);
  });

  it('redirects from any other page', () => {
    expect(shouldRedirectToLogin('/', '/login')).toBe(true);
    expect(shouldRedirectToLogin('/station', '/login')).toBe(true);
    expect(shouldRedirectToLogin('/login-help', '/login')).toBe(true);
  });

  it('honours a custom login path (admin app)', () => {
    expect(shouldRedirectToLogin('/admin/login', '/admin/login')).toBe(false);
    expect(shouldRedirectToLogin('/admin', '/admin/login')).toBe(true);
  });

  it('treats an absolute login URL as "here" only on the same origin', () => {
    const gw = 'https://identity.agrogo-datafarm.com/login';
    expect(
      shouldRedirectToLogin('/login', gw, 'https://app.agrogo-datafarm.com')
    ).toBe(true);
    expect(
      shouldRedirectToLogin(
        '/login',
        gw,
        'https://identity.agrogo-datafarm.com'
      )
    ).toBe(false);
    expect(shouldRedirectToLogin('/login', gw)).toBe(true);
  });

  it('falls back to redirecting on an unparsable absolute URL', () => {
    expect(shouldRedirectToLogin('/login', 'https://')).toBe(true);
  });
});
