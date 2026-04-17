type SkeletonProps = {
  className?: string;
};

export function AdminLineSkeleton({ className = '' }: SkeletonProps) {
  return <div className={`admin-skeleton h-4 rounded-md ${className}`.trim()} />;
}

export function AdminCardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: cards }).map((_, idx) => (
        <div key={idx} className="admin-kpi-card">
          <AdminLineSkeleton className="w-20" />
          <AdminLineSkeleton className="mt-3 h-7 w-16" />
          <AdminLineSkeleton className="mt-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function AdminPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <AdminLineSkeleton className="w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <AdminLineSkeleton key={idx} className="w-full" />
        ))}
      </div>
    </section>
  );
}

export function AdminTableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <AdminLineSkeleton className="w-32" />
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <div className="min-w-[760px] space-y-3">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, idx) => (
              <AdminLineSkeleton key={`h-${idx}`} className="h-3 w-16" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <AdminLineSkeleton key={`${rowIdx}-${colIdx}`} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminInlineTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-5 py-4">
      {Array.from({ length: rows }).map((_, idx) => (
        <AdminLineSkeleton key={idx} className="h-4 w-full" />
      ))}
    </div>
  );
}
