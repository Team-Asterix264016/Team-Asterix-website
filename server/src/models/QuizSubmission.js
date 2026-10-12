import mongoose from 'mongoose';

const AnswerRecordSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionIndex: { type: Number, default: -1 }, // -1 = unattempted
    isCorrect: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 }
});

const QuizSubmissionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    userName: { type: String, required: true, trim: true },
    rollNo: { type: String, default: '', trim: true },
    
    attemptNumber: { type: Number, default: 1 },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    resetByAdmin: { type: Boolean, default: false },
    resetBy: { type: String, default: '' },
    
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    timeSpentSeconds: { type: Number, default: 0 },
    
    answers: [AnswerRecordSchema],
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    
    status: {
        type: String,
        enum: ['in-progress', 'completed', 'timed-out'],
        default: 'in-progress'
    }
}, {
    timestamps: true
});

QuizSubmissionSchema.index({ quizId: 1, userEmail: 1, isArchived: 1 });
QuizSubmissionSchema.index({ quizId: 1, score: -1, timeSpentSeconds: 1 });

const QuizSubmission = mongoose.models.QuizSubmission || mongoose.model('QuizSubmission', QuizSubmissionSchema);

// Safe index drop in background for existing Mongo collections that had the old unique index
QuizSubmission.collection?.dropIndex('quizId_1_userEmail_1').catch(() => {});

export default QuizSubmission;
