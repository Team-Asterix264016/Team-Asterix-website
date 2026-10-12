import mongoose from 'mongoose';

const SubscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        default: null
    },
    // Where they first signed up: the home page CTA, the community page, or a blog post.
    source: {
        type: String,
        enum: ['home', 'community', 'blog'],
        default: 'home'
    },
    // Set by the unsubscribe link; cleared if they subscribe again.
    unsubscribedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

export default mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
