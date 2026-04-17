'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type SignInErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SignInError({ error, reset }: SignInErrorProps) {
  useEffect(() => {
    console.error('Sign-in route error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Authentication error</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">We could not load the sign-in form.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This can happen during temporary identity provider issues. Retry first. If the problem continues, refresh and try again in a few seconds.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="admin-focus inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Retry sign in
          </button>
          <Link
            href="/"
            className="admin-focus inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
