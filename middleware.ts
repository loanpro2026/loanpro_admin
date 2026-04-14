import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/users(.*)',
  '/coupons(.*)',
  '/subscriptions(.*)',
  '/payments(.*)',
  '/devices(.*)',
  '/support(.*)',
  '/contact-requests(.*)',
  '/integrations(.*)',
  '/analytics(.*)',
  '/team(.*)',
  '/roles(.*)',
  '/audit-logs(.*)',
  '/notifications(.*)',
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
