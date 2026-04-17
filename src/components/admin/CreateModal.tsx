'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminIcon } from './AdminIcons';

interface CreateModalProps {
  title: string;
  description: string;
  buttonText?: string;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
  children: ReactNode;
  openDisabled?: boolean;
  disabled?: boolean;
  icon?: 'users' | 'subscriptions' | 'coupons' | 'payments' | 'team';
}

export function CreateModal({
  title,
  description,
  buttonText = '+ Add',
  onSubmit,
  isLoading,
  children,
  openDisabled = false,
  disabled = false,
  icon = 'users',
}: CreateModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async () => {
    try {
      await onSubmit();
      setOpen(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={openDisabled}
        onClick={() => setOpen(true)}
        className="admin-focus inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        title={description}
      >
        <AdminIcon name={icon} size={16} />
        <span>{buttonText}</span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm transition-opacity"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setOpen(false);
                }
              }}
            >
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-slate-950">{title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-600 shadow-sm transition hover:bg-slate-50"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6">{children}</div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="admin-focus rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isLoading || disabled}
                    onClick={() => void handleSubmit()}
                    className="admin-focus rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
