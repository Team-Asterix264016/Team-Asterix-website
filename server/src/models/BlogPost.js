import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema(
    {
        // URL key for #community/blog/<slug>.
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            maxlength: 120
        },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        excerpt: { type: String, default: '', trim: true, maxlength: 600 },
        // The subset of Markdown that src/lib/renderMarkdown.jsx renders.
        body: { type: String, default: '', maxlength: 50000 },
        coverImage: { type: String, default: '', trim: true },
        coverAlt: { type: String, default: '', trim: true, maxlength: 300 },
        // CSS object-position for the cover's focal point, set with the admin crop tool.
        coverPosition: { type: String, default: '50% 50%', trim: true },
        // At most one post is featured; it takes the large card at the top of the blog.
        featured: { type: Boolean, default: false },
        author: { type: String, default: 'Team Asterix', trim: true, maxlength: 120 },
        authorRole: { type: String, default: '', trim: true, maxlength: 120 },
        category: { type: String, default: '', trim: true, maxlength: 60 },
        tags: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
        // Shown as a "Key takeaways" box at the top of the post.
        takeaways: { type: [{ type: String, trim: true, maxlength: 200 }], default: [] },
        // open: comments appear at once; approval: held until an admin approves; closed: no new comments.
        commentsMode: { type: String, enum: ['open', 'approval', 'closed'], default: 'open' },
        status: { type: String, enum: ['draft', 'published'], default: 'draft' },
        publishedAt: { type: Date, default: null },

        // Public counters, recounted by the engagement routes; analytics come from BlogView.
        viewCount: { type: Number, default: 0 },
        commentCount: { type: Number, default: 0 },
        reactionCounts: {
            like: { type: Number, default: 0 },
            insightful: { type: Number, default: 0 },
            fire: { type: Number, default: 0 },
            clap: { type: Number, default: 0 }
        },
        shareCounts: {
            whatsapp: { type: Number, default: 0 },
            linkedin: { type: Number, default: 0 },
            x: { type: Number, default: 0 },
            copy: { type: Number, default: 0 },
            native: { type: Number, default: 0 }
        }
    },
    { timestamps: true }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });

export default mongoose.models.BlogPost || mongoose.model('BlogPost', blogPostSchema);
