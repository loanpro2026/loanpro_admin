type PlaceholderPageProps = {
  title: string;
  description: string;
  phase?: string;
};

export function PlaceholderPage({ title, description, phase = 'Phase 2' }: PlaceholderPageProps) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      <p className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
        Planned delivery: {phase}
      </p>
    </main>
  );
}
