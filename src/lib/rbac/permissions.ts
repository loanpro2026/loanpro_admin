import type { Permission, RoleKey } from '@/types/rbac';

export const ROLE_KEYS: RoleKey[] = [
  'super_admin',
  'admin',
  'admin_ops',
  'support_agent',
  'finance_admin',
  'analyst',
  'viewer',
];

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  super_admin: [
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:suspend', 'users:export',
    'coupons:read', 'coupons:create', 'coupons:update', 'coupons:delete', 'coupons:export',
    'subscriptions:read', 'subscriptions:create', 'subscriptions:update', 'subscriptions:cancel', 'subscriptions:renew', 'subscriptions:upgrade', 'subscriptions:export',
    'payments:read', 'payments:refund_request', 'payments:refund_approve', 'payments:reconcile', 'payments:export',
    'devices:read', 'devices:bind', 'devices:revoke', 'devices:switch_approve',
    'support:read', 'support:reply', 'support:assign', 'support:close', 'support:escalate',
    'contact:read', 'contact:assign', 'contact:close', 'contact:export',
    'integrations:read', 'integrations:test', 'integrations:reconfigure',
    'team:read', 'team:invite', 'team:role_assign', 'team:deactivate',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'settings:read', 'settings:update',
    'audit:read', 'audit:export',
  ],
  admin: [
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:suspend', 'users:export',
    'coupons:read', 'coupons:create', 'coupons:update', 'coupons:delete', 'coupons:export',
    'subscriptions:read', 'subscriptions:create', 'subscriptions:update', 'subscriptions:cancel', 'subscriptions:renew', 'subscriptions:upgrade', 'subscriptions:export',
    'payments:read', 'payments:refund_request', 'payments:refund_approve', 'payments:reconcile', 'payments:export',
    'devices:read', 'devices:bind', 'devices:revoke', 'devices:switch_approve',
    'support:read', 'support:reply', 'support:assign', 'support:close', 'support:escalate',
    'contact:read', 'contact:assign', 'contact:close', 'contact:export',
    'integrations:read', 'integrations:test',
    'team:read',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'settings:read', 'settings:update',
    'audit:read', 'audit:export',
  ],
  admin_ops: [
    'users:read', 'users:update', 'users:suspend',
    'coupons:read', 'coupons:create', 'coupons:update',
    'subscriptions:read', 'subscriptions:create', 'subscriptions:update', 'subscriptions:cancel', 'subscriptions:renew', 'subscriptions:upgrade',
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
    'coupons:read', 'coupons:update',
    'subscriptions:read',
    'payments:read', 'payments:refund_request', 'payments:refund_approve', 'payments:reconcile', 'payments:export',
    'audit:read', 'audit:export',
  ],
  analyst: [
    'users:read', 'coupons:read', 'subscriptions:read', 'payments:read', 'devices:read', 'support:read', 'contact:read', 'integrations:read', 'audit:read',
    'users:export', 'coupons:export', 'subscriptions:export', 'payments:export', 'contact:export', 'audit:export',
  ],
  viewer: ['users:read', 'coupons:read', 'subscriptions:read', 'payments:read', 'devices:read', 'support:read', 'contact:read', 'integrations:read'],
};

export const ALL_PERMISSIONS: Permission[] = Array.from(
  new Set(Object.values(ROLE_PERMISSIONS).flat())
) as Permission[];

export function hasPermission(role: RoleKey, permission: Permission): boolean {
  const list = ROLE_PERMISSIONS[role] || [];
  return list.includes(permission);
}
