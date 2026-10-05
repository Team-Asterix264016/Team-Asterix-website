import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: ['text', 'textarea', 'select'], default: 'text' },
    required: { type: Boolean, default: true },
    options: { type: [String], default: [] }
});

const WorkshopProjectConfigSchema = new mongoose.Schema({
    key: { type: String, default: 'main', unique: true, index: true },
    title: { type: String, default: 'Workshop Project Submission', trim: true },
    description: { type: String, default: '', trim: true },
    isOpen: { type: Boolean, default: true },
    questions: { type: [QuestionSchema], default: [] }
}, { timestamps: true, minimize: false });

export default mongoose.models.WorkshopProjectConfig
    || mongoose.model('WorkshopProjectConfig', WorkshopProjectConfigSchema);