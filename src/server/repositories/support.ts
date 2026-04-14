import { getSupportDb } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { getContactRequestsCollection, getSupportTicketsCollection } from '@/server/repositories/support-collections';

export type TicketListFilters = {
  search?: string;
  status?: string;
  priority?: string;
  limit?: number;
};

export type ContactListFilters = {
  search?: string;
  status?: string;
  inquiryType?: string;
  limit?: number;
};

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function canonicalTicketStatus(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'in_progress') return 'in-progress';
  return normalized;
}

function ticketIdentityQuery(ticketId: string) {
  const normalized = String(ticketId || '').trim();
  if (!normalized) {
    return { ticketId: '__missing__' };
  }

  if (ObjectId.isValid(normalized)) {
    return {
      $or: [{ ticketId: normalized }, { _id: new ObjectId(normalized) }],
    };
  }

  return { ticketId: normalized };
}

export async function listSupportTickets(filters: TicketListFilters) {
  const db = await getSupportDb();
  const ticketsCollection = await getSupportTicketsCollection(db);
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));

  const match: Record<string, unknown> = {};
  const status = String(filters.status || '').trim().toLowerCase();
  const priority = String(filters.priority || '').trim().toLowerCase();
  const search = String(filters.search || '').trim();

  if (status && status !== 'all') {
    const canonicalStatus = canonicalTicketStatus(status);
    match.status = canonicalStatus === 'in-progress' ? { $in: ['in-progress', 'in_progress'] } : canonicalStatus;
  }
  if (priority && priority !== 'all') {
    match.priority = priority;
  }
  if (search) {
    const regex = toSafeRegex(search);
    match.$or = [
      { ticketId: regex },
      { userId: regex },
      { userEmail: regex },
      { userName: regex },
      { subject: regex },
      { issueType: regex },
    ];
  }

  const rows = await ticketsCollection
    .find(match)
    .project({
      _id: 1,
      ticketId: 1,
      userId: 1,
      userEmail: 1,
      userName: 1,
      subject: 1,
      issueType: 1,
      priority: 1,
      status: 1,
      assignedTo: 1,
      lastUpdatedBy: 1,
      createdAt: 1,
      updatedAt: 1,
      responses: 1,
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return rows.map((row) => ({
    ...row,
    ticketId: String((row as { ticketId?: unknown }).ticketId || (row as { _id?: unknown })._id || ''),
    status: canonicalTicketStatus(String((row as { status?: unknown }).status || '')),
  }));
}

export async function getSupportTicketByTicketId(ticketId: string) {
  const db = await getSupportDb();
  const ticketsCollection = await getSupportTicketsCollection(db);
  return ticketsCollection.findOne(ticketIdentityQuery(ticketId));
}

export async function updateSupportTicketByTicketId(
  ticketId: string,
  patch: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    message?: string;
    adminName?: string;
  }
) {
  const db = await getSupportDb();
  const ticketsCollection = await getSupportTicketsCollection(db);
  const before = await getSupportTicketByTicketId(ticketId);
  if (!before) {
    return null;
  }

  const setPatch: Record<string, unknown> = {
    updatedAt: new Date(),
    lastUpdatedBy: 'admin',
    viewedByUser: false,
    viewedByAdmin: true,
  };
  if (patch.status) setPatch.status = canonicalTicketStatus(patch.status);
  if (patch.priority) setPatch.priority = patch.priority;
  if (typeof patch.assignedTo === 'string') setPatch.assignedTo = patch.assignedTo;

  const updateDoc: Record<string, unknown> = { $set: setPatch };
  if (patch.message && patch.message.trim()) {
    updateDoc.$push = {
      responses: {
        from: 'admin',
        message: patch.message.trim(),
        timestamp: new Date(),
        adminName: patch.adminName || 'Support Team',
      },
    };
  }

  const updated = await ticketsCollection.findOneAndUpdate(
    ticketIdentityQuery(ticketId),
    updateDoc,
    { returnDocument: 'after' }
  );

  return {
    before,
    after: updated,
  };
}

export async function listContactRequests(filters: ContactListFilters) {
  const db = await getSupportDb();
  const contactRequestsCollection = await getContactRequestsCollection(db);
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));

  const match: Record<string, unknown> = {};
  const status = String(filters.status || '').trim().toLowerCase();
  const inquiryType = String(filters.inquiryType || '').trim().toLowerCase();
  const search = String(filters.search || '').trim();

  if (status && status !== 'all') {
    match.status = status;
  }
  if (inquiryType && inquiryType !== 'all') {
    match.inquiryType = inquiryType;
  }
  if (search) {
    const regex = toSafeRegex(search);
    match.$or = [
      { requestId: regex },
      { name: regex },
      { email: regex },
      { phone: regex },
      { organization: regex },
      { inquiryType: regex },
    ];
  }

  return contactRequestsCollection
    .find(match)
    .project({
      _id: 1,
      requestId: 1,
      name: 1,
      email: 1,
      phone: 1,
      organization: 1,
      inquiryType: 1,
      message: 1,
      status: 1,
      priority: 1,
      assignedTo: 1,
      nextFollowUpAt: 1,
      createdAt: 1,
      updatedAt: 1,
      callNotes: 1,
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getContactRequestByRequestId(requestId: string) {
  const db = await getSupportDb();
  const contactRequestsCollection = await getContactRequestsCollection(db);
  return contactRequestsCollection.findOne({ requestId });
}

export async function updateContactRequestByRequestId(
  requestId: string,
  patch: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    note?: string;
    noteBy?: string;
  }
) {
  const db = await getSupportDb();
  const contactRequestsCollection = await getContactRequestsCollection(db);
  const before = await getContactRequestByRequestId(requestId);
  if (!before) {
    return null;
  }

  const setPatch: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (patch.status) {
    setPatch.status = patch.status;
    if (patch.status === 'called') {
      setPatch.lastCalledAt = new Date();
      if (!(before as any).firstCalledAt) {
        setPatch.firstCalledAt = new Date();
      }
    }
  }
  if (patch.priority) setPatch.priority = patch.priority;
  if (typeof patch.assignedTo === 'string') setPatch.assignedTo = patch.assignedTo;

  const updateDoc: Record<string, unknown> = { $set: setPatch };
  if (patch.note && patch.note.trim()) {
    updateDoc.$push = {
      callNotes: {
        note: patch.note.trim(),
        by: patch.noteBy || 'admin',
        createdAt: new Date(),
      },
    };
  }

  const updated = await contactRequestsCollection.findOneAndUpdate(
    { requestId },
    updateDoc,
    { returnDocument: 'after' }
  );

  return {
    before,
    after: updated,
  };
}
