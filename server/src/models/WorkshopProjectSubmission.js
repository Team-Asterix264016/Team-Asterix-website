import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    label: { type: String, required: true },
    answer: { type: String, default: '' }
}, { _id: false });

const WorkshopProjectSubmissionSchema = new mongoose.Schema({
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopRegistration',
        required: true,
        unique: true,
        index: true
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    college: { type: String, default: '', trim: true },
    year: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true },
    package: { type: String, required: true },
    tracksEnrolled: { type: [{ type: String }], default: [] },
    driveLink: { type: String, required: true, trim: true },
    feedback: { type: String, default: '', trim: true, maxlength: 3000 },
    answers: { type: [AnswerSchema], default: [] }
}, { timestamps: true });

export default mongoose.models.WorkshopProjectSubmission
    || mongoose.model('WorkshopProjectSubmission', WorkshopProjectSubmissionSchema);