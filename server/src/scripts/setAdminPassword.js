/**
 * One-shot admin password reset.
 *
 * The login bypass that used to accept a hardcoded password is gone, and the
 * seeded `admin` user is only created when the database is empty at first boot.
 * On a database that already has content there may therefore be no account with
 * a password anybody knows. This upserts one.
 *
 *   node --use-system-ca src/scripts/setAdminPassword.js '<new password>' [username]
 *
 * Run it, confirm you can sign in at #admin, and only then remove any remaining
 * credential fallbacks.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const { default: User } = await import('../models/User.js');
const { resolveMongoDbName } = await import('../db/mongodb.js');

const password = process.argv[2];
const username = (process.argv[3] || 'admin').trim().toLowerCase();

if (!password || password.length < 10) {
    console.error('Usage: node src/scripts/setAdminPassword.js <password> [username]');
    console.error('The password must be at least 10 characters.');
    process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set. Point it at the database you want to change.');
    process.exit(1);
}

const dbName = resolveMongoDbName(uri);
await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, dbName });

const passwordHash = bcrypt.hashSync(password, 10);
const existing = await User.findOne({ username });

if (existing) {
    existing.passwordHash = passwordHash;
    existing.accessLevel = 'SuperAdmin';
    await existing.save();
    console.log(`Password updated for existing user "${username}" (accessLevel: SuperAdmin).`);
} else {
    await User.create({
        username,
        passwordHash,
        name: 'Team Asterix Administrator',
        role: 'System Administrator',
        accessLevel: 'SuperAdmin'
    });
    console.log(`Created new SuperAdmin user "${username}".`);
}

await mongoose.disconnect();
console.log('Done. Sign in at #admin to confirm before removing any credential fallbacks.');
