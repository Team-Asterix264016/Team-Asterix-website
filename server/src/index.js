// Must stay the first import: it loads .env before any module reads process.env.
import './loadEnv.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import cors from 'cors';

import { connectMongoDB, isMongoConnected } from './db/mongodb.js';
import { isImageKitConfigured } from './lib/imagekit.js';
import siteDataRoutes from './routes/siteData.js';
import memberRoutes from './routes/members.js';
import galleryRoutes from './routes/gallery.js';
import updateRoutes from './routes/updates.js';
import subsystemRoutes from './routes/subsystems.js';
import authRoutes from './routes/auth.js';
import subscriberRoutes from './routes/subscribers.js';
import sponsorInquiryRoutes from './routes/sponsorInquiries.js';
import uploadRoutes from './routes/upload.js';
import submissionRoutes from './routes/submissions.js';
import workshopRoutes from './routes/workshop.js';
import attendanceRoutes from './routes/attendance.js';
import quizRoutes from './routes/quiz.js';
import workshopProjectRoutes from './routes/workshopProjects.js';
import blogRoutes from './routes/blog.js';
import { describeRazorpayStatus } from './lib/razorpay.js';
import { isWhatsAppConfigured } from './lib/whatsapp.js';
import { whatsappActivityMiddleware } from './middleware/whatsappActivity.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas (or fallback mode if MONGODB_URI is not set yet)
connectMongoDB();

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'https://asterix-website.vercel.app'];

const PREVIEW_ORIGIN = /^https?:\/\/[a-z0-9-.]*(vercel\.app|netlify\.app|onrender\.com|github\.io|localhost)(:\d+)?$/i;

app.use(cors({
    origin: (origin, callback) => {
        // No Origin header means same-origin, curl, or a server-to-server call.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || PREVIEW_ORIGIN.test(origin)) {
            return callback(null, true);
        }
        console.warn(`[CORS] Blocked request from origin: ${origin}. Set CORS_ORIGIN environment variable to allow.`);
        return callback(new Error(`Origin ${origin} is not permitted by CORS_ORIGIN.`));
    },
    credentials: true
}));

// The Razorpay webhook signature is computed over the exact request bytes, so
// that one path keeps its raw body. express.json below skips a body already read.
app.use('/api/workshop/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
const uploadsPath = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

app.use('/api', whatsappActivityMiddleware);

/* Local disk only survives a redeploy when the host mounts a persistent volume
   at UPLOADS_DIR. On a plain container (Render's free tier, for one) the
   directory is wiped on every deploy, so anything written there becomes a dead
   URL in the database. */
const flagEnabled = (value) => ['true', '1', 'yes'].includes(String(value || '').trim().toLowerCase());
const persistentUploads = Boolean(String(process.env.UPLOADS_DIR || '').trim()) || flagEnabled(process.env.ALLOW_LOCAL_UPLOADS);

/* Health check endpoint.

   `database` used to be the constant string 'MongoDB Atlas', so this reported a
   healthy database even with MONGODB_URI unset and every query timing out. It
   now reports what is actually true, and says whether image uploads have a
   persistent destination -- without that, uploads land on an ephemeral
   container disk and every stored URL dies at the next deploy. */
app.get('/api/health', (req, res) => {
    const mongoOk = isMongoConnected();
    const imagekitOk = isImageKitConfigured();

    res.json({
        status: mongoOk ? 'online' : 'degraded',
        service: 'Team Asterix API Engine',
        database: {
            connected: mongoOk,
            provider: process.env.MONGODB_URI ? 'MongoDB Atlas' : 'none (MONGODB_URI unset)'
        },
        uploads: {
            provider: imagekitOk ? 'imagekit' : (persistentUploads ? 'local-disk' : 'none'),
            persistent: imagekitOk || persistentUploads
        },
        notifications: {
            whatsappConfigured: isWhatsAppConfigured()
        },
        timestamp: new Date().toISOString()
    });
});

// Mount routes
app.use('/api/site-data', siteDataRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/subsystems', subsystemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/sponsor-inquiries', sponsorInquiryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/workshop', workshopRoutes);
app.use('/api/workshop/projects', workshopProjectRoutes);
app.use('/api/workshop/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/blog', blogRoutes);

// Global error handler
app.use((err, req, res, _next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`🚀 Asterix Server & MongoDB API running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`📁 Uploads available at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/uploads/`);
    console.log(`💳 ${describeRazorpayStatus()}`);
});
