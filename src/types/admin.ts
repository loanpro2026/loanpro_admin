import type { Permission, RoleKey } from '@/types/rbac';

export type AdminUserStatus = 'active' | 'inactive' | 'deactivated';

export type AdminUserDocument = {
  clerkUserId: string;
  email: string;
  displayName: string;
  role: RoleKey;
  status: AdminUserStatus;
  mfaEnforced: boolean;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

export type AdminRoleDocument = {
  key: RoleKey | string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminInviteDocument = {
  email: string;
  role: RoleKey;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLogDocument = {
  actor: {
    adminUserId: string;
    clerkUserId: string;
    email: string;
    role: RoleKey;
  };
  action: string;
  resource: string;
  resourceId?: string;
  reason?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};
