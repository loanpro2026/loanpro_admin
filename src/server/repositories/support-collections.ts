import type { Collection, Db } from 'mongodb';

const TICKET_COLLECTION_CANDIDATES = ['supporttickets', 'support_tickets'] as const;
const CONTACT_COLLECTION_CANDIDATES = ['contactrequests', 'contact_requests'] as const;

type ResolvedSupportCollections = {
  tickets: string;
  contacts: string;
};

const resolvedCollectionCache = new Map<string, ResolvedSupportCollections>();

async function resolveCollectionName(db: Db, candidates: readonly string[], fallback: string) {
  const existing = await db
    .listCollections({}, { nameOnly: true })
    .toArray()
    .then((rows) =>
      new Map(rows.map((row) => {
        const name = String(row.name || '');
        return [name.toLowerCase(), name] as const;
      }))
    );

  for (const candidate of candidates) {
    const resolved = existing.get(candidate.toLowerCase());
    if (resolved) {
      return resolved;
    }
  }

  return fallback;
}

async function resolveSupportCollections(db: Db): Promise<ResolvedSupportCollections> {
  const cacheKey = String(db.databaseName || '').trim().toLowerCase();
  const cached = resolvedCollectionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [tickets, contacts] = await Promise.all([
    resolveCollectionName(db, TICKET_COLLECTION_CANDIDATES, TICKET_COLLECTION_CANDIDATES[0]),
    resolveCollectionName(db, CONTACT_COLLECTION_CANDIDATES, CONTACT_COLLECTION_CANDIDATES[0]),
  ]);

  const resolved = { tickets, contacts };
  resolvedCollectionCache.set(cacheKey, resolved);
  return resolved;
}

export async function getSupportTicketsCollection(db: Db): Promise<Collection> {
  const { tickets } = await resolveSupportCollections(db);
  return db.collection(tickets);
}

export async function getContactRequestsCollection(db: Db): Promise<Collection> {
  const { contacts } = await resolveSupportCollections(db);
  return db.collection(contacts);
}

export async function countOpenSupportTickets(db: Db) {
  const ticketsCollection = await getSupportTicketsCollection(db);
  return ticketsCollection.countDocuments({ status: { $in: ['open', 'in-progress', 'in_progress'] } });
}

export async function countOpenContactRequests(db: Db) {
  const contactsCollection = await getContactRequestsCollection(db);
  return contactsCollection.countDocuments({ status: { $in: ['new', 'follow-up', 'called'] } });
}
