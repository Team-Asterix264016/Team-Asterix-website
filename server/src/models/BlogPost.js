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
        // The subset of Markdown that src/lib/renderMarkdown.jsx understands.
        body: { type: String, default: '', maxlength: 50000 },
        coverImage: { type: String, default: '', trim: true },
        coverAlt: { type: String, default: '', trim: true, maxlength: 300 },
        author: { type: String, default: 'Team Asterix', trim: true, maxlength: 120 },
        authorRole: { type: String, default: '', trim: true, maxlength: 120 },
        category: { type: String, default: '', trim: true, maxlength: 60 },
        tags: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
        status: { type: String, enum: ['draft', 'published'], default: 'draft' },
        publishedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });

export default mongoose.models.BlogPost || mongoose.model('BlogPost', blogPostSchema);
