import mongoose from 'mongoose';

/* One reader's one-per-thing actions, deduplicated by browser:
     react:<type>     a reaction on a post (target = post)
     poll:<key>       a poll vote, value = chosen option (target = post)
     comment-like     a like on a comment (target = comment)
     comment-report   a report on a comment (target = comment)
   Public counters on posts and comments are recounted from these. */
const blogInteractionSchema = new mongoose.Schema(
    {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
        target: { type: mongoose.Schema.Types.ObjectId, required: true },
        visitorId: { type: String, required: true },
        kind: { type: String, required: true },
        value: { type: Number, default: 0 }
    },
    { timestamps: true }
);

blogInteractionSchema.index({ target: 1, visitorId: 1, kind: 1 }, { unique: true });
blogInteractionSchema.index({ target: 1, kind: 1 });

export default mongoose.models.BlogInteraction || mongoose.model('BlogInteraction', blogInteractionSchema);
