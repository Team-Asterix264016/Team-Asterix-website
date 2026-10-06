import mongoose from 'mongoose';

const workshopResourceSchema = new mongoose.Schema(
    {
        track: {
            type: String,
            required: true,
            enum: ['software', 'powertrain', 'common'],
            index: true
        },
        // Free-text grouping shown as a filter on the participant Notes tab, e.g. "Computer Vision".
        module: {
            type: String,
            default: '',
            trim: true,
            maxlength: 60
        },
        sessionId: {
            type: String,
            default: '',
            index: true
        },
        sessionNumber: {
            type: Number,
            default: 1
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160
        },
        description: {
            type: String,
            default: '',
            trim: true,
            maxlength: 2000
        },
        resources: [
            {
                label: { type: String, required: true, trim: true, maxlength: 120 },
                url: { type: String, required: true, trim: true },
                // Admin-chosen and free-form (pdf, slides, colab, code, ... or anything custom);
                // the participant page maps known values to badges and shows the raw text otherwise.
                type: { type: String, default: 'link', trim: true, lowercase: true, maxlength: 30 }
            }
        ]
    },
    {
        timestamps: true
    }
);

workshopResourceSchema.index({ track: 1, sessionId: 1 });

const WorkshopResource = mongoose.models.WorkshopResource || mongoose.model('WorkshopResource', workshopResourceSchema);

export default WorkshopResource;
