import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadDir = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Use memory storage so file buffers can be uploaded to ImageKit directly
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|svg|gif|pdf/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (ext || mime) {
        return cb(null, true);
    }
    cb(new Error('Only image and document files (JPEG, JPG, PNG, WEBP, SVG, GIF, PDF) are allowed.'));
};

export const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
    fileFilter
});

/* Workshop notes come in many formats (Markdown, notebooks, source files, Office docs, archives).
   Matched on extension; HTML, SVG and scripts that a browser would execute are left out. */
export const NOTE_FILE_EXTENSIONS = [
    '.pdf', '.md', '.markdown', '.txt', '.ipynb', '.py', '.c', '.cpp', '.h', '.hpp', '.ino', '.m', '.java',
    '.json', '.csv', '.yaml', '.yml', '.zip', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.png', '.jpg', '.jpeg', '.webp', '.gif'
];

export const noteUpload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (NOTE_FILE_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())) return cb(null, true);
        cb(new Error(`Unsupported note file type. Allowed: ${NOTE_FILE_EXTENSIONS.join(' ')}`));
    }
});

/**
 * Fallback helper to persist a buffer to local disk when ImageKit is not configured.
 */
export async function saveBufferToLocal(buffer, originalname) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = (originalname || 'upload.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `asterix-${uniqueSuffix}${path.extname(cleanName)}`;
    const fullPath = path.join(uploadDir, filename);

    await fs.promises.writeFile(fullPath, buffer);
    return {
        filename,
        fileUrl: `/uploads/${filename}`
    };
}

