import mongoose from 'mongoose';

/**
 * Recycle bin. Every destructive path in the app copies the documents it is
 * about to remove in here first, so a wrong click, a stale admin tab or a
 * mistyped script can be undone instead of being a permanent loss. Participant
 * registrations in particular cannot be reconstructed from anywhere else.
 *
 * `document` is the whole original, stored loosely because the shape differs
 * per collection and must survive schema changes untouched.
 */
const DeletedRecordSchema = new mongoose.Schema({
    collectionName: { type: String, required: true, index: true },
    documentId: { type: String, required: true, index: true },
    document: { type: mongoose.Schema.Types.Mixed, required: true },
    // Who or what removed it: an admin username, a script name, or 'unknown'.
    deletedBy: { type: String, default: 'unknown', trim: true },
    reason: { type: String, default: '', trim: true },
    restoredAt: { type: Date, default: null }
}, {
    timestamps: true
});

DeletedRecordSchema.index({ createdAt: -1 });

export default mongoose.models.DeletedRecord
    || mongoose.model('DeletedRecord', DeletedRecordSchema);
