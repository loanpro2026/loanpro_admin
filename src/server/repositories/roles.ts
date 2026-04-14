import type { Permission, RoleKey } from '@/types/rbac';
import type { AdminRoleDocument } from '@/types/admin';
import { getAdminDb } from '@/lib/db/mongo';
import { ROLE_PERMISSIONS } from '@/lib/rbac/permissions';

function toSystemRoleDoc(role: RoleKey): AdminRoleDocument {
  return {
    key: role,
    name: role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    description: `${role.replace(/_/g, ' ')} system role`,
    permissions: ROLE_PERMISSIONS[role],
    isSystemRole: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function syncSystemRoles() {
  const db = await getAdminDb();
  const roles = Object.keys(ROLE_PERMISSIONS) as RoleKey[];
  const now = new Date();

  for (const role of roles) {
    const doc = toSystemRoleDoc(role);
    await db.collection<AdminRoleDocument>('admin_roles').updateOne(
      { key: role },
      {
        $set: {
          name: doc.name,
          description: doc.description,
          permissions: doc.permissions,
          isSystemRole: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }
}

export async function listRoles() {
  const db = await getAdminDb();
  return db.collection<AdminRoleDocument>('admin_roles').find({}).sort({ isSystemRole: -1, key: 1 }).toArray();
}

export async function createCustomRole(input: {
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}) {
  const db = await getAdminDb();
  const now = new Date();

  const doc: AdminRoleDocument = {
    key: input.key,
    name: input.name,
    description: input.description,
    permissions: input.permissions,
    isSystemRole: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<AdminRoleDocument>('admin_roles').insertOne(doc);
  return doc;
}

export async function updateRoleByKey(roleKey: string, patch: Partial<Pick<AdminRoleDocument, 'name' | 'description' | 'permissions'>>) {
  const db = await getAdminDb();
  const result = await db.collection<AdminRoleDocument>('admin_roles').findOneAndUpdate(
    { key: roleKey },
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  return result;
}

export async function deleteRoleByKey(roleKey: string) {
  const db = await getAdminDb();
  return db.collection<AdminRoleDocument>('admin_roles').deleteOne({ key: roleKey, isSystemRole: false });
}
