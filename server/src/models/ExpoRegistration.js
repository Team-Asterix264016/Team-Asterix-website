import mongoose from 'mongoose';

/* One row per shortlisted Expo team. A team that submits again updates its
   row (for example to change its problem statement); `submissions` counts how
   many times the form was sent for it. */
const ExpoRegistrationSchema = new mongoose.Schema(
    {
        teamNo: { type: Number, required: true, unique: true, min: 1 },
        teamName: { type: String, required: true, trim: true },
        problemStatement: { type: String, required: true, trim: true },
        // When the team took its current problem statement. Slots go first come, first served.
        problemStatementAt: { type: Date },
        captainName: { type: String, required: true, trim: true },
        captainRollNo: { type: String, required: true, trim: true },
        captainPhone: { type: String, required: true, trim: true },
        captainEmail: { type: String, required: true, trim: true, lowercase: true },
        // No default: the route's $inc creates it, and a default would clash with that on upsert.
        submissions: { type: Number }
    },
    { timestamps: true }
);

export default mongoose.models.ExpoRegistration || mongoose.model('ExpoRegistration', ExpoRegistrationSchema);
