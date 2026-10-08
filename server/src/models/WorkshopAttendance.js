import mongoose from 'mongoose';

const WorkshopAttendanceSchema = new mongoose.Schema({
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopRegistration',
        required: true
    },
    rollNo: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: String,
        required: true,
        trim: true
    },
    package: {
        type: String,
        required: true,
        trim: true
    },
    // Track for this attendance event
    track: {
        type: String,
        enum: ['software', 'powertrain'],
        required: true
    },
    // Unique identifier for the specific session instance
    sessionId: {
        type: String,
        required: true,
        trim: true
    },
    sessionNumber: {
        type: Number,
        required: true,
        default: 1
    },
    sessionDate: {
        type: String,
        required: true // YYYY-MM-DD in IST
    },
    sessionTopic: {
        type: String,
        default: '',
        trim: true
    },
    // Anti-proxy device fingerprint (browser/hardware hash)
    deviceId: {
        type: String,
        required: true,
        trim: true
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    checkedInAt: {
        type: Date,
        default: Date.now
    },
    // GPS Verification metadata
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    locationAccuracy: {
        type: Number,
        default: null
    },
    distanceFromAdmin: {
        type: Number,
        default: null
    },
    verifiedBy: {
        type: String,
        enum: ['qr-scan', 'manual-admin', 'barcode-scanner'],
        default: 'qr-scan'
    }
}, {
    timestamps: true
});

// Atomic duplicate prevention: roll number cannot check in twice for the same session
WorkshopAttendanceSchema.index({ rollNo: 1, sessionId: 1 }, { unique: true });

// Anti-proxy device constraint: a device cannot check in multiple students for the same session
WorkshopAttendanceSchema.index({ deviceId: 1, sessionId: 1 }, { unique: true });

// Fast lookups by track and date
WorkshopAttendanceSchema.index({ track: 1, sessionDate: 1 });
WorkshopAttendanceSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.models.WorkshopAttendance
    || mongoose.model('WorkshopAttendance', WorkshopAttendanceSchema);
