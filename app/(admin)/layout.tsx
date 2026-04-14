import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminSession } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return <AdminShell>{children}</AdminShell>;
}
