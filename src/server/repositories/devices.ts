import { getAdminDb } from '@/lib/db/mongo';

export type DeviceListFilters = {
  search?: string;
  status?: string;
  limit?: number;
};

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export async function listDevices(filters: DeviceListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(300, Math.max(1, Number(filters.limit || 100)));
  const search = String(filters.search || '').trim();
  const status = String(filters.status || '').trim().toLowerCase();

  const pipeline: Record<string, unknown>[] = [
    {
      $project: {
        userId: 1,
        email: 1,
        username: 1,
        fullName: 1,
        devices: 1,
      },
    },
    {
      $unwind: {
        path: '$devices',
        preserveNullAndEmptyArrays: false,
      },
    },
  ];

  const match: Record<string, unknown> = {};
  if (status && status !== 'all') {
    match['devices.status'] = status;
  }

  if (search) {
    const regex = toSafeRegex(search);
    match.$or = [
      { userId: regex },
      { email: regex },
      { username: regex },
      { fullName: regex },
      { 'devices.deviceId': regex },
      { 'devices.deviceName': regex },
    ];
  }

  if (Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        userId: 1,
        email: 1,
        username: 1,
        fullName: 1,
        deviceId: '$devices.deviceId',
        deviceName: '$devices.deviceName',
        status: '$devices.status',
        lastActive: '$devices.lastActive',
        deviceInfo: '$devices.deviceInfo',
      },
    },
    { $sort: { lastActive: -1 } },
    { $limit: limit }
  );

  return db.collection('users').aggregate(pipeline).toArray();
}

export async function getUserDevicesSnapshot(userId: string) {
  const db = await getAdminDb();
  return db.collection('users').findOne(
    { userId },
    {
      projection: {
        _id: 0,
        userId: 1,
        email: 1,
        username: 1,
        fullName: 1,
        devices: 1,
      },
    }
  );
}

export async function revokeDevice(userId: string, deviceId: string, reason: string) {
  const db = await getAdminDb();
  const before = await getUserDevicesSnapshot(userId);
  if (!before) {
    return null;
  }

  const deviceEntry = Array.isArray((before as any).devices)
    ? (before as any).devices.find((entry: any) => entry?.deviceId === deviceId)
    : null;

  const result = await db.collection('users').updateOne(
    { userId },
    {
      $pull: { devices: { deviceId } } as any,
      $set: { updatedAt: new Date() },
    }
  );

  if (!result.matchedCount) {
    return null;
  }

  await db.collection('device_revokes').insertOne({
    userId,
    deviceId,
    deviceName: deviceEntry?.deviceName || 'Unknown Device',
    reason,
    revokedAt: new Date(),
    createdAt: new Date(),
  });

  const after = await getUserDevicesSnapshot(userId);
  return { before, after };
}

export async function approveDeviceSwitch(userId: string, deviceId: string) {
  const db = await getAdminDb();
  const before = await getUserDevicesSnapshot(userId);
  if (!before) {
    return null;
  }

  const userDevices = Array.isArray((before as any).devices) ? (before as any).devices : [];
  const nextDevices = userDevices.map((entry: any) => {
    if (entry?.deviceId === deviceId) {
      return {
        ...entry,
        status: 'active',
        lastActive: new Date(),
      };
    }

    if (entry?.status === 'active') {
      return {
        ...entry,
        status: 'inactive',
      };
    }

    return entry;
  });

  const result = await db.collection('users').updateOne(
    { userId },
    {
      $set: {
        devices: nextDevices,
        updatedAt: new Date(),
      },
    }
  );

  if (!result.matchedCount) {
    return null;
  }

  const after = await getUserDevicesSnapshot(userId);
  return { before, after };
}
