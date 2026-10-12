import '../loadEnv.js';
import mongoose from 'mongoose';
import { connectMongoDB } from '../db/mongodb.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';

async function clearAttendance() {
    try {
        await connectMongoDB();
        console.log('Connected to MongoDB. Clearing all attendance records...');
        const result = await WorkshopAttendance.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} attendance activity record(s) from DB.`);
        process.exit(0);
    } catch (err) {
        console.error('Error clearing attendance:', err);
        process.exit(1);
    }
}

clearAttendance();
