import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'loanpro-admin-next',
    timestamp: new Date().toISOString(),
  });
}
