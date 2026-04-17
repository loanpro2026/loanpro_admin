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
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1480px] gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-14">
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <span className="admin-chip">Admin authentication</span>
                <h1 className="mt-4 max-w-2xl text-3xl font-semibold text-slate-950 sm:text-4xl">
                  Access the LoanPro operations workspace.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  Use your approved admin account to manage users, payments, support operations, and platform settings.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Role checks', 'Permissions are enforced per route'],
                  ['Session safety', 'Protected by Clerk authentication'],
                  ['Traceability', 'Sensitive operations are audit-logged'],
                ].map(([title, desc]) => (
                  <article key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <AdminIcon name="shield" />
                      </span>
                      <div>
                        <p className="text-base font-semibold text-slate-950">{title}</p>
                        <p className="text-[13px] leading-5 text-slate-600">{desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-panel sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <AdminIcon name="spark" />
                </span>
                <div>
                  <p className="text-lg font-semibold text-slate-950">Sign in</p>
                  <p className="text-sm text-slate-600">Use your authorized admin account</p>
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
                    formButtonPrimary: 'bg-slate-900 hover:bg-slate-800',
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
