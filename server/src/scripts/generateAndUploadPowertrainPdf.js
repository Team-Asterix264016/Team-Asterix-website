import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { uploadToImageKit } from '../lib/imagekit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const teamsData = [
    {
        group: 'Group 01',
        m1: { name: 'Raghav GS', dept: 'ECE', year: 'II YEAR', rollNo: '25L189', regNo: '715525106091', phone: '9962479975', email: '25l189@psgitech.ac.in' },
        m2: { name: 'Raghauv N D', dept: 'EEE', year: 'II YEAR', rollNo: '25E176', regNo: '715525105076', phone: '9787229518', email: '25e176@psgitech.ac.in' }
    },
    {
        group: 'Group 02',
        m1: { name: 'Ben Jounes B', dept: 'VLSI', year: 'II YEAR', rollNo: '25V107', regNo: '715525249007', phone: '6369209286', email: '25v107@psgitech.ac.in' },
        m2: { name: 'Sankaranarayanan L', dept: 'EEE', year: 'II YEAR', rollNo: '25E152', regNo: '715525105063', phone: '9791407050', email: '25e152@psgitech.ac.in' }
    },
    {
        group: 'Group 03',
        m1: { name: 'Annapoorni S', dept: 'ICE', year: 'III YEAR', rollNo: '24U104', regNo: '715524112004', phone: '9344417101', email: '24u104@psgitech.ac.in' },
        m2: { name: 'Deeksha Balaji', dept: 'EEE', year: 'II YEAR', rollNo: '25E116', regNo: '715525105016', phone: '9942245925', email: '25e116@psgitech.ac.in' }
    },
    {
        group: 'Group 04',
        m1: { name: 'Vibash Duraimurugan R', dept: 'ECE', year: 'II YEAR', rollNo: '25L221', regNo: '715525106123', phone: '8015131854', email: '25l221@psgitech.ac.in' },
        m2: { name: 'Kirthick S', dept: 'EEE', year: 'II YEAR', rollNo: '25E150', regNo: '715525105050', phone: '6385832167', email: '25e150@psgitech.ac.in' }
    },
    {
        group: 'Group 05',
        m1: { name: 'Tarun. I', dept: 'VLSI', year: 'II YEAR', rollNo: '25V154', regNo: '715525249054', phone: '6385691678', email: '25v154@psgitech.ac.in' },
        m2: { name: 'K.Thulasi Madhavaa', dept: 'ECE', year: 'II YEAR', rollNo: '25L218', regNo: '715525106120', phone: '6385105559', email: '25l218@psgitech.ac.in' }
    },
    {
        group: 'Group 06',
        m1: { name: 'J.kaviya', dept: 'ICE', year: 'II YEAR', rollNo: '25U133', regNo: '715525112034', phone: '8807030548', email: '25u133@psgitech.ac.in' },
        m2: { name: 'Saisith.N', dept: 'EEE', year: 'II YEAR', rollNo: '25E190', regNo: '715525105090', phone: '9940674168', email: '25e190@psgitech.ac.in' }
    },
    {
        group: 'Group 07',
        m1: { name: 'Karthi W R', dept: 'VLSI', year: 'II YEAR', rollNo: '25V119', regNo: '715525249020', phone: '6383799699', email: '25v119@psgitech.ac.in' },
        m2: { name: 'Sanjeev S', dept: 'EEE', year: 'II YEAR', rollNo: '25E194', regNo: '715525105094', phone: '9363535132', email: '25e194@psgitech.ac.in' }
    },
    {
        group: 'Group 08',
        m1: { name: 'Preethy.S', dept: 'ICE', year: 'II YEAR', rollNo: '25U142', regNo: '715525112044', phone: '8438062906', email: '25u142@psgitech.ac.in' },
        m2: { name: 'Naveen Kumar Raja S', dept: 'EEE', year: 'II YEAR', rollNo: '25E163', regNo: '715525105062', phone: '7305932998', email: '25e163@psgitech.ac.in' }
    },
    {
        group: 'Group 09',
        m1: { name: 'Rubesh SK', dept: 'VLSI', year: 'II YEAR', rollNo: '25V142', regNo: '715525249042', phone: '6369926295', email: '25v142@psgitech.ac.in' },
        m2: { name: 'Thanuja J', dept: 'EEE', year: 'II YEAR', rollNo: '25E210', regNo: '715525105110', phone: '9159107747', email: '25e210@psgitech.ac.in' }
    },
    {
        group: 'Group 10',
        m1: { name: 'Jeevitha. V', dept: 'ICE', year: 'II YEAR', rollNo: '25U125', regNo: '715525112026', phone: '8870846986', email: '25u125@psgitech.ac.in' },
        m2: { name: 'Harsith V', dept: 'EEE', year: 'II YEAR', rollNo: '25E133', regNo: '715525105033', phone: '7373069780', email: '25e133@psgitech.ac.in' }
    },
    {
        group: 'Group 11',
        m1: { name: 'Swetha S L', dept: 'VLSI', year: 'II YEAR', rollNo: '25V153', regNo: '715525249053', phone: '9487951222', email: '25v153@psgitech.ac.in' },
        m2: { name: 'Sugankumar.V.S', dept: 'EEE', year: 'II YEAR', rollNo: '25E207', regNo: '715525105107', phone: '9994977234', email: '25e207@psgitech.ac.in' }
    },
    {
        group: 'Group 12',
        m1: { name: 'K K KIRUBHA HARNI', dept: 'EEE', year: 'II YEAR', rollNo: '25E151', regNo: '715525105051', phone: '7530018683', email: '25e151@psgitech.ac.in' },
        m2: { name: 'G Vigneshwaran', dept: 'EEE', year: 'II YEAR', rollNo: '25E218', regNo: '715525105118', phone: '9976313553', email: '25e218@psgitech.ac.in' }
    },
    {
        group: 'Group 13',
        m1: { name: 'Lakkshon K S', dept: 'EEE', year: 'II YEAR', rollNo: '25E153', regNo: '715525105052', phone: '9944020111', email: '25e153@psgitech.ac.in' },
        m2: { name: 'Theniniyazh C', dept: 'EEE', year: 'II YEAR', rollNo: '25E211', regNo: '715525105111', phone: '6383983836', email: '25e211@psgitech.ac.in' }
    },
    {
        group: 'Group 14',
        m1: { name: 'Manish Aravind S', dept: 'EEE', year: 'II YEAR', rollNo: '25E156', regNo: '715525105055', phone: '9894585679', email: '25e156@psgitech.ac.in' },
        m2: { name: 'Sudhan Babu B', dept: 'EEE', year: 'II YEAR', rollNo: '25E206', regNo: '715525105106', phone: '7397319583', email: '25e206@psgitech.ac.in' }
    },
    {
        group: 'Group 15',
        m1: { name: 'Muhamed Mufaries A', dept: 'EEE', year: 'II YEAR', rollNo: '25E160', regNo: '715525105059', phone: '9566689667', email: '25e160@psgitech.ac.in' },
        m2: { name: 'Sri Varshan V R', dept: 'EEE', year: 'II YEAR', rollNo: '25E202', regNo: '715525105105', phone: '9345677590', email: '25e202@psgitech.ac.in' }
    },
    {
        group: 'Group 16',
        m1: { name: 'M.Mukesh', dept: 'EEE', year: 'II YEAR', rollNo: '25E161', regNo: '715525105060', phone: '6379502894', email: '25e161@psgitech.ac.in' },
        m2: { name: 'Sowjanya S', dept: 'EEE', year: 'II YEAR', rollNo: '25E200', regNo: '715525105100', phone: '6374462136', email: '25e200@psgitech.ac.in' }
    }
];

function generatePdfBuffer() {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 36,
            autoFirstPage: true,
            info: {
                Title: 'Team Asterix Powertrain Recruitment Duo Teams',
                Author: 'Team Asterix Autonomous Mobility',
                Subject: 'Powertrain Subsystem Recruitment Challenge Duo Team Allocations'
            }
        });

        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const pageWidth = doc.page.width; // 595.28
        const pageHeight = doc.page.height; // 841.89
        const margin = 36;
        const contentWidth = pageWidth - margin * 2;

        // Header Background Banner
        doc.rect(margin, margin, contentWidth, 68).fill('#0f172a');

        // Yellow Accent Strip
        doc.rect(margin, margin + 68, contentWidth, 4).fill('#f59e0b');

        // Title Text
        doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
            .text('TEAM ASTERIX  •  AUTONOMOUS MOBILITY', margin + 16, margin + 14);

        doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold')
            .text('POWERTRAIN SUBSYSTEM RECRUITMENT CHALLENGE 2026', margin + 16, margin + 34);

        doc.fillColor('#cbd5e1').fontSize(8.5).font('Helvetica')
            .text('Official Duo Team Allocations (16 Groups • 32 Candidates)', margin + 16, margin + 48);

        // Subsystem Lead Badge on Top Right
        doc.rect(pageWidth - margin - 150, margin + 14, 136, 40).fill('#1e293b');
        doc.rect(pageWidth - margin - 150, margin + 14, 136, 40).stroke('#334155');
        doc.fillColor('#f59e0b').fontSize(7.5).font('Helvetica-Bold')
            .text('LEAD: Joel Anto Edwin', pageWidth - margin - 142, margin + 20);
        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
            .text('Contact: +91 72079 60077', pageWidth - margin - 142, margin + 32);

        // Information Notice Card
        let curY = margin + 80;
        doc.rect(margin, curY, contentWidth, 34).fill('#fef3c7');
        doc.rect(margin, curY, contentWidth, 34).lineWidth(1).stroke('#f59e0b');

        doc.fillColor('#78350f').fontSize(8).font('Helvetica-Bold')
            .text('NOTICE TO CANDIDATES:', margin + 10, curY + 6);
        doc.fillColor('#92400e').fontSize(7.5).font('Helvetica')
            .text('Choose exactly ONE Problem Statement (PS 01 / PS 02 / PS 03). Lock in your statement choice on the official submission portal before starting prototyping or simulations. Deadlines: PS2/PS3 on Tuesday 15 Sept; PS1 on Wednesday 16 Sept.', margin + 10, curY + 16, { width: contentWidth - 20 });

        curY += 42;

        // Table Header
        const colGroupWidth = 65;
        const colMemberWidth = (contentWidth - colGroupWidth) / 2;

        doc.rect(margin, curY, contentWidth, 18).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('GROUP', margin + 6, curY + 5);
        doc.text('MEMBER 1 (NAME, ROLL, DEPT, CONTACT)', margin + colGroupWidth + 6, curY + 5);
        doc.text('MEMBER 2 (NAME, ROLL, DEPT, CONTACT)', margin + colGroupWidth + colMemberWidth + 6, curY + 5);

        curY += 18;

        // Render Table Rows (16 Groups)
        const rowHeight = 34;

        teamsData.forEach((team, idx) => {
            const isAlt = idx % 2 === 1;
            const bg = isAlt ? '#f8fafc' : '#ffffff';

            doc.rect(margin, curY, contentWidth, rowHeight).fill(bg);
            doc.rect(margin, curY, contentWidth, rowHeight).lineWidth(0.5).stroke('#cbd5e1');

            // Group Column
            doc.rect(margin + 4, curY + 8, 56, 18).fill('#e0f2fe');
            doc.rect(margin + 4, curY + 8, 56, 18).lineWidth(0.5).stroke('#0284c7');
            doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold')
                .text(team.group, margin + 4, curY + 13, { width: 56, align: 'center' });

            // Member 1 Column
            const m1X = margin + colGroupWidth + 6;
            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
                .text(team.m1.name, m1X, curY + 4);
            doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
                .text(`${team.m1.dept} • ${team.m1.year} • Roll: ${team.m1.rollNo}`, m1X, curY + 14);
            doc.fillColor('#0284c7').fontSize(7.5).font('Helvetica-Bold')
                .text(`Reg: ${team.m1.regNo}`, m1X, curY + 23);

            // Member 2 Column
            const m2X = margin + colGroupWidth + colMemberWidth + 6;
            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
                .text(team.m2.name, m2X, curY + 4);
            doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
                .text(`${team.m2.dept} • ${team.m2.year} • Roll: ${team.m2.rollNo}`, m2X, curY + 14);
            doc.fillColor('#0284c7').fontSize(7.5).font('Helvetica-Bold')
                .text(`Reg: ${team.m2.regNo}`, m2X, curY + 23);

            curY += rowHeight;
        });

        // Bottom Footer Bar
        const footerY = pageHeight - margin - 24;
        doc.rect(margin, footerY, contentWidth, 24).fill('#0f172a');
        doc.fillColor('#cbd5e1').fontSize(7.5).font('Helvetica')
            .text('Official Team Asterix Recruitment Portal: https://asterix-website.vercel.app/#recruitment', margin + 12, footerY + 8);
        doc.fillColor('#f59e0b').fontSize(7.5).font('Helvetica-Bold')
            .text('Submission & Choice Portal: #submit?track=powertrain', pageWidth - margin - 220, footerY + 8, { width: 208, align: 'right' });

        doc.end();
    });
}

async function main() {
    try {
        console.log('Generating Powertrain Teams PDF...');
        const pdfBuffer = await generatePdfBuffer();
        console.log(`PDF buffer created (${pdfBuffer.length} bytes).`);

        // Save locally to public/recruitment/powertrain_teams.pdf
        const localPath = path.resolve(__dirname, '../../../public/recruitment/powertrain_teams.pdf');
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, pdfBuffer);
        console.log(`Saved locally to ${localPath}`);

        // Upload to ImageKit
        console.log('Uploading to ImageKit (/asterix/recruitment/powertrain_teams.pdf)...');
        const uploadRes = await uploadToImageKit({
            fileBuffer: pdfBuffer,
            fileName: 'powertrain_teams.pdf',
            folder: '/asterix/recruitment',
            tags: ['recruitment', 'powertrain', 'teams'],
            useUniqueFileName: false
        });

        console.log('ImageKit Upload Success!');
        console.log('ImageKit URL:', uploadRes.url);
        console.log('File ID:', uploadRes.fileId);
    } catch (err) {
        console.error('Error in PDF generation/upload:', err);
        process.exit(1);
    }
}

main();
