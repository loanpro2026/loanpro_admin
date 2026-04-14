import Link from 'next/link';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-brand-700">LoanPro Admin</p>
            <p className="text-xs text-slate-500">admin.loanpro.tech</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/status" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
              System Status
            </Link>
            <Link href="/profile" className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
              Profile
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3">
          <nav className="grid gap-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="rounded-xl border border-slate-200 bg-white">{children}</section>
      </div>
    </div>
  );
}
