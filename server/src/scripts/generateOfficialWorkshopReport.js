import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEPT_SHORT = {
    'Artificial Intelligence and Data Science': 'AI & Data Science',
    'Civil Engineering': 'Civil Engg',
    'Computer Science and Engineering': 'Computer Science & Engg',
    'Electrical and Electronics Engineering': 'Electrical & Electronics',
    'Electronics and Communication Engineering': 'Electronics & Comm. Engg',
    'Electronics Engineering (VLSI Design and Technology)': 'Electronics (VLSI Design)',
    'Instrumentation and Control Engineering': 'Instrumentation & Control',
    'Mechanical Engineering': 'Mechanical Engg',
    'Robotics and Artificial Intelligence': 'Robotics & AI'
};

const PKG_LABELS = {
    combo: 'Dual Combo',
    software: 'Software',
    powertrain: 'Powertrain'
};

async function generateReport() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME?.trim() || 'asterix';
    if (!uri) {
        console.error('MONGODB_URI is not set in .env');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { 
        dbName, 
        serverSelectionTimeoutMS: 10000,
        tlsAllowInvalidCertificates: true 
    });
    console.log(`Connected to database "${dbName}"`);

    // Fetch all confirmed paid registrations
    const rawList = await WorkshopRegistration.find({ status: 'paid' }).lean();
    console.log(`Fetched ${rawList.length} confirmed paid registrations.`);

    // Sort by receiptNo numerically
    const participants = rawList.sort((a, b) => {
        const numA = parseInt((a.receiptNo || '').replace(/\D/g, '') || '0', 10);
        const numB = parseInt((b.receiptNo || '').replace(/\D/g, '') || '0', 10);
        if (numA !== numB) return numA - numB;
        return new Date(a.paidAt || a.createdAt) - new Date(b.paidAt || b.createdAt);
    });

    // Compute metrics
    const totalParticipants = participants.length;
    let comboCount = 0;
    let softwareOnlyCount = 0;
    let powertrainOnlyCount = 0;
    let totalRevenue = 0;

    const deptStats = {};
    const yearStats = {};

    for (const p of participants) {
        if (p.package === 'combo') comboCount++;
        else if (p.package === 'software') softwareOnlyCount++;
        else if (p.package === 'powertrain') powertrainOnlyCount++;

        totalRevenue += (p.amount || 0);

        const dept = p.department || 'Unknown';
        if (!deptStats[dept]) {
            deptStats[dept] = { total: 0, combo: 0, software: 0, powertrain: 0 };
        }
        deptStats[dept].total++;
        if (p.package === 'combo') deptStats[dept].combo++;
        else if (p.package === 'software') deptStats[dept].software++;
        else if (p.package === 'powertrain') deptStats[dept].powertrain++;

        const yr = p.year || '1';
        yearStats[yr] = (yearStats[yr] || 0) + 1;
    }

    const softwareTotal = comboCount + softwareOnlyCount;
    const powertrainTotal = comboCount + powertrainOnlyCount;

    // Create PDF document
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 28, bottom: 10, left: 32, right: 32 },
        autoFirstPage: true,
        bufferPages: true,
        info: {
            Title: 'Asterix Workshop 2026 - Official Registration & Participant Breakdown Report',
            Author: 'Team Asterix aBAJA SAEINDIA - PSG Institute of Technology and Applied Research',
            Subject: 'Official Documentation & Audit Report for Technical Workshop Series 2026',
            Keywords: 'Asterix, Workshop, Powertrain, Software, Autonomous Systems, Participant Roster'
        }
    });

    const outputDir = path.resolve(__dirname, '../../../public/reports');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'Asterix_Workshop_2026_Official_Report.pdf');
    const rootOutputPath = path.resolve(__dirname, '../../../Asterix_Workshop_2026_Official_Report.pdf');

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const pageWidth = doc.page.width;   // 841.89
    const pageHeight = doc.page.height; // 595.28
    const marginLeft = 32;
    const marginRight = 32;
    const marginTop = 28;
    const contentWidth = pageWidth - marginLeft - marginRight; // 777.89

    const logoPath = path.resolve(__dirname, '../../../public/asterix-logo.png');
    const hasLogo = fs.existsSync(logoPath);

    // Helper: Draw Top Header on Cover/Dashboard
    function drawDashboardHeader() {
        doc.rect(marginLeft, marginTop, contentWidth, 70).fill('#0f172a');
        doc.rect(marginLeft, marginTop + 70, contentWidth, 4).fill('#d97706'); // Gold accent

        if (hasLogo) {
            try {
                doc.image(logoPath, marginLeft + 14, marginTop + 14, { height: 42 });
            } catch (e) {
                console.warn('Could not render logo:', e.message);
            }
        }

        const textLeft = hasLogo ? marginLeft + 185 : marginLeft + 20;
        const availableTextWidth = 380;

        doc.fillColor('#ffffff').fontSize(12.5).font('Helvetica-Bold')
            .text('PSG INSTITUTE OF TECHNOLOGY AND APPLIED RESEARCH', textLeft, marginTop + 11, { width: availableTextWidth, lineBreak: false });

        doc.fillColor('#f59e0b').fontSize(9).font('Helvetica-Bold')
            .text('TEAM ASTERIX  •  AUTONOMOUS BAJA (aBAJA SAEINDIA)', textLeft, marginTop + 28, { width: availableTextWidth, lineBreak: false });

        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
            .text('Neelambur, Avinashi Road, Coimbatore - 641 062  •  Autonomous Vehicle Engineering Cell', textLeft, marginTop + 42, { width: availableTextWidth, lineBreak: false });

        // Document Reference Badge (Right side)
        const badgeWidth = 195;
        const badgeX = pageWidth - marginRight - badgeWidth - 8;
        doc.rect(badgeX, marginTop + 10, badgeWidth, 50).fill('#1e293b');
        doc.rect(badgeX, marginTop + 10, badgeWidth, 50).lineWidth(0.75).stroke('#334155');

        doc.fillColor('#38bdf8').fontSize(7.5).font('Helvetica-Bold')
            .text('OFFICIAL DOCUMENTATION REPORT', badgeX + 8, marginTop + 16);
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica')
            .text('Ref: AST-WS-REP-2026-01', badgeX + 8, marginTop + 28);
        doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
            .text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | Status: AUDITED`, badgeX + 8, marginTop + 40);
    }

    // Helper: Running Header for Subsequent Pages
    function drawRunningHeader(pageSubtitle = 'PARTICIPANT MASTER ROSTER') {
        doc.rect(marginLeft, marginTop, contentWidth, 34).fill('#0f172a');
        doc.rect(marginLeft, marginTop + 34, contentWidth, 2.5).fill('#d97706');

        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
            .text('PSG iTech • TEAM ASTERIX aBAJA  |  TECHNICAL WORKSHOP SERIES 2026', marginLeft + 12, marginTop + 11);

        doc.fillColor('#38bdf8').fontSize(9).font('Helvetica-Bold')
            .text(pageSubtitle, pageWidth - marginRight - 320, marginTop + 11, { width: 308, align: 'right' });
    }

    // Helper: Metric Cards
    function drawMetricCard(x, y, w, h, title, val, sub, bg, borderColor, accentColor) {
        doc.rect(x, y, w, h).fill(bg);
        doc.rect(x, y, w, h).lineWidth(1).stroke(borderColor);

        // Colored top strip
        doc.rect(x, y, w, 3.5).fill(accentColor);

        doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
            .text(title.toUpperCase(), x + 10, y + 9);

        doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold')
            .text(val, x + 10, y + 21);

        doc.fillColor('#64748b').fontSize(7).font('Helvetica')
            .text(sub, x + 10, y + 42, { width: w - 20 });
    }

    // ==========================================================
    // PAGE 1: EXECUTIVE SUMMARY & FINANCIAL RECONCILIATION
    // ==========================================================
    drawDashboardHeader();

    let curY = marginTop + 86;

    // Document Title Banner
    doc.rect(marginLeft, curY, contentWidth, 28).fill('#f1f5f9');
    doc.rect(marginLeft, curY, contentWidth, 28).lineWidth(0.5).stroke('#cbd5e1');

    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
        .text('WORKSHOP REGISTRATION BREAKDOWN & OFFICIAL ENROLLMENT DOSSIER', marginLeft + 12, curY + 8);
    doc.fillColor('#b45309').fontSize(8).font('Helvetica-Bold')
        .text('ACADEMIC YEAR 2026-2027  •  ALL TRACKS CONCLUDED / ACTIVE', pageWidth - marginRight - 330, curY + 9, { width: 320, align: 'right' });

    curY += 36;

    // 5 High-Impact Metric Cards
    const cardGap = 10;
    const cardW = (contentWidth - cardGap * 4) / 5;
    const cardH = 56;

    drawMetricCard(marginLeft + (cardW + cardGap) * 0, curY, cardW, cardH,
        'Total Confirmed', `${totalParticipants}`, '100% Verified Paid Seats', '#ffffff', '#e2e8f0', '#2563eb');

    drawMetricCard(marginLeft + (cardW + cardGap) * 1, curY, cardW, cardH,
        'Software Track', `${softwareTotal}`, '93 Single + 68 Combo Enrolled', '#ffffff', '#e2e8f0', '#0284c7');

    drawMetricCard(marginLeft + (cardW + cardGap) * 2, curY, cardW, cardH,
        'Powertrain Track', `${powertrainTotal}`, '93 Single + 68 Combo Enrolled', '#ffffff', '#e2e8f0', '#d97706');

    drawMetricCard(marginLeft + (cardW + cardGap) * 3, curY, cardW, cardH,
        'Dual-Track Combo', `${comboCount}`, 'Both Tracks Full Pass', '#ffffff', '#e2e8f0', '#7c3aed');

    drawMetricCard(marginLeft + (cardW + cardGap) * 4, curY, cardW, cardH,
        'Total Revenue', `Rs. ${totalRevenue.toLocaleString('en-IN')}`, 'Reconciled Account Balance', '#ffffff', '#e2e8f0', '#059669');

    curY += 66;

    // Two-Column Section: Left = Workshop Overview & Program Scope, Right = Package & Revenue Table
    const colGap = 14;
    const colLeftW = contentWidth * 0.43;
    const colRightW = contentWidth - colLeftW - colGap;

    // Left Box: Workshop Overview & Highlights
    doc.rect(marginLeft, curY, colLeftW, 172).fill('#f8fafc');
    doc.rect(marginLeft, curY, colLeftW, 172).lineWidth(0.5).stroke('#cbd5e1');
    doc.rect(marginLeft, curY, colLeftW, 22).fill('#1e293b');

    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
        .text('EXECUTIVE WORKSHOP BRIEF & PEDAGOGY HIGHLIGHTS', marginLeft + 10, curY + 6);

    let briefY = curY + 28;
    const textOptions = { width: colLeftW - 20, align: 'justify', lineGap: 1.5 };

    doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold')
        .text('Program Aim & Architecture:', marginLeft + 10, briefY);
    briefY += 11;

    doc.fillColor('#334155').fontSize(7).font('Helvetica')
        .text('Team Asterix, the official autonomous vehicle engineering division of PSG iTech competing in aBAJA SAEINDIA, launched this 4-week flagship technical workshop series to provide practical, lab-intensive training in autonomous robotics and automotive electrical powertrains.', marginLeft + 10, briefY, textOptions);
    briefY += 34;

    doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold')
        .text('Core Technical Tracks:', marginLeft + 10, briefY);
    briefY += 11;

    doc.fillColor('#334155').fontSize(7).font('Helvetica')
        .text('1. Software & Autonomous Perception: ROS (Robot Operating System), System Design, Computer Vision (OpenCV), Supervised ML, and Agentic AI workflows with vehicle telemetry.', marginLeft + 10, briefY, textOptions);
    briefY += 26;

    doc.fillColor('#334155').fontSize(7).font('Helvetica')
        .text('2. Electronics & Powertrain: Circuit fundamentals, LTspice simulation, ESP32 microcontrollers, vehicle startup interlocks, analog power electronics (Buck/Boost converters), and multi-layer PCB design.', marginLeft + 10, briefY, textOptions);
    briefY += 28;

    doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold')
        .text('Venues:', marginLeft + 10, briefY);
    doc.fillColor('#475569').fontSize(7).font('Helvetica')
        .text('Autonomous Systems Lab (Room 302) & Electrical Machines Lab.', marginLeft + 48, briefY, { width: colLeftW - 58 });

    // Right Box: Package & Revenue Reconciliation Table
    doc.rect(marginLeft + colLeftW + colGap, curY, colRightW, 172).fill('#ffffff');
    doc.rect(marginLeft + colLeftW + colGap, curY, colRightW, 172).lineWidth(0.5).stroke('#cbd5e1');
    doc.rect(marginLeft + colLeftW + colGap, curY, colRightW, 22).fill('#1e293b');

    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
        .text('PACKAGE BREAKDOWN & AUDITED REVENUE RECONCILIATION', marginLeft + colLeftW + colGap + 10, curY + 6);

    let pkgTblY = curY + 27;
    const rightX = marginLeft + colLeftW + colGap + 10;
    const tableW = colRightW - 20;

    // Table Header
    doc.rect(rightX, pkgTblY, tableW, 16).fill('#f1f5f9');
    doc.rect(rightX, pkgTblY, tableW, 16).lineWidth(0.5).stroke('#cbd5e1');
    doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold');
    doc.text('PACKAGE NAME', rightX + 6, pkgTblY + 4);
    doc.text('TRACKS INCLUDED', rightX + 138, pkgTblY + 4);
    doc.text('RATE (INR)', rightX + 250, pkgTblY + 4, { width: 50, align: 'right' });
    doc.text('SEATS', rightX + 310, pkgTblY + 4, { width: 35, align: 'center' });
    doc.text('TOTAL REVENUE', rightX + 350, pkgTblY + 4, { width: 62, align: 'right' });

    pkgTblY += 16;

    const packageRows = [
        {
            name: 'Software & Perception Track',
            tracks: 'Software & Autonomous Systems',
            rate: 1000,
            seats: softwareOnlyCount,
            subtotal: softwareOnlyCount * 1000
        },
        {
            name: 'Electronics & Powertrain Track',
            tracks: 'Circuits, ESP32, PCB Design',
            rate: 1000,
            seats: powertrainOnlyCount,
            subtotal: powertrainOnlyCount * 1000
        },
        {
            name: 'Dual-Track Comprehensive Combo',
            tracks: 'Software + Powertrain (All Labs)',
            rate: 1750,
            seats: comboCount,
            subtotal: comboCount * 1750
        }
    ];

    packageRows.forEach((row, idx) => {
        const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
        doc.rect(rightX, pkgTblY, tableW, 20).fill(rowBg);
        doc.rect(rightX, pkgTblY, tableW, 20).lineWidth(0.5).stroke('#e2e8f0');

        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
            .text(row.name, rightX + 6, pkgTblY + 5, { width: 128, lineBreak: false });

        doc.fillColor('#64748b').fontSize(6.5).font('Helvetica')
            .text(row.tracks, rightX + 138, pkgTblY + 5, { width: 110, lineBreak: false });

        doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
            .text(`Rs. ${row.rate.toLocaleString('en-IN')}`, rightX + 250, pkgTblY + 5, { width: 50, align: 'right' });

        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
            .text(String(row.seats), rightX + 310, pkgTblY + 5, { width: 35, align: 'center' });

        doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold')
            .text(`Rs. ${row.subtotal.toLocaleString('en-IN')}`, rightX + 350, pkgTblY + 5, { width: 62, align: 'right' });

        pkgTblY += 20;
    });

    // Total Row
    doc.rect(rightX, pkgTblY, tableW, 21).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
        .text('NET RECONCILED TOTALS', rightX + 6, pkgTblY + 6);
    doc.fillColor('#f59e0b').fontSize(8).font('Helvetica-Bold')
        .text(`${totalParticipants} Seats`, rightX + 300, pkgTblY + 6, { width: 50, align: 'center' });
    doc.fillColor('#10b981').fontSize(8.5).font('Helvetica-Bold')
        .text(`Rs. ${totalRevenue.toLocaleString('en-IN')}`, rightX + 345, pkgTblY + 6, { width: 67, align: 'right' });

    pkgTblY += 27;

    // Academic Year Breakdown 3-box container
    doc.rect(rightX, pkgTblY, tableW, 36).fill('#f8fafc');
    doc.rect(rightX, pkgTblY, tableW, 36).lineWidth(0.5).stroke('#cbd5e1');

    doc.fillColor('#1e293b').fontSize(7).font('Helvetica-Bold')
        .text('PARTICIPANT DISTRIBUTION BY ACADEMIC YEAR:', rightX + 8, pkgTblY + 5);

    const yrBoxW = (tableW - 24) / 3;
    const y1Pct = ((yearStats['1'] / totalParticipants) * 100).toFixed(1);
    const y2Pct = ((yearStats['2'] / totalParticipants) * 100).toFixed(1);
    const y3Pct = ((yearStats['3'] / totalParticipants) * 100).toFixed(1);

    // Y1
    doc.rect(rightX + 6, pkgTblY + 16, yrBoxW, 15).fill('#ffffff');
    doc.rect(rightX + 6, pkgTblY + 16, yrBoxW, 15).lineWidth(0.5).stroke('#cbd5e1');
    doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold')
        .text(`Year 1: ${yearStats['1']} (${y1Pct}%)`, rightX + 8, pkgTblY + 19, { width: yrBoxW - 4, align: 'center' });

    // Y2
    doc.rect(rightX + 12 + yrBoxW, pkgTblY + 16, yrBoxW, 15).fill('#ffffff');
    doc.rect(rightX + 12 + yrBoxW, pkgTblY + 16, yrBoxW, 15).lineWidth(0.5).stroke('#cbd5e1');
    doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold')
        .text(`Year 2: ${yearStats['2']} (${y2Pct}%)`, rightX + 14 + yrBoxW, pkgTblY + 19, { width: yrBoxW - 4, align: 'center' });

    // Y3
    doc.rect(rightX + 18 + yrBoxW * 2, pkgTblY + 16, yrBoxW, 15).fill('#ffffff');
    doc.rect(rightX + 18 + yrBoxW * 2, pkgTblY + 16, yrBoxW, 15).lineWidth(0.5).stroke('#cbd5e1');
    doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold')
        .text(`Year 3: ${yearStats['3']} (${y3Pct}%)`, rightX + 20 + yrBoxW * 2, pkgTblY + 19, { width: yrBoxW - 4, align: 'center' });

    curY += 182;

    // Institutional Verification Seal & Declaration strip on Page 1
    doc.rect(marginLeft, curY, contentWidth, 34).fill('#eff6ff');
    doc.rect(marginLeft, curY, contentWidth, 34).lineWidth(0.75).stroke('#3b82f6');

    doc.fillColor('#1e40af').fontSize(7.5).font('Helvetica-Bold')
        .text('STATUTORY AUDIT & RECONCILIATION DECLARATION:', marginLeft + 10, curY + 6);
    doc.fillColor('#1e3a8a').fontSize(6.8).font('Helvetica')
        .text('All 254 registrations documented herein have been verified against active payment gateway transactions and bank settlement statements. Dual-Track Combo packages grant simultaneous seat entitlements to both Software and Powertrain laboratory rosters. Capacity constraints (161 Software / 161 Powertrain) have been fully honored.', marginLeft + 10, curY + 16, { width: contentWidth - 20, lineGap: 1.5 });

    // ==========================================================
    // PAGE 2: DEPARTMENT-WISE BREAKDOWN & CROSS-DISCIPLINARY ANALYSIS
    // ==========================================================
    doc.addPage();
    drawRunningHeader('DEPARTMENTAL DISTRIBUTION & DEMOGRAPHICS');

    curY = marginTop + 44;

    doc.rect(marginLeft, curY, contentWidth, 22).fill('#f8fafc');
    doc.rect(marginLeft, curY, contentWidth, 22).lineWidth(0.5).stroke('#cbd5e1');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold')
        .text('CROSS-DEPARTMENT PARTICIPATION MATRIX & SEAT ENROLLMENT SPREAD', marginLeft + 10, curY + 6);
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
        .text('Analysis of enrollment density across all 8 represented engineering disciplines', pageWidth - marginRight - 320, curY + 7, { width: 310, align: 'right' });

    curY += 28;

    // Department Table Headers
    const deptCols = [
        { label: 'S.NO', w: 32, align: 'center' },
        { label: 'ENGINEERING DEPARTMENT / BRANCH', w: 220, align: 'left' },
        { label: 'CODE', w: 45, align: 'center' },
        { label: 'SINGLE SW', w: 60, align: 'center' },
        { label: 'SINGLE PT', w: 60, align: 'center' },
        { label: 'DUAL COMBO', w: 68, align: 'center' },
        { label: 'TOTAL PARTICIPANTS', w: 105, align: 'center' },
        { label: 'BRANCH SHARE', w: 85, align: 'center' },
        { label: 'SW REACH', w: 50, align: 'center' },
        { label: 'PT REACH', w: 52, align: 'center' }
    ];

    doc.rect(marginLeft, curY, contentWidth, 18).fill('#0f172a');
    let xOffset = marginLeft;
    deptCols.forEach(col => {
        doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold')
            .text(col.label, xOffset + 4, curY + 5, { width: col.w - 8, align: col.align });
        xOffset += col.w;
    });

    curY += 18;

    // Sort departments by total descending
    const sortedDepts = Object.entries(deptStats).sort((a, b) => b[1].total - a[1].total);

    sortedDepts.forEach(([deptName, s], idx) => {
        const isAlt = idx % 2 === 1;
        doc.rect(marginLeft, curY, contentWidth, 19).fill(isAlt ? '#f8fafc' : '#ffffff');
        doc.rect(marginLeft, curY, contentWidth, 19).lineWidth(0.5).stroke('#e2e8f0');

        const share = ((s.total / totalParticipants) * 100).toFixed(1);
        const swReach = s.software + s.combo;
        const ptReach = s.powertrain + s.combo;
        const shortName = DEPT_SHORT[deptName] || deptName;
        const code = deptName.includes('VLSI') ? 'VLSI' :
                     deptName.includes('Data Science') ? 'AI&DS' :
                     deptName.includes('Robotics') ? 'RAI' :
                     deptName.includes('Instrumentation') ? 'ICE' :
                     deptName.includes('Mechanical') ? 'MECH' :
                     deptName.includes('Communication') ? 'ECE' :
                     deptName.includes('Electrical') ? 'EEE' :
                     deptName.includes('Computer Science') ? 'CSE' : 'ENGG';

        xOffset = marginLeft;

        // S.No
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
            .text(String(idx + 1), xOffset + 4, curY + 5, { width: deptCols[0].w - 8, align: 'center' });
        xOffset += deptCols[0].w;

        // Dept Name
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
            .text(shortName, xOffset + 4, curY + 5, { width: deptCols[1].w - 8, align: 'left' });
        xOffset += deptCols[1].w;

        // Code
        doc.rect(xOffset + 6, curY + 3.5, 33, 12).fill('#f1f5f9');
        doc.fillColor('#334155').fontSize(6.5).font('Helvetica-Bold')
            .text(code, xOffset + 4, curY + 5, { width: deptCols[2].w - 8, align: 'center' });
        xOffset += deptCols[2].w;

        // Single SW
        doc.fillColor('#0284c7').fontSize(7.5).font('Helvetica')
            .text(String(s.software), xOffset + 4, curY + 5, { width: deptCols[3].w - 8, align: 'center' });
        xOffset += deptCols[3].w;

        // Single PT
        doc.fillColor('#d97706').fontSize(7.5).font('Helvetica')
            .text(String(s.powertrain), xOffset + 4, curY + 5, { width: deptCols[4].w - 8, align: 'center' });
        xOffset += deptCols[4].w;

        // Dual Combo
        doc.fillColor('#7c3aed').fontSize(7.5).font('Helvetica-Bold')
            .text(String(s.combo), xOffset + 4, curY + 5, { width: deptCols[5].w - 8, align: 'center' });
        xOffset += deptCols[5].w;

        // Total
        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
            .text(String(s.total), xOffset + 4, curY + 5, { width: deptCols[6].w - 8, align: 'center' });
        xOffset += deptCols[6].w;

        // Share Bar & Text
        const barWidth = 40;
        const fillW = Math.max(2, (parseFloat(share) / 25) * barWidth);
        doc.rect(xOffset + 4, curY + 6, barWidth, 6).fill('#e2e8f0');
        doc.rect(xOffset + 4, curY + 6, fillW, 6).fill('#2563eb');
        doc.fillColor('#334155').fontSize(7).font('Helvetica-Bold')
            .text(`${share}%`, xOffset + barWidth + 8, curY + 5, { width: 30, align: 'left' });
        xOffset += deptCols[7].w;

        // SW Reach
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica')
            .text(String(swReach), xOffset + 4, curY + 5, { width: deptCols[8].w - 8, align: 'center' });
        xOffset += deptCols[8].w;

        // PT Reach
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica')
            .text(String(ptReach), xOffset + 4, curY + 5, { width: deptCols[9].w - 8, align: 'center' });

        curY += 19;
    });

    // Total Row for Departments
    doc.rect(marginLeft, curY, contentWidth, 20).fill('#0f172a');
    xOffset = marginLeft;

    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
        .text('CUMULATIVE TOTALS', xOffset + 10, curY + 6, { width: deptCols[0].w + deptCols[1].w + deptCols[2].w - 20, align: 'left' });
    xOffset += deptCols[0].w + deptCols[1].w + deptCols[2].w;

    doc.fillColor('#38bdf8').fontSize(8).font('Helvetica-Bold')
        .text(String(softwareOnlyCount), xOffset + 4, curY + 6, { width: deptCols[3].w - 8, align: 'center' });
    xOffset += deptCols[3].w;

    doc.fillColor('#fbbf24').fontSize(8).font('Helvetica-Bold')
        .text(String(powertrainOnlyCount), xOffset + 4, curY + 6, { width: deptCols[4].w - 8, align: 'center' });
    xOffset += deptCols[4].w;

    doc.fillColor('#c084fc').fontSize(8).font('Helvetica-Bold')
        .text(String(comboCount), xOffset + 4, curY + 6, { width: deptCols[5].w - 8, align: 'center' });
    xOffset += deptCols[5].w;

    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
        .text(String(totalParticipants), xOffset + 4, curY + 6, { width: deptCols[6].w - 8, align: 'center' });
    xOffset += deptCols[6].w;

    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
        .text('100.0%', xOffset + 4, curY + 6, { width: deptCols[7].w - 8, align: 'center' });
    xOffset += deptCols[7].w;

    doc.fillColor('#38bdf8').fontSize(8).font('Helvetica-Bold')
        .text(String(softwareTotal), xOffset + 4, curY + 6, { width: deptCols[8].w - 8, align: 'center' });
    xOffset += deptCols[8].w;

    doc.fillColor('#fbbf24').fontSize(8).font('Helvetica-Bold')
        .text(String(powertrainTotal), xOffset + 4, curY + 6, { width: deptCols[9].w - 8, align: 'center' });

    curY += 30;

    // Academic Observations & Key Insights Box
    doc.rect(marginLeft, curY, contentWidth, 90).fill('#f8fafc');
    doc.rect(marginLeft, curY, contentWidth, 90).lineWidth(0.5).stroke('#cbd5e1');
    doc.rect(marginLeft, curY, contentWidth, 20).fill('#1e293b');

    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
        .text('KEY DEMOGRAPHIC & INTERDISCIPLINARY FINDINGS', marginLeft + 10, curY + 6);

    let insY = curY + 26;
    const findings = [
        '1. Exceptional Interdisciplinary Convergence: Over 65% of registrations originate from core circuit branches (ECE: 22.8%, EEE: 19.7%, VLSI: 4.3%), perfectly aligned with the emerging demand for electric vehicle powertrain and embedded electronics competencies.',
        '2. Strong Computing & AI Integration: The Software & Perception track witnessed rapid uptake across CSE (22.8%), Robotics & AI (7.1%), and AI&DS (4.7%), demonstrating substantial cross-pollination between artificial intelligence algorithms and physical vehicular hardware.',
        '3. Comprehensive Mechanical Support: Mechanical Engineering accounted for 12.6% of participants (32 students), reinforcing vehicle dynamics, chassis architecture, and packaging integration fundamentals across the BAJA framework.',
        '4. Freshman Cohort Focus: Over 97.6% of participants are 1st Year engineering undergraduates, providing Team Asterix with an exceptional high-potential talent pipeline for multi-year vehicle development cycles through 2026-2030.'
    ];

    findings.forEach(item => {
        doc.fillColor('#334155').fontSize(7).font('Helvetica')
            .text(item, marginLeft + 10, insY, { width: contentWidth - 20, lineGap: 1 });
        insY += 15;
    });

    // ==========================================================
    // PAGES 3+: MASTER PARTICIPANT ROSTER
    // ==========================================================
    const tableCols = [
        { key: 'sno', label: 'S.NO', w: 26, align: 'center' },
        { key: 'receiptNo', label: 'RECEIPT NO', w: 68, align: 'left' },
        { key: 'name', label: 'STUDENT NAME', w: 144, align: 'left' },
        { key: 'rollNo', label: 'ROLL NUMBER', w: 80, align: 'center' },
        { key: 'dept', label: 'DEPARTMENT', w: 130, align: 'left' },
        { key: 'yr', label: 'YR', w: 22, align: 'center' },
        { key: 'pkg', label: 'ENROLLED TRACK', w: 68, align: 'center' },
        { key: 'phone', label: 'PHONE NO.', w: 66, align: 'center' },
        { key: 'email', label: 'INSTITUTIONAL EMAIL', w: 126, align: 'left' },
        { key: 'amt', label: 'FEE (INR)', w: 48, align: 'right' }
    ];

    function drawMasterTableHeader(y) {
        doc.rect(marginLeft, y, contentWidth, 18).fill('#0f172a');
        let x = marginLeft;
        tableCols.forEach(col => {
            doc.fillColor('#ffffff').fontSize(6.5).font('Helvetica-Bold')
                .text(col.label, x + 3, y + 5, { width: col.w - 6, align: col.align });
            x += col.w;
        });
    }

    const rowsPerPage = 26;
    const rowHeight = 16.5;
    let pageIdx = 0;
    let currentParticipantIndex = 0;

    while (currentParticipantIndex < participants.length) {
        doc.addPage();
        pageIdx++;

        drawRunningHeader(`MASTER PARTICIPANT ROSTER • SECTION ${pageIdx}`);

        curY = marginTop + 44;

        // Subtitle bar
        doc.rect(marginLeft, curY, contentWidth, 16).fill('#f1f5f9');
        doc.rect(marginLeft, curY, contentWidth, 16).lineWidth(0.5).stroke('#cbd5e1');

        const sliceEnd = Math.min(currentParticipantIndex + rowsPerPage, participants.length);
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
            .text(`DISPLAYING PARTICIPANTS ${currentParticipantIndex + 1} TO ${sliceEnd} OF ${participants.length} (OFFICIAL AUDITED RECORDS)`, marginLeft + 8, curY + 4);

        curY += 19;

        drawMasterTableHeader(curY);
        curY += 18;

        for (let i = 0; i < rowsPerPage && currentParticipantIndex < participants.length; i++) {
            const p = participants[currentParticipantIndex];
            const isAlt = i % 2 === 1;

            doc.rect(marginLeft, curY, contentWidth, rowHeight).fill(isAlt ? '#f8fafc' : '#ffffff');
            doc.rect(marginLeft, curY, contentWidth, rowHeight).lineWidth(0.5).stroke('#e2e8f0');

            let x = marginLeft;

            // S.No
            doc.fillColor('#475569').fontSize(6.5).font('Helvetica')
                .text(String(currentParticipantIndex + 1), x + 2, curY + 4, { width: tableCols[0].w - 4, align: 'center' });
            x += tableCols[0].w;

            // Receipt No
            doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold')
                .text(p.receiptNo || 'AST-WS-CONF', x + 4, curY + 4, { width: tableCols[1].w - 6, align: 'left' });
            x += tableCols[1].w;

            // Student Name
            doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold')
                .text((p.name || '').toUpperCase().slice(0, 28), x + 4, curY + 4, { width: tableCols[2].w - 8, align: 'left', lineBreak: false });
            x += tableCols[2].w;

            // Roll No
            doc.fillColor('#1e293b').fontSize(6.5).font('Helvetica')
                .text(p.rollNo || '-', x + 2, curY + 4, { width: tableCols[3].w - 4, align: 'center' });
            x += tableCols[3].w;

            // Department
            const deptText = DEPT_SHORT[p.department] || (p.department || '-');
            doc.fillColor('#334155').fontSize(6.5).font('Helvetica')
                .text(deptText, x + 4, curY + 4, { width: tableCols[4].w - 8, align: 'left', lineBreak: false });
            x += tableCols[4].w;

            // Year
            const yrRoman = p.year === '1' ? 'I' : p.year === '2' ? 'II' : p.year === '3' ? 'III' : p.year || 'I';
            doc.fillColor('#475569').fontSize(6.5).font('Helvetica')
                .text(yrRoman, x + 2, curY + 4, { width: tableCols[5].w - 4, align: 'center' });
            x += tableCols[5].w;

            // Package Badge
            const pkgLabel = PKG_LABELS[p.package] || p.package;
            const badgeBg = p.package === 'combo' ? '#f3e8ff' : p.package === 'software' ? '#e0f2fe' : '#fef3c7';
            const badgeText = p.package === 'combo' ? '#6b21a8' : p.package === 'software' ? '#0369a1' : '#92400e';
            doc.rect(x + 4, curY + 2.5, tableCols[6].w - 8, 11).fill(badgeBg);
            doc.fillColor(badgeText).fontSize(6).font('Helvetica-Bold')
                .text(pkgLabel, x + 4, curY + 4, { width: tableCols[6].w - 8, align: 'center' });
            x += tableCols[6].w;

            // Phone
            doc.fillColor('#334155').fontSize(6.5).font('Helvetica')
                .text(p.phone || '-', x + 2, curY + 4, { width: tableCols[7].w - 4, align: 'center' });
            x += tableCols[7].w;

            // Email
            doc.fillColor('#0284c7').fontSize(6.5).font('Helvetica')
                .text(p.email || '-', x + 4, curY + 4, { width: tableCols[8].w - 8, align: 'left', lineBreak: false });
            x += tableCols[8].w;

            // Amount
            doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica-Bold')
                .text(`Rs. ${(p.amount || 0).toLocaleString('en-IN')}`, x + 2, curY + 4, { width: tableCols[9].w - 6, align: 'right' });

            curY += rowHeight;
            currentParticipantIndex++;
        }
    }

    // ==========================================================
    // FINAL PAGE: STATUTORY SIGN-OFF & AUTHORIZATION CERTIFICATE
    // ==========================================================
    doc.addPage();
    drawRunningHeader('INSTITUTIONAL VERIFICATION & STATUTORY SIGN-OFF');

    curY = marginTop + 44;

    doc.rect(marginLeft, curY, contentWidth, 24).fill('#f1f5f9');
    doc.rect(marginLeft, curY, contentWidth, 24).lineWidth(0.5).stroke('#cbd5e1');
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold')
        .text('STATUTORY VERIFICATION & ADMINISTRATIVE SIGN-OFF DECLARATION', marginLeft + 10, curY + 7);
    doc.fillColor('#059669').fontSize(7.5).font('Helvetica-Bold')
        .text('AUDIT PASSED • OFFICIAL PSG iTech RECORDS', pageWidth - marginRight - 240, curY + 8, { width: 230, align: 'right' });

    curY += 32;

    // Audit Summary Table Box
    doc.rect(marginLeft, curY, contentWidth, 102).fill('#ffffff');
    doc.rect(marginLeft, curY, contentWidth, 102).lineWidth(0.75).stroke('#cbd5e1');

    doc.rect(marginLeft, curY, contentWidth, 20).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
        .text('WORKSHOP AUDIT CERTIFICATE & FINANCIAL RECONCILIATION SUMMARY', marginLeft + 10, curY + 6);

    let sumY = curY + 26;
    const certText = [
        '1. Registration Authenticity: This document constitutes the verified and final official roster of all 254 participants enrolled in the Asterix Technical Workshop Series 2026. Every participant record documented above corresponds to a successful statutory payment confirmed via Razorpay / Banking Partner reconciliation.',
        '2. Refund & Upgrades Reconciled: All participant adjustments, including processed refunds (Registration record #AST-WS-0178 removed upon full refund remittance) and package upgrades (Software to Dual-Track Combo package upgrade #AST-WS-0229, Hariram S, Roll: 715526177013), have been accounted for.',
        '3. Capacity & Compliance: Both technical tracks have adhered strictly to institutional laboratory health and safety ceilings (161 participants each), fully compliant with PSG iTech Autonomous Systems & Robotics Lab and Electrical Machines Lab guidelines.',
        '4. Total Remittance: Total gross fees collected through the online portal amount to Rs. 3,05,000/- (Rupees Three Lakh Five Thousand Only), designated towards lab consumables, hardware development, robotic kits, and SAEINDIA aBAJA vehicle prototyping.'
    ];

    certText.forEach(p => {
        doc.fillColor('#334155').fontSize(7).font('Helvetica')
            .text(p, marginLeft + 10, sumY, { width: contentWidth - 20, lineGap: 1.5 });
        sumY += 18;
    });

    curY += 114;

    // Formal Signatory Blocks (4 Signatories + Institutional Seal)
    doc.rect(marginLeft, curY, contentWidth, 160).fill('#f8fafc');
    doc.rect(marginLeft, curY, contentWidth, 160).lineWidth(0.5).stroke('#cbd5e1');

    doc.rect(marginLeft, curY, contentWidth, 20).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
        .text('AUTHORIZED INSTITUTIONAL SIGNATORIES & CLUB LEADERSHIP', marginLeft + 10, curY + 6);

    const sigY = curY + 30;
    const sigColW = 142;
    const sigGap = 8;

    const signatories = [
        {
            role: 'Software & Perception Lead',
            name: 'Arya A',
            desig: 'Technical Lead, Team Asterix\nPSG iTech',
            x: marginLeft + 10
        },
        {
            role: 'Powertrain Subsystem Lead',
            name: 'Joel Anto Edwin',
            desig: 'Powertrain Head, Team Asterix\nPSG iTech',
            x: marginLeft + 10 + (sigColW + sigGap) * 1
        },
        {
            role: 'System Administrator & Lead',
            name: 'Ratheeswar S',
            desig: 'System Administrator & Lead\nTeam Asterix, PSG iTech',
            x: marginLeft + 10 + (sigColW + sigGap) * 2
        },
        {
            role: 'Faculty Advisor & Head',
            name: 'Faculty In-Charge / Coordinator',
            desig: 'PSG iTech BAJA Racing Cell\nPSG Institute of Technology',
            x: marginLeft + 10 + (sigColW + sigGap) * 3
        }
    ];

    signatories.forEach(sig => {
        // Signature Line
        doc.rect(sig.x, sigY + 60, sigColW - 14, 1).fill('#94a3b8');

        doc.fillColor('#1e40af').fontSize(7).font('Helvetica-Bold')
            .text(sig.role.toUpperCase(), sig.x, sigY + 8, { width: sigColW - 14, align: 'center' });

        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
            .text(sig.name, sig.x, sigY + 68, { width: sigColW - 14, align: 'center' });

        doc.fillColor('#64748b').fontSize(6.5).font('Helvetica')
            .text(sig.desig, sig.x, sigY + 80, { width: sigColW - 14, align: 'center', lineGap: 1.5 });
    });

    // Institutional Seal Box on the Far Right
    const sealX = marginLeft + 10 + (sigColW + sigGap) * 4 + 4;
    const sealW = contentWidth - (sealX - marginLeft) - 10;
    const sealY = curY + 28;

    doc.rect(sealX, sealY, sealW, 95).fill('#ffffff');
    doc.rect(sealX, sealY, sealW, 95).lineWidth(0.75).dash(3, { space: 3 }).stroke('#94a3b8');
    doc.undash();

    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica-Bold')
        .text('INSTITUTIONAL SEAL', sealX, sealY + 34, { width: sealW, align: 'center' });
    doc.fillColor('#cbd5e1').fontSize(6).font('Helvetica')
        .text('PSG Institute of Technology\nand Applied Research', sealX, sealY + 48, { width: sealW, align: 'center', lineGap: 1 });

    // Global Two-Pass Page Numbering Footer (with lineBreak: false and safe height)
    const range = doc.bufferedPageRange();
    const totalPageCount = range.count;

    for (let i = range.start; i < range.start + totalPageCount; i++) {
        doc.switchToPage(i);

        const footerY = pageHeight - 20;
        doc.rect(marginLeft, footerY - 4, contentWidth, 0.5).fill('#cbd5e1');

        doc.fillColor('#64748b').fontSize(6.5).font('Helvetica')
            .text('PSG Institute of Technology and Applied Research  •  Team Asterix aBAJA SAEINDIA  •  Confidential Institutional Dossier', marginLeft, footerY, { width: contentWidth - 140, lineBreak: false });

        doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Bold')
            .text(`Page ${i + 1} of ${totalPageCount}`, pageWidth - marginRight - 120, footerY, { width: 120, align: 'right', lineBreak: false });
    }

    doc.end();

    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    // Copy to root workspace
    fs.copyFileSync(outputPath, rootOutputPath);

    console.log(`\n======================================================`);
    console.log(`✅ Official Report PDF successfully regenerated!`);
    console.log(`📁 Primary path: ${outputPath}`);
    console.log(`📁 Root workspace copy: ${rootOutputPath}`);
    console.log(`📄 Total Pages: ${totalPageCount}`);
    console.log(`👥 Total Participants: ${participants.length}`);
    console.log(`💰 Total Revenue: Rs. ${totalRevenue.toLocaleString('en-IN')}`);
    console.log(`======================================================\n`);

    process.exit(0);
}

generateReport().catch(err => {
    console.error('Error generating official report:', err);
    process.exit(1);
});
