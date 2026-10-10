import mongoose from 'mongoose';

/* Reader comments on Horizon posts, one level of replies deep.
   status: visible  - shown to everyone
           pending  - held for approval (post set to approval, or reported by
                      several readers); shown only to its author and admins
           hidden   - removed by an admin
           deleted  - removed by its author; kept as a placeholder while replies exist */
const blogCommentSchema = new mongoose.Schema(
    {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogComment', default: null },
        name: { type: String, required: true, trim: true, maxlength: 60 },
        body: { type: String, default: '', maxlength: 2000 },
        status: { type: String, enum: ['visible', 'pending', 'hidden', 'deleted'], default: 'visible' },
        // Replies written from the admin portal carry a "Team Asterix" badge.
        isTeam: { type: Boolean, default: false },
        visitorId: { type: String, default: '' },
        // sha256 of the secret the author's browser keeps for edit/delete.
        editTokenHash: { type: String, default: '' },
        likes: { type: Number, default: 0 },
        reports: { type: Number, default: 0 },
        editedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

blogCommentSchema.index({ post: 1, status: 1, createdAt: 1 });
blogCommentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.BlogComment || mongoose.model('BlogComment', blogCommentSchema);
