import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/users(.*)',
  '/subscriptions(.*)',
  '/payments(.*)',
  '/devices(.*)',
  '/support(.*)',
  '/releases(.*)',
  '/integrations(.*)',
  '/analytics(.*)',
  '/team(.*)',
  '/roles(.*)',
  '/audit-logs(.*)',
  '/settings(.*)',
  '/status(.*)',
  '/profile(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
