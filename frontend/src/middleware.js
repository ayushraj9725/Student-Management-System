import { NextResponse } from 'next/server';

/**
 * Enterprise Port & Domain Gating Middleware.
 * Enforces strict physical perimeter isolation between Platform Super Admin
 * and Tenant Institutional Portals.
 */
export function middleware(request) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Extract port: e.g. "localhost:4000" -> 4000, "localhost:4001" -> 4001
  const port = host.split(':')[1] || (host.startsWith('https') ? '443' : '80');

  // Gating Rule 1: Port 4000 (School Tenant Portal)
  // Blocks access to Platform Operations Gateway from the tenant port.
  if (port === '4000') {
    if (pathname.startsWith('/platform')) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('securityNotice', 'PLATFORM_GATEWAY_ISOLATED_PORT_4001');
      return NextResponse.redirect(url);
    }
  }

  // Gating Rule 2: Port 4001 (Platform Super Admin Operations Console)
  // Directs traffic strictly to the Platform Control Panel and blocks tenant workspaces.
  if (port === '4001') {
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/platform';
      return NextResponse.redirect(url);
    }
    // Block tenant routes on the platform port to avoid session cross-contamination
    if (pathname.startsWith('/students') || (pathname.includes('/admin') && !pathname.startsWith('/platform'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/platform';
      url.searchParams.set('securityNotice', 'TENANT_PORTAL_ISOLATED_PORT_4000');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and next internals
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
