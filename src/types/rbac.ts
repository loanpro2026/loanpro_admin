export type RoleKey =
  | 'super_admin'
  | 'admin'
  | 'admin_ops'
  | 'support_agent'
  | 'finance_admin'
  | 'analyst'
  | 'viewer';

export type PermissionAction =
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'approve'
  | 'assign'
  | 'close'
  | 'suspend'
  | 'cancel'
  | 'renew'
  | 'upgrade'
  | 'refund_request'
  | 'refund_approve'
  | 'reconcile'
  | 'bind'
  | 'revoke'
  | 'switch_approve'
  | 'reply'
  | 'escalate'
  | 'test'
  | 'reconfigure'
  | 'invite'
  | 'role_assign'
  | 'deactivate'
  | 'create';

export type PermissionResource =
  | 'users'
  | 'coupons'
  | 'subscriptions'
  | 'payments'
  | 'devices'
  | 'support'
  | 'contact'
  | 'integrations'
  | 'team'
  | 'roles'
  | 'settings'
  | 'audit';

export type Permission = `${PermissionResource}:${PermissionAction}`;
