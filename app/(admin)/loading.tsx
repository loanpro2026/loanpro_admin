export default function AdminRouteLoading() {
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true" aria-live="polite">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <article key={idx} className="admin-kpi-card">
            <div className="admin-skeleton h-4 w-24 rounded-md" />
            <div className="admin-skeleton mt-3 h-8 w-20 rounded-md" />
            <div className="admin-skeleton mt-3 h-4 w-28 rounded-md" />
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="admin-skeleton h-5 w-44 rounded-md" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="admin-skeleton h-4 w-full rounded-md" />
          ))}
        </div>
      </section>
    </main>
  );
}
