import DeletedRecord from '../models/DeletedRecord.js';

/**
 * Copies documents into the recycle bin before they are deleted.
 *
 * Call this *before* the delete, and only delete if it resolves. A failed
 * archive means the delete must not happen: losing the ability to undo is
 * worse than leaving a stale row in place.
 *
 * Returns the number of documents archived.
 */
export async function archiveDocuments(collectionName, docs, { deletedBy = 'unknown', reason = '' } = {}) {
    const list = (Array.isArray(docs) ? docs : [docs]).filter(Boolean);
    if (list.length === 0) return 0;

    const rows = list.map(doc => ({
        collectionName,
        documentId: String(doc._id ?? doc.id ?? ''),
        document: doc,
        deletedBy,
        reason
    }));

    await DeletedRecord.insertMany(rows, { ordered: false });
    console.log(`[RECYCLE BIN] Archived ${rows.length} ${collectionName} document(s) deleted by ${deletedBy}${reason ? ` (${reason})` : ''}.`);
    return rows.length;
}

/**
 * Names whoever is behind a request, for the audit trail. Falls back to the
 * access level, then 'unknown' — never to a blank string, which reads as a
 * missing field rather than an unidentified actor.
 */
export function actorOf(req) {
    return req?.user?.username || req?.user?.accessLevel || 'unknown';
}
