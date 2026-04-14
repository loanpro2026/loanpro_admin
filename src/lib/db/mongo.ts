import { MongoClient } from 'mongodb';
import { getEnv } from '@/config/env';

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable');
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function getAdminDb() {
  const env = getEnv();
  const client = await getMongoClient();
  return client.db(env.MONGODB_DB_NAME);
}

export async function getDbByName(name: string) {
  const client = await getMongoClient();
  return client.db(name);
}

async function supportDbSignalScore(dbName: string) {
  const client = await getMongoClient();
  const db = client.db(dbName);
  const collectionNames = await db
    .listCollections({}, { nameOnly: true })
    .toArray()
    .then((rows) => new Set(rows.map((row) => String(row.name || '').toLowerCase())));

  const ticketCollections = ['supporttickets', 'support_tickets'];
  const contactCollections = ['contactrequests', 'contact_requests'];

  let score = 0;

  for (const name of [...ticketCollections, ...contactCollections]) {
    if (collectionNames.has(name)) {
      score += 1;
      const sample = await db.collection(name).findOne({}, { projection: { _id: 1 } });
      if (sample) {
        score += 2;
      }
    }
  }

  return score;
}

export async function getSupportDb() {
  const env = getEnv();
  if (env.MONGODB_SUPPORT_DB_NAME) {
    return getDbByName(env.MONGODB_SUPPORT_DB_NAME);
  }

  const adminDbName = String(env.MONGODB_DB_NAME || '').trim() || 'AdminDB';
  const fallbackDbName = 'test';

  if (adminDbName.toLowerCase() === fallbackDbName) {
    return getDbByName(adminDbName);
  }

  const [adminScore, fallbackScore] = await Promise.all([
    supportDbSignalScore(adminDbName).catch(() => 0),
    supportDbSignalScore(fallbackDbName).catch(() => 0),
  ]);

  return getDbByName(fallbackScore > adminScore ? fallbackDbName : adminDbName);
}
