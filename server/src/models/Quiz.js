import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true, trim: true },
    options: {
        type: [String],
        validate: [arr => Array.isArray(arr) && arr.length >= 2, 'At least 2 options are required']
    },
    correctOptionIndex: { type: Number, required: true, min: 0 },
    points: { type: Number, default: 1, min: 1 },
    explanation: { type: String, default: '', trim: true }
});

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    
    // Exam Schedule & Timing
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    
    // Results Visibility Schedule
    resultsPublishTime: { type: Date, required: true },
    manualResultsRelease: { type: Boolean, default: false },
    showExplanations: { type: Boolean, default: true },
    
    // Questions & Scoring
    questions: [QuestionSchema],
    totalPoints: { type: Number, default: 0 },
    passingPercentage: { type: Number, default: 50 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    createdBy: { type: String, default: 'admin' }
}, {
    timestamps: true
});

QuizSchema.pre('save', function() {
    if (Array.isArray(this.questions)) {
        this.totalPoints = this.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
    }
});

QuizSchema.index({ startTime: 1, endTime: 1, resultsPublishTime: 1 });

QuizSchema.methods.areResultsPublished = function() {
    if (this.manualResultsRelease) return true;
    if (!this.resultsPublishTime) return false;
    return new Date() >= new Date(this.resultsPublishTime);
};

export default mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
