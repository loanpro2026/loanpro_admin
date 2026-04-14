import { NextRequest, NextResponse } from 'next/server';

export type ParsedJsonResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function parseJsonBody<T = unknown>(request: NextRequest): Promise<ParsedJsonResult<T>> {
  try {
    const data = (await request.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
        },
        { status: 400 }
      ),
    };
  }
}