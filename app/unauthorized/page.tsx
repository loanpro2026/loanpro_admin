import Link from 'next/link';
import { SignedIn, SignedOut, SignOutButton } from '@clerk/nextjs';
import { AdminIcon } from '@/components/admin/AdminIcons';

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            <AdminIcon name="shield" size={14} />
            Access restricted
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-slate-950 sm:text-3xl">This account is signed in, but does not have admin access.</h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Your authentication is valid. The block happens at permission level, which means this user is missing one or more required admin roles.
          </p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {[
              ['Authenticated', 'Identity is verified in Clerk'],
              ['Authorization blocked', 'Role mapping does not grant this route'],
              ['Safe by design', 'Protected routes cannot be opened without permission'],
              ['Recoverable', 'You can switch account right now'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <SignedIn>
              <SignOutButton redirectUrl="/sign-in">
                <button
                  type="button"
                  className="admin-focus inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <AdminIcon name="user" size={14} />
                  Sign out and use a different account
                </button>
              </SignOutButton>
            </SignedIn>

            <SignedOut>
              <Link
                href="/sign-in"
                className="admin-focus inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <AdminIcon name="user" size={14} />
                Sign in with another account
              </Link>
            </SignedOut>

            <Link
              href="/dashboard"
              className="admin-focus inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <AdminIcon name="dashboard" size={14} />
              Back to dashboard
            </Link>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Need help?</p>
          <h2 className="mt-2.5 text-xl font-semibold text-slate-950">Request role access</h2>
          <p className="mt-2.5 text-sm leading-6 text-slate-600">
            Share your account email with a super admin and request the role needed for this workspace.
          </p>

          <div className="mt-5 space-y-2.5">
            {[
              'Confirm your role in Team management',
              'Check if route permissions include this page',
              'Retry after role update by signing out and back in',
            ].map((line) => (
              <div key={line} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
