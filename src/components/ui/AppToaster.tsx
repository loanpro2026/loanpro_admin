'use client';

import { useEffect, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastEventPayload = {
  message: string;
  tone?: ToastTone;
};

const TOAST_EVENT = 'loanpro:toast';

export function pushToast(message: string, tone: ToastTone = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastEventPayload>(TOAST_EVENT, { detail: { message, tone } }));
}

function toneClass(tone: ToastTone) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'error') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-white text-slate-800';
}

export function AppToaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const custom = event as CustomEvent<ToastEventPayload>;
      const message = String(custom.detail?.message || '').trim();
      if (!message) return;

      const tone = custom.detail?.tone || 'info';
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setItems((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    };

    window.addEventListener(TOAST_EVENT, onToast as EventListener);
    return () => window.removeEventListener(TOAST_EVENT, onToast as EventListener);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm ${toneClass(item.tone)}`}
          role="status"
          aria-live="polite"
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
