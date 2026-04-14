import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-8">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-slate-600">
          Your current role does not have access to this page. Contact a super administrator if you need elevated access.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">
            Go to dashboard
          </Link>
          <Link href="/sign-in" className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
            Switch account
          </Link>
        </div>
      </section>
    </main>
  );
}
