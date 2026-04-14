import type { Permission, RoleKey } from '@/types/rbac';

export const ROLE_KEYS: RoleKey[] = [
  'super_admin',
  'admin_ops',
  'support_agent',
  'finance_admin',
  'release_manager',
  'analyst',
  'viewer',
];

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  super_admin: [
    'users:read', 'users:update', 'users:suspend', 'users:export',
    'subscriptions:read', 'subscriptions:update', 'subscriptions:cancel', 'subscriptions:renew', 'subscriptions:upgrade', 'subscriptions:export',
    'payments:read', 'payments:refund_request', 'payments:refund_approve', 'payments:reconcile', 'payments:export',
    'devices:read', 'devices:bind', 'devices:revoke', 'devices:switch_approve',
    'support:read', 'support:reply', 'support:assign', 'support:close', 'support:escalate',
    'contact:read', 'contact:assign', 'contact:close', 'contact:export',
    'releases:read', 'releases:publish', 'releases:rollback', 'releases:promote',
    'integrations:read', 'integrations:test', 'integrations:reconfigure',
    'team:read', 'team:invite', 'team:role_assign', 'team:deactivate',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'settings:read', 'settings:update',
    'audit:read', 'audit:export',
  ],
  admin_ops: [
    'users:read', 'users:update', 'users:suspend',
    'subscriptions:read', 'subscriptions:update', 'subscriptions:cancel', 'subscriptions:renew', 'subscriptions:upgrade',
    'devices:read', 'devices:bind', 'devices:revoke', 'devices:switch_approve',
    'support:read', 'support:reply', 'support:assign', 'support:close',
    'contact:read', 'contact:assign', 'contact:close',
    'team:read',
    'settings:read',
    'audit:read',
  ],
  support_agent: [
    'users:read',
    'support:read', 'support:reply', 'support:assign', 'support:close',
    'contact:read', 'contact:assign', 'contact:close',
    'audit:read',
  ],
  finance_admin: [
    'users:read',
    'subscriptions:read',
    'payments:read', 'payments:refund_request', 'payments:refund_approve', 'payments:reconcile', 'payments:export',
    'audit:read', 'audit:export',
  ],
  release_manager: [
    'releases:read', 'releases:publish', 'releases:rollback', 'releases:promote',
    'integrations:read', 'integrations:test',
    'audit:read',
  ],
  analyst: [
    'users:read', 'subscriptions:read', 'payments:read', 'devices:read', 'support:read', 'contact:read', 'integrations:read', 'audit:read',
    'users:export', 'subscriptions:export', 'payments:export', 'contact:export', 'audit:export',
  ],
  viewer: ['users:read', 'subscriptions:read', 'payments:read', 'devices:read', 'support:read', 'contact:read', 'integrations:read'],
};

export const ALL_PERMISSIONS: Permission[] = Array.from(
  new Set(Object.values(ROLE_PERMISSIONS).flat())
) as Permission[];

export function hasPermission(role: RoleKey, permission: Permission): boolean {
  const list = ROLE_PERMISSIONS[role] || [];
  return list.includes(permission);
}
