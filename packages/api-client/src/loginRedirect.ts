// Decides whether a 401 should send the browser to the login page.
//
// Kept pure (no window/axios) so it is unit-testable. The interceptor in
// api.ts used to redirect unconditionally, so a 401 fired FROM the login page
// itself (e.g. the assistant's history pull while logged out) set
// location.href to the page already showing, reloading it, re-firing the
// request and looping forever, wiping whatever the user had typed (#138).

/** Path of the login route, normalised (no trailing slash, '/' kept). */
function normalisePath(path: string): string {
  const bare = path.split(/[?#]/)[0] || '/';
  return bare.length > 1 ? bare.replace(/\/+$/, '') : bare;
}

/**
 * True when redirecting to `loginPath` would actually navigate somewhere.
 * `loginPath` may be relative ("/login") or absolute (a gateway URL on another
 * origin), in which case only a same-origin match counts as "already there".
 */
export function shouldRedirectToLogin(
  currentPathname: string,
  loginPath: string,
  currentOrigin?: string
): boolean {
  let target = loginPath;
  if (/^https?:\/\//i.test(loginPath)) {
    let url: URL;
    try {
      url = new URL(loginPath);
    } catch {
      return true;
    }
    if (!currentOrigin || url.origin !== currentOrigin) return true;
    target = url.pathname;
  }
  return normalisePath(currentPathname) !== normalisePath(target);
}
