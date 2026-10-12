import mongoose from 'mongoose';

/* One document per article page view. The browser creates it on load and then
   updates scroll depth, engaged seconds and the "read" flag as the visit goes
   on. No IP address or personal data is stored: visitorId is a random id the
   browser generated for itself. */
const blogViewSchema = new mongoose.Schema(
    {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true },
        visitorId: { type: String, default: '' },
        // Host of the referring page, and utm_source when the link carried one.
        referrer: { type: String, default: '', maxlength: 120 },
        source: { type: String, default: '', maxlength: 40 },
        device: { type: String, enum: ['mobile', 'desktop'], default: 'desktop' },
        maxScroll: { type: Number, default: 0, min: 0, max: 100 },
        engagedSeconds: { type: Number, default: 0, min: 0 },
        read: { type: Boolean, default: false }
    },
    { timestamps: true }
);

blogViewSchema.index({ post: 1, createdAt: -1 });
blogViewSchema.index({ createdAt: -1 });

export default mongoose.models.BlogView || mongoose.model('BlogView', blogViewSchema);
