'use client';

import { useEffect } from 'react';
import { pushToast } from '@/components/ui/AppToaster';

type JsonPayload = {
  success?: boolean;
  error?: string;
  data?: {
    message?: string;
  };
};

function parseMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return String(init.method).toUpperCase();
  if (typeof input !== 'string' && 'method' in input) {
    return String((input as Request).method || 'GET').toUpperCase();
  }
  return 'GET';
}

function parseUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if ('url' in input) return String((input as Request).url || '');
  return '';
}

function isActionRequest(method: string, url: string) {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return url.includes('/api/');
}

function defaultSuccessMessage(method: string) {
  if (method === 'POST') return 'Action completed successfully.';
  if (method === 'PATCH' || method === 'PUT') return 'Changes saved successfully.';
  if (method === 'DELETE') return 'Deleted successfully.';
  return 'Action completed successfully.';
}

export function ActionToastBridge() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = parseMethod(input, init);
      const url = parseUrl(input);
      const response = await originalFetch(input, init);

      try {
        if (!isActionRequest(method, url)) {
          return response;
        }

        const skipToast = init?.headers && typeof init.headers === 'object' && 'x-skip-action-toast' in init.headers;
        if (skipToast) {
          return response;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          if (!response.ok) {
            pushToast('Request failed. Please try again.', 'error');
          }
          return response;
        }

        const payload = (await response.clone().json()) as JsonPayload;
        if (response.ok && payload?.success) {
          const successMessage = String(payload?.data?.message || '').trim() || defaultSuccessMessage(method);
          pushToast(successMessage, 'success');
          return response;
        }

        const errorMessage = String(payload?.error || '').trim() || `Request failed with status ${response.status}.`;
        pushToast(errorMessage, 'error');
      } catch {
        if (!response.ok) {
          pushToast('Request failed. Please try again.', 'error');
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
