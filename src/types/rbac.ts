export type RoleKey =
  | 'super_admin'
  | 'admin_ops'
  | 'support_agent'
  | 'finance_admin'
  | 'release_manager'
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
  | 'publish'
  | 'rollback'
  | 'promote'
  | 'test'
  | 'reconfigure'
  | 'invite'
  | 'role_assign'
  | 'deactivate'
  | 'create';

export type PermissionResource =
  | 'users'
  | 'subscriptions'
  | 'payments'
  | 'devices'
  | 'support'
  | 'contact'
  | 'releases'
  | 'integrations'
  | 'team'
  | 'roles'
  | 'settings'
  | 'audit';

export type Permission = `${PermissionResource}:${PermissionAction}`;
