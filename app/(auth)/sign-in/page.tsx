import { SignIn } from '@clerk/nextjs';
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1320px] gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-7 shadow-sm sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <AdminIcon name="shield" size={14} />
            LoanPro Admin Access
          </div>

          <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Sign in to continue daily operations.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This workspace is restricted to approved admin roles. Use your assigned account to access users, billing, support, and platform controls.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['Route-level RBAC', 'Permissions are verified before page load.'],
              ['Audit coverage', 'Important actions remain reason-tracked.'],
              ['Session controls', 'Authentication is managed by Clerk.'],
            ].map(([title, desc]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
          <div className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white p-5 shadow-panel sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <AdminIcon name="spark" size={16} />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-950">Admin sign in</p>
                <p className="text-sm text-slate-600">Use your authorized account</p>
              </div>
            </div>

            <SignIn
              path="/sign-in"
              routing="path"
              signUpUrl="/unauthorized"
              forceRedirectUrl="/dashboard"
              appearance={{
                variables: {
                  colorPrimary: '#0f172a',
                  colorText: '#0f172a',
                  colorBackground: '#ffffff',
                },
                elements: {
                  card: 'shadow-none border-0',
                  formButtonPrimary: 'bg-slate-900 hover:bg-slate-800',
                  socialButtonsBlockButton: 'border-slate-300',
                  footerActionLink: 'text-slate-700 hover:text-slate-950',
                },
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
