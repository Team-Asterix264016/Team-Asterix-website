// Adds or updates one Horizon blog post from a Markdown file, until the admin
// editor exists.
//
// Run from server/:
//   node --use-system-ca src/scripts/importBlogPost.js post.md             saves as a draft
//   node --use-system-ca src/scripts/importBlogPost.js post.md --publish   saves and publishes
//   node --use-system-ca src/scripts/importBlogPost.js post.md --dry-run   prints, touches nothing
//
// The file starts with front matter (title is required; slug defaults to it):
//
//   ---
//   title: Building the drive-by-wire rig
//   excerpt: One-paragraph summary shown on the card.
//   author: Ratheeswar S
//   authorRole: Perception Lead
//   category: Autonomy
//   tags: autonomy, hardware
//   cover: https://ik.imagekit.io/.../cover.jpg
//   coverAlt: The buggy on the test track
//   ---
//   ## First heading
//   Body in Markdown...
import '../loadEnv.js';
import fs from 'node:fs';
import mongoose from 'mongoose';
import BlogPost from '../models/BlogPost.js';
import { parsePostFile, readMinutes } from '../lib/blog.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const publish = args.includes('--publish');
const dryRun = args.includes('--dry-run');

if (!file) {
    console.error('Usage: node --use-system-ca src/scripts/importBlogPost.js <post.md> [--publish] [--dry-run]');
    process.exit(1);
}

const post = parsePostFile(fs.readFileSync(file, 'utf8'));

if (dryRun) {
    console.log(JSON.stringify({ ...post, body: `${post.body.slice(0, 200)}…`, readMinutes: readMinutes(post.body) }, null, 2));
    process.exit(0);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set; cannot import.');
    process.exit(1);
}

await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    dbName: process.env.MONGODB_DB_NAME?.trim() || 'asterix'
});

try {
    const existing = await BlogPost.findOne({ slug: post.slug }).lean();
    const update = { ...post };
    if (publish) {
        update.status = 'published';
        // Re-importing a published post keeps its original date and place in the list.
        update.publishedAt = existing?.publishedAt || new Date();
    }

    const saved = await BlogPost.findOneAndUpdate({ slug: post.slug }, { $set: update }, {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
    });
    console.log(`${existing ? 'Updated' : 'Created'} "${saved.title}" (${saved.slug}) as ${saved.status}.`);
} finally {
    await mongoose.disconnect();
}
