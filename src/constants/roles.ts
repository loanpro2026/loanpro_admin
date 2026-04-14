import type { RoleKey } from '@/types/rbac';

export const ADMIN_ROLE_OPTIONS: Array<{ key: RoleKey; label: string }> = [
  { key: 'super_admin', label: 'Super Admin' },
  { key: 'admin_ops', label: 'Admin Ops' },
  { key: 'support_agent', label: 'Support Agent' },
  { key: 'finance_admin', label: 'Finance Admin' },
  { key: 'analyst', label: 'Analyst' },
  { key: 'viewer', label: 'Viewer' },
];
