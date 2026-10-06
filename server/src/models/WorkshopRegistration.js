import mongoose from 'mongoose';

const WorkshopRegistrationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    // Not asked on the current form; kept for registrations from other colleges.
    college: { type: String, default: '', trim: true },
    year: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true },
    package: {
        type: String,
        required: true,
        enum: ['software', 'powertrain', 'combo'],
        lowercase: true,
        trim: true
    },
    tracksEnrolled: {
        type: [{ type: String, enum: ['software', 'powertrain'] }],
        required: true
    },
    // Whole rupees, copied from config/workshopPackages.js at registration time.
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    razorpayOrderId: { type: String, default: '', trim: true },
    razorpayPaymentId: { type: String, default: '', trim: true },
    // Assigned only when a payment is confirmed, so the sequence has no gaps
    // from abandoned checkouts. Sparse so the many pending rows without one
    // do not collide on the unique index.
    receiptNo: { type: String, unique: true, sparse: true },
    paidAt: { type: Date, default: null },
    passwordHash: { type: String, default: '', trim: true }
}, {
    timestamps: true
});

WorkshopRegistrationSchema.index({ razorpayOrderId: 1 });
WorkshopRegistrationSchema.index({ email: 1, status: 1 });
WorkshopRegistrationSchema.index({ package: 1, status: 1, createdAt: -1 });

export default mongoose.models.WorkshopRegistration
    || mongoose.model('WorkshopRegistration', WorkshopRegistrationSchema);
