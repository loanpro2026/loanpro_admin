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
