import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getAdminDb } from '@/lib/db/mongo';
import type { AdminInviteDocument, AdminUserDocument } from '@/types/admin';
import type { RoleKey } from '@/types/rbac';

export async function listTeamMembers() {
  const db = await getAdminDb();
  return db.collection<AdminUserDocument>('admin_users').find({}).sort({ createdAt: -1 }).toArray();
}

export async function createTeamInvite(input: { email: string; role: RoleKey; invitedBy: string }) {
  const db = await getAdminDb();
  const now = new Date();
  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const doc: AdminInviteDocument = {
    email: input.email.toLowerCase(),
    role: input.role,
    invitedBy: input.invitedBy,
    status: 'pending',
    tokenHash,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<AdminInviteDocument>('admin_invites').insertOne(doc);
  return { ...doc, inviteToken: token };
}

export async function updateTeamMember(adminUserId: string, patch: Partial<Pick<AdminUserDocument, 'role' | 'status'>>) {
  const db = await getAdminDb();

  const filter = ObjectId.isValid(adminUserId)
    ? { _id: new ObjectId(adminUserId) }
    : { clerkUserId: adminUserId };

  return db.collection<AdminUserDocument>('admin_users').findOneAndUpdate(
    filter,
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}
