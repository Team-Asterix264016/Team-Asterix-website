import mongoose from 'mongoose';

const WorkshopAttendanceSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    track: {
        type: String,
        enum: ['software', 'powertrain'],
        required: true
    },
    sessionNumber: {
        type: Number,
        default: 1
    },
    sessionDate: {
        type: String,
        required: true
    },
    sessionTopic: {
        type: String,
        default: ''
    },
    adminLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        accuracy: { type: Number, default: null },
        updatedAt: { type: Date, default: null }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.models.WorkshopAttendanceSession
    || mongoose.model('WorkshopAttendanceSession', WorkshopAttendanceSessionSchema);
