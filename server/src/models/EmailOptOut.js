import mongoose from 'mongoose';

/* "Do not email this address." Written by the unsubscribe link and honoured by
   the Mail Cluster for every segment, including participants who never joined
   the newsletter. Subscribing again removes the entry. */
const emailOptOutSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, trim: true, lowercase: true }
    },
    { timestamps: true }
);

export default mongoose.models.EmailOptOut || mongoose.model('EmailOptOut', emailOptOutSchema);
