import { ClerkProvider, SignIn } from '@clerk/nextjs';
import { AdminIcon } from '@/components/admin/AdminIcons';

export default function SignInPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-8">
        <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Clerk publishable key is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable sign-in.
        </div>
      </main>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1480px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="admin-surface relative overflow-hidden p-8 sm:p-10 lg:p-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_24%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-10">
              <div>
                <span className="admin-chip">Secure admin access</span>
                <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Sign in to the LoanPro control center.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                  Manage users, payments, roles, notifications, and operations from one consistent workspace.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['RBAC', 'Role-based access for admins'],
                  ['Notifications', 'Live in-app alerts'],
                  ['Audit trail', 'Trace every important change'],
                ].map(([title, desc]) => (
                  <article key={title} className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur animate-fadeUp">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-glow">
                        <AdminIcon name="shield" />
                      </span>
                      <div>
                        <p className="font-display text-lg font-semibold text-slate-950">{title}</p>
                        <p className="text-sm text-slate-600">{desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="admin-surface flex items-center justify-center p-5 sm:p-8 lg:p-10">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-panel sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-glow">
                  <AdminIcon name="spark" />
                </span>
                <div>
                  <p className="font-display text-xl font-semibold text-slate-950">Admin login</p>
                  <p className="text-sm text-slate-600">Continue to your secure workspace</p>
                </div>
              </div>
              <SignIn
                path="/sign-in"
                routing="path"
                signUpUrl="/unauthorized"
                forceRedirectUrl="/dashboard"
                appearance={{
                  variables: {
                    colorPrimary: '#2563eb',
                    colorText: '#0f172a',
                    colorBackground: '#ffffff',
                  },
                  elements: {
                    card: 'shadow-none border-0',
                    formButtonPrimary: 'bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-700 hover:to-cyan-600',
                  },
                }}
              />
            </div>
          </section>
        </div>
      </main>
    </ClerkProvider>
  );
}
