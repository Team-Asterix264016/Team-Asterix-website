import mongoose from 'mongoose';

const SiteConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        default: 'main',
        unique: true,
        index: true
    },
    hero: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    story: {
        type: String,
        default: ''
    },
    contact: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    sponsorship: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    recruitment: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    workshop: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    internRecruitment: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    lastModified: {
        type: String,
        default: () => new Date().toISOString()
    }
}, {
    timestamps: true,
    minimize: false
});

export default mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);
