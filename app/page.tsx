import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">LoanPro Admin Control Plane</h1>
        <p className="mt-3 text-slate-600">
          Clean start complete. Next step is authentication, RBAC, and admin module delivery.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/sign-in" className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">
            Sign in
          </Link>
          <Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-slate-800 hover:bg-slate-50">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
