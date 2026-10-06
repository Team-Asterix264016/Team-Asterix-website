import mongoose from 'mongoose';

const workshopResourceSchema = new mongoose.Schema(
    {
        track: {
            type: String,
            required: true,
            enum: ['software', 'powertrain', 'common'],
            index: true
        },
        sessionId: {
            type: String,
            required: true,
            index: true
        },
        sessionNumber: {
            type: Number,
            default: 1
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: '',
            trim: true
        },
        resources: [
            {
                label: { type: String, required: true },
                url: { type: String, required: true },
                type: {
                    type: String,
                    enum: ['slides', 'drive', 'code', 'pdf', 'video', 'link'],
                    default: 'link'
                }
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
