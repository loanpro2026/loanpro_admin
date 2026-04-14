import { ObjectId } from 'mongodb';
import { getAdminDb } from '@/lib/db/mongo';

export type ReleaseChannel = 'stable' | 'beta' | 'alpha' | 'hotfix';
export type ReleaseStatus = 'draft' | 'published' | 'promoted' | 'rolled_back';

export type ReleaseListFilters = {
  search?: string;
  channel?: string;
  status?: string;
  limit?: number;
};

export type ReleaseArtifact = {
  name: string;
  url: string;
  checksum?: string;
};

export type ReleaseDocument = {
  _id?: ObjectId;
  version: string;
  title: string;
  channel: ReleaseChannel;
  status: ReleaseStatus;
  notes: string;
  source: 'manual' | 'github';
  rolloutPercent: number;
  artifacts: ReleaseArtifact[];
  githubReleaseId?: number;
  githubUrl?: string;
  publishedAt?: Date;
  promotedAt?: Date;
  rolledBackAt?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export async function listReleases(filters: ReleaseListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
  const match: Record<string, unknown> = {};

  const channel = String(filters.channel || '').trim().toLowerCase();
  if (channel && channel !== 'all') {
    match.channel = channel;
  }

  const status = String(filters.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    match.status = status;
  }

  const search = String(filters.search || '').trim();
  if (search) {
    match.$or = [
      { version: toSafeRegex(search) },
      { title: toSafeRegex(search) },
      { notes: toSafeRegex(search) },
      { channel: toSafeRegex(search) },
      { status: toSafeRegex(search) },
    ];
  }

  return db
    .collection<ReleaseDocument>('admin_releases')
    .find(match)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getReleaseById(id: string) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return db.collection<ReleaseDocument>('admin_releases').findOne({ _id: new ObjectId(id) });
}

export async function createRelease(input: Omit<ReleaseDocument, '_id' | 'createdAt' | 'updatedAt'>) {
  const db = await getAdminDb();
  const now = new Date();

  const payload: ReleaseDocument = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const inserted = await db.collection<ReleaseDocument>('admin_releases').insertOne(payload);
  return db.collection<ReleaseDocument>('admin_releases').findOne({ _id: inserted.insertedId });
}

export async function updateReleaseById(id: string, patch: Record<string, unknown>) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return db.collection<ReleaseDocument>('admin_releases').findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}
