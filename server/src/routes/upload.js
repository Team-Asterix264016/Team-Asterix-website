import { Router } from 'express';
import { upload, noteUpload, saveBufferToLocal } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadToImageKit, isImageKitConfigured, getImageKitAuthParams } from '../lib/imagekit.js';

const router = Router();

/* Local disk is only a real destination when the host mounts a persistent
   volume at UPLOADS_DIR. Without one, a container rebuild erases every file and
   the URLs saved in the database keep pointing at 404s -- which is exactly how
   the gallery and squad photos were lost. */
/* Trimmed and lowercased because a value typed into a host's environment panel
   (or set through `set VAR=true &&` on Windows) routinely carries stray
   whitespace, and a strict comparison would silently read it as "off". */
const flagEnabled = (value) => ['true', '1', 'yes'].includes(String(value || '').trim().toLowerCase());

const persistentUploads = Boolean(String(process.env.UPLOADS_DIR || '').trim()) || flagEnabled(process.env.ALLOW_LOCAL_UPLOADS);

// GET /api/upload/status (Public - whether uploads can persist via ImageKit)
router.get('/status', (req, res) => {
    const imagekit = isImageKitConfigured();
    res.json({
        imagekit,
        localFallback: false,
        persistent: imagekit
    });
});

// GET /api/upload/auth (Protected - Return ImageKit auth parameters for client SDKs)
router.get('/auth', authenticateToken, (req, res) => {
    try {
        if (!isImageKitConfigured()) {
            return res.status(503).json({ error: 'ImageKit is not configured in server environment variables.' });
        }
        const authParams = getImageKitAuthParams();
        res.json(authParams);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate ImageKit auth parameters', details: err.message });
    }
});

// POST /api/upload (Protected - Upload image exclusively to ImageKit cloud media library)
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided in request.' });
        }

        const folder = req.body.folder || '/asterix';
        const tags = req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : ['asterix', 'website'];
        const fileName = req.body.fileName || req.file.originalname;

        if (!isImageKitConfigured()) {
            return res.status(503).json({
                error: 'ImageKit is not configured in server environment variables. All photos must be stored in ImageKit.',
                code: 'IMAGEKIT_NOT_CONFIGURED'
            });
        }

        try {
            const ikResult = await uploadToImageKit({
                fileBuffer: req.file.buffer,
                fileName,
                folder,
                tags
            });

            return res.status(201).json({
                success: true,
                provider: 'imagekit',
                url: ikResult.url,
                thumbnailUrl: ikResult.thumbnailUrl,
                fileId: ikResult.fileId,
                filename: ikResult.name,
                size: ikResult.size,
                width: ikResult.width,
                height: ikResult.height
            });
        } catch (ikErr) {
            console.error('ImageKit upload failed:', ikErr.message);
            return res.status(502).json({
                error: 'ImageKit upload failed. All photos must be stored in ImageKit.',
                details: ikErr.message
            });
        }
    } catch (err) {
        console.error('File upload error:', err);
        res.status(500).json({ error: 'Failed to process image upload', details: err.message });
    }
});

// POST /api/upload/note-file (Protected - workshop note attachments of any supported note format)
router.post(
    '/note-file',
    authenticateToken,
    (req, res, next) =>
        noteUpload.single('file')(req, res, (err) => {
            if (!err) return next();
            const tooBig = err.code === 'LIMIT_FILE_SIZE';
            return res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'File is larger than 25 MB.' : err.message });
        }),
    async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file provided.' });
        if (!isImageKitConfigured()) {
            return res.status(503).json({ error: 'File storage (ImageKit) is not configured on the server.' });
        }
        try {
            const result = await uploadToImageKit({
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_'),
                folder: '/asterix/workshop/notes',
                tags: ['asterix', 'workshop-notes'],
                useUniqueFileName: true
            });
            return res.status(201).json({ success: true, url: result.url, filename: result.name });
        } catch (err) {
            console.error('Note file upload failed:', err.message);
            return res.status(502).json({ error: 'Upload to file storage failed. Please try again.' });
        }
    }
);

export default router;
