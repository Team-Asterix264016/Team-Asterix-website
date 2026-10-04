import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUrl } from '../lib/api';
import { useWebsiteData } from '../context/WebsiteDataContext';
/* Shared with the backend so the page and the server can never disagree on
   what a package includes or costs. The server still looks the price up on
   its own side when it creates the order; this import is for display only. */
import {
    WORKSHOP_TRACKS,
    WORKSHOP_PACKAGES,
    WORKSHOP_DEPARTMENTS,
    SOFTWARE_MAX_SEATS,
    POWERTRAIN_MAX_SEATS,
    SOFTWARE_REOPEN_TIME,
    SOFTWARE_CLOSE_DEADLINE,
    getSoftwareRegistrationState,
    isPriced
} from '../../server/src/config/workshopPackages.js';

const TRACK_ORDER = ['software', 'powertrain'];
const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Payments are open. Flip to false to pause.
const PAYMENTS_ENABLED = true;

const EMPTY_FORM = {
    name: '',
    rollNo: '',
    department: '',
    year: '',
    email: '',
    phone: '',
    package: ''
};

const FIELD_LABELS = {
    name: 'Full name',
    rollNo: 'Registered number',
    department: 'Department',
    year: 'Year',
    email: 'College Email ID',
    phone: 'Phone',
    package: 'Track'
};

/* text-base (16px) on phones: anything smaller makes iOS Safari zoom the page
   in when a field is tapped, which then has to be pinched back out. */
function inputClass(hasError) {
    return `w-full min-h-12 px-3 py-3 border-2 font-mono text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm ${hasError ? 'border-red-600 bg-red-50' : 'border-slate-950 bg-slate-50'
        }`;
}

/* Same rule as the server: keep the last 10 digits, so "+91 98765 43210"
   and "098765 43210" are accepted as the number they are. */
function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

// Shown on the page as the deadline.
const REGISTRATION_CLOSES = 'Tuesday, 6 October 2026 at 11:59 PM (or when 160 seats are reached)';

function formatAmount(amount) {
    if (typeof amount !== 'number') return 'TBD';
    return amount.toLocaleString('en-IN');
}

function formatPrice(pkg) {
    return isPriced(pkg) ? formatAmount(pkg.price) : 'TBD';
}

/* Combo offer maths, worked out from the package prices so the tags never
   drift from what is actually charged. */
const SINGLE_PACKAGES = WORKSHOP_PACKAGES.filter(p => p.tracksIncluded.length === 1);
const COMBO_PACKAGE = WORKSHOP_PACKAGES.find(p => p.tracksIncluded.length > 1) || null;
const COMBO_SAVING = isPriced(COMBO_PACKAGE) && SINGLE_PACKAGES.every(isPriced)
    ? SINGLE_PACKAGES.reduce((sum, p) => sum + p.price, 0) - COMBO_PACKAGE.price
    : 0;

/**
 * Computes badge text according to capacity and threshold rules:
 * - When paused for technical maintenance: "Paused · Reopens Mon 8 AM"
 * - When past Tuesday 11:59 PM deadline: "Closed"
 * - When remaining seats are <= 0 (or sold out): "Sold Out"
 * - When remaining seats are <= 25: "X seats left"
 * - When remaining seats are > 25: "Limited seats available"
 */
function getSeatBadgeInfo(seatsInfo) {
    if (!seatsInfo) {
        return null;
    }
    if (seatsInfo.isPaused) {
        return {
            text: 'Paused · Reopens Mon 8 AM',
            fullText: 'Temporarily Paused (Bank Issue) · Reopens Monday Morning',
            isSoldOut: false,
            isLimited: false,
            isPaused: true
        };
    }
    if (seatsInfo.isPastDeadline) {
        return {
            text: 'Closed',
            fullText: 'Registration Closed (Deadline Passed)',
            isSoldOut: true,
            isLimited: false,
            isPaused: false
        };
    }
    if (seatsInfo.seatsLeft === null || seatsInfo.seatsLeft === undefined) {
        return null;
    }
    if (seatsInfo.soldOut || seatsInfo.seatsLeft <= 0) {
        return {
            text: 'Sold Out',
            fullText: 'Sold Out',
            isSoldOut: true,
            isLimited: false,
            isPaused: false
        };
    }
    if (seatsInfo.seatsLeft <= 25) {
        return {
            text: `${seatsInfo.seatsLeft} seats left`,
            fullText: `${seatsInfo.seatsLeft} seats left`,
            isSoldOut: false,
            isLimited: false,
            isPaused: false
        };
    }
    return {
        text: 'Limited seats available',
        fullText: 'Limited seats available',
        isSoldOut: false,
        isLimited: true,
        isPaused: false
    };
}

// For a single-track choice: the other track and what adding it would cost.
function upsellFor(pkg, { powertrainSoldOut = false, softwareSoldOut = false, softwarePaused = false } = {}) {
    if (powertrainSoldOut || softwareSoldOut || softwarePaused) return null;
    if (!pkg || !COMBO_PACKAGE || COMBO_SAVING <= 0 || pkg.tracksIncluded.length !== 1) return null;
    const other = SINGLE_PACKAGES.find(p => p.id !== pkg.id);
    if (!other) return null;
    return { other, extra: COMBO_PACKAGE.price - pkg.price };
}

function scrollToEl(el) {
    if (!el) return;
    if (window.lenis) window.lenis.scrollTo(el, { offset: -90 });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadRazorpayCheckout() {
    if (window.Razorpay) return Promise.resolve(true);
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = RAZORPAY_CHECKOUT_SRC;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function validate(form, { powertrainSoldOut = false, softwareSoldOut = false, softwarePaused = false } = {}) {
    // Checked in the order the fields appear on the page (track choice first),
    // so the first key is the topmost problem.
    const errors = {};
    const pkg = WORKSHOP_PACKAGES.find(p => p.id === form.package);
    if (!pkg) errors.package = 'Choose a track.';
    else if (!isPriced(pkg)) errors.package = 'Pricing for this package is not announced yet.';
    else if (pkg.id === 'software' && softwarePaused) {
        errors.package = "Software registrations are temporarily paused while we fix a technical issue on the bank's side. Registrations reopen tomorrow (Monday) morning at 8:00 AM and close Tuesday at 11:59 PM (or when 160 seats are reached).";
    } else if (pkg.id === 'combo' && softwarePaused) {
        errors.package = "Dual-Track registrations are temporarily paused while we fix a technical issue on the bank's side. Registrations reopen tomorrow (Monday) morning at 8:00 AM.";
    } else if (pkg.id === 'powertrain' && powertrainSoldOut) {
        errors.package = 'Electronics & Powertrain is completely full! Only Software & Autonomous Systems track is available — learn the brains behind the vehicle (ROS, AI & Perception). Stay tuned for future workshops by our team.';
    } else if (pkg.id === 'software' && softwareSoldOut) {
        errors.package = 'Software & Autonomous Systems workshop registrations are fully booked (160 seats reached). Stay tuned for future workshops by our team.';
    } else if (pkg.id === 'combo' && (powertrainSoldOut || softwareSoldOut)) {
        errors.package = powertrainSoldOut
            ? 'Dual-Track Combo is closed as Powertrain has reached its limit. Only the Software & Autonomous Systems track is available! Stay tuned for future workshops by our team.'
            : 'Dual-Track Combo registrations are currently closed. Stay tuned for future workshops by our team.';
    }
    if (form.name.trim().length < 2) errors.name = 'Enter your full name.';
    if (!form.rollNo.trim()) errors.rollNo = 'Enter your registered number.';
    if (!WORKSHOP_DEPARTMENTS.includes(form.department)) errors.department = 'Select your department.';
    if (!['1', '2'].includes(form.year)) errors.year = 'Select 1st or 2nd year.';
    if (!EMAIL_RE.test(form.email.trim())) {
        errors.email = 'Enter a valid email address.';
    } else if (!form.email.trim().toLowerCase().endsWith('@psgitech.ac.in')) {
        errors.email = 'Please use your college email (@psgitech.ac.in).';
    }
    if (normalizePhone(form.phone).length !== 10) errors.phone = 'Enter a valid 10-digit phone number.';
    return errors;
}

async function postJson(path, body) {
    const res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const STEPS = ['Details', 'Confirm', 'Payment'];

// Which slide of the registration pop-up a stage belongs to.
function stepFor(stage) {
    if (stage === 'form') return 0;
    if (stage === 'review') return 1;
    return 2;
}

function formatPaidAt(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

/* One list feeds both the on-screen receipt and the downloaded image, whether
   the record comes from a payment just made or from a later receipt lookup. */
function receiptRows(record) {
    return [
        ['Receipt no.', record.receiptNo || 'Being generated'],
        ['Name', record.name],
        ['Registered no.', record.rollNo],
        ['Department', record.department],
        ['Year', record.year === '1' ? '1st year' : record.year === '2' ? '2nd year' : ''],
        ['Email', record.email],
        ['Phone', record.phone],
        ['Track', record.packageName],
        ['Amount paid', `${Number(record.amount).toLocaleString('en-IN')}`],
        ['Paid on', formatPaidAt(record.paidAt)],
        ['Reference', record.registrationId]
    ].filter(([, value]) => value);
}

function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const word of String(text).split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines;
}

/* Drawn on a canvas and saved as a PNG: no PDF library needed, and on a
   phone an image lands straight in the gallery / downloads. */
function downloadReceipt(rows, fileId) {
    try {
        const W = 640, PAD = 36, LABEL_W = 170, LINE_H = 24, ROW_PAD = 18;
        const HEADER_H = 128, FOOTER_H = 84;
        const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        const VALUE_FONT = `700 17px ${SANS}`;
        const valueW = W - PAD * 2 - LABEL_W;

        const canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = VALUE_FONT;
        const laid = rows.map(([label, value]) => ({ label, lines: wrapText(ctx, String(value ?? ''), valueW) }));
        const H = HEADER_H + laid.reduce((sum, row) => sum + row.lines.length * LINE_H + ROW_PAD, 0) + FOOTER_H + 16;

        const scale = 2;
        canvas.width = W * scale;
        canvas.height = H * scale;
        ctx = canvas.getContext('2d'); // resizing resets the context state
        ctx.scale(scale, scale);
        ctx.textBaseline = 'top';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#fcd34d';
        ctx.fillRect(0, 0, W, HEADER_H - 16);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, HEADER_H - 20, W, 4);
        ctx.font = `900 13px ${MONO}`;
        ctx.fillStyle = '#0369a1';
        ctx.fillText('TEAM ASTERIX · WORKSHOP 2026', PAD, 30);
        ctx.font = `900 30px ${SANS}`;
        ctx.fillStyle = '#0f172a';
        ctx.fillText('PAYMENT RECEIPT', PAD, 52);

        ctx.font = `900 14px ${MONO}`;
        const tag = '✓ PAID';
        const tagW = ctx.measureText(tag).width + 24;
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(W - PAD - tagW, 50, tagW, 34);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.strokeRect(W - PAD - tagW, 50, tagW, 34);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(tag, W - PAD - tagW + 12, 60);

        let y = HEADER_H;
        laid.forEach((row, index) => {
            const rowH = row.lines.length * LINE_H + ROW_PAD;
            if (row.label === 'Amount paid') {
                ctx.fillStyle = '#fcd34d';
                ctx.fillRect(PAD - 12, y - 2, W - PAD * 2 + 24, rowH);
            }
            ctx.font = `900 12px ${MONO}`;
            ctx.fillStyle = '#64748b';
            ctx.fillText(row.label.toUpperCase(), PAD, y + 11);
            ctx.font = VALUE_FONT;
            ctx.fillStyle = '#0f172a';
            row.lines.forEach((line, i) => ctx.fillText(line, PAD + LABEL_W, y + 8 + i * LINE_H));
            y += rowH;
            if (index < laid.length - 1) {
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(PAD, y - 2, W - PAD * 2, 2);
            }
        });

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, y + 8, W, 4);
        ctx.font = `700 12px ${MONO}`;
        ctx.fillStyle = '#475569';
        ctx.fillText('Payment processed by Razorpay.', PAD, y + 30);
        ctx.fillText('Keep this receipt; session details will be shared before the workshop.', PAD, y + 50);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, W, H);

        const safeId = String(fileId || 'Receipt').replace(/[^a-zA-Z0-9_-]/g, '-');
        const filename = `Asterix-Workshop-Receipt-${safeId}.png`;

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => link.remove(), 1500);

        if (typeof canvas.toBlob === 'function' && navigator.canShare) {
            canvas.toBlob((blob) => {
                if (blob) {
                    try {
                        const file = new File([blob], filename, { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                            navigator.share({ files: [file], title: `Asterix Workshop Receipt - ${safeId}` }).catch(() => {});
                        }
                    } catch {
                        // ignore share error
                    }
                }
            }, 'image/png');
        }
    } catch (err) {
        console.error('Download receipt failed:', err);
        alert('Could not download receipt image automatically. Please take a screenshot of your receipt on screen.');
    }
}

export default function WorkshopPage({ onBack }) {
    const [activeTrack, setActiveTrack] = useState('software');
    const [registerOpen, setRegisterOpen] = useState(false);
    const [lookupOpen, setLookupOpen] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    // form -> review -> paying -> verifying -> success | unconfirmed
    const [stage, setStage] = useState('form');
    const [error, setError] = useState('');
    const [registration, setRegistration] = useState(null);
    const [upgradePrompt, setUpgradePrompt] = useState(null);
    const [upgradeBusy, setUpgradeBusy] = useState(false);
    // "Add the other track for ₹750 more" prompt beside Review & continue.
    const [upsellOpen, setUpsellOpen] = useState(false);
    const formRef = useRef(null);
    const detailRef = useRef(null);
    const [previewSyllabus, setPreviewSyllabus] = useState(null); // { url, name } | null

    const { siteData } = useWebsiteData();
    const dynamicTracks = siteData?.workshop?.tracks || {};
    const track = {
        ...WORKSHOP_TRACKS[activeTrack],
        ...(dynamicTracks[activeTrack] || {})
    };
    const selectedPkg = WORKSHOP_PACKAGES.find(p => p.id === form.package) || null;
    const anyPriced = WORKSHOP_PACKAGES.some(isPriced);

    const initialSoftwareState = getSoftwareRegistrationState(Date.now(), 145);
    const [powertrainSeats, setPowertrainSeats] = useState({
        maxSeats: POWERTRAIN_MAX_SEATS,
        seatsLeft: 0,
        soldOut: true
    });
    const [softwareSeats, setSoftwareSeats] = useState({
        maxSeats: SOFTWARE_MAX_SEATS,
        seatsLeft: initialSoftwareState.seatsLeft,
        soldOut: initialSoftwareState.soldOut,
        isPaused: initialSoftwareState.isPaused,
        isPastDeadline: initialSoftwareState.isPastDeadline,
        open: initialSoftwareState.open,
        pauseMessage: initialSoftwareState.pauseMessage,
        scheduleSummary: initialSoftwareState.scheduleSummary
    });

    const comboSeats = useMemo(() => ({
        seatsLeft: (powertrainSeats.seatsLeft !== null && softwareSeats.seatsLeft !== null)
            ? Math.min(powertrainSeats.seatsLeft, softwareSeats.seatsLeft)
            : (powertrainSeats.seatsLeft ?? softwareSeats.seatsLeft ?? null),
        soldOut: Boolean(powertrainSeats.soldOut || softwareSeats.soldOut || softwareSeats.isPaused),
        isPaused: softwareSeats.isPaused
    }), [powertrainSeats, softwareSeats]);

    // Live fetch of seat counts
    useEffect(() => {
        let isMounted = true;
        const fetchSeatStatus = async () => {
            try {
                const res = await fetch(apiUrl('/api/workshop/packages'));
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        if (data.powertrainSeats) setPowertrainSeats(data.powertrainSeats);
                        if (data.softwareSeats) setSoftwareSeats(data.softwareSeats);
                    }
                }
            } catch {
                // graceful fallback
            }
        };
        fetchSeatStatus();
        const timer = setInterval(fetchSeatStatus, 15000);
        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, []);

    const isPackageSoldOut = (pkgId) => {
        if (pkgId === 'powertrain') return powertrainSeats.soldOut;
        if (pkgId === 'software') return softwareSeats.soldOut || softwareSeats.isPaused;
        if (pkgId === 'combo') return comboSeats.soldOut || softwareSeats.isPaused;
        return false;
    };

    const openRegister = (packageId) => {
        if (softwareSeats.isPaused) {
            setError(softwareSeats.pauseMessage || "We are currently fixing a technical issue on the bank's side. Software track registrations will reopen tomorrow (Monday) morning at 8:00 AM and close Tuesday at 11:59 PM (or when 160 seats are reached).");
            setUpgradePrompt(null);
            setRegisterOpen(true);
            return;
        }
        if (typeof packageId === 'string' && packageId) {
            if (isPackageSoldOut(packageId)) {
                if (packageId === 'powertrain' || packageId === 'combo') {
                    if (!softwareSeats.soldOut && !softwareSeats.isPaused) {
                        setForm(prev => ({ ...prev, package: 'software' }));
                        setError('Electronics & Powertrain is fully booked! Only Software & Autonomous Systems track is available — learn ROS, Computer Vision, and autonomous vehicle stacks to master full vehicle intelligence! Stay tuned for future workshops by our team.');
                    } else {
                        setForm(prev => ({ ...prev, package: '' }));
                        setError('Workshop registrations are currently not available. Stay tuned for future workshops by our team!');
                    }
                } else if (packageId === 'software') {
                    if (!powertrainSeats.soldOut) {
                        setForm(prev => ({ ...prev, package: 'powertrain' }));
                        setError('Software track is fully booked. You can still register for Electronics & Powertrain! Stay tuned for future workshops by our team.');
                    } else {
                        setForm(prev => ({ ...prev, package: '' }));
                        setError('Workshop registrations are fully booked. Stay tuned for future workshops by our team!');
                    }
                }
            } else {
                setForm(prev => ({ ...prev, package: packageId }));
                setFieldErrors(prev => ({ ...prev, package: undefined }));
                setError('');
            }
        }
        setUpgradePrompt(null);
        setRegisterOpen(true);
    };

    // Not while the payment window is open or a payment is being confirmed.
    const canClose = stage !== 'paying' && stage !== 'verifying';
    const closeRegister = () => {
        if (!canClose) return;
        setRegisterOpen(false);
        setUpsellOpen(false);
    };

    const selectTrack = (id) => {
        setActiveTrack(id);
        setTimeout(() => scrollToEl(detailRef.current), 60);
    };

    const updateField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setFieldErrors(prev => ({ ...prev, [key]: undefined }));
        setError('');
        setUpgradePrompt(null);
        setUpsellOpen(false);
    };

    const handleConfirm = (event) => {
        event.preventDefault();
        const errors = validate(form, {
            powertrainSoldOut: powertrainSeats.soldOut,
            softwareSoldOut: softwareSeats.soldOut,
            softwarePaused: softwareSeats.isPaused
        });
        setFieldErrors(errors);
        const keys = Object.keys(errors);
        if (keys.length > 0) {
            setError(`Please fix: ${keys.map(key => FIELD_LABELS[key] || key).join(', ')}.`);
            // On a phone the first problem is usually off screen: take them to it.
            // validate() adds keys in form order, so keys[0] is the topmost field.
            const target = formRef.current?.querySelector(`[data-field="${keys[0]}"]`);
            if (target) {
                (target.closest('[data-field-wrap]') || target).scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.focus({ preventScroll: true });
            }
            return;
        }
        setError('');
        // One track picked: offer the combo once before moving on (if not sold out).
        if (upsellFor(selectedPkg, {
            powertrainSoldOut: powertrainSeats.soldOut,
            softwareSoldOut: softwareSeats.soldOut,
            softwarePaused: softwareSeats.isPaused
        }) && !upsellOpen) {
            setUpsellOpen(true);
            return;
        }
        setUpsellOpen(false);
        setStage('review');
    };

    const acceptUpsell = () => {
        if (powertrainSeats.soldOut || softwareSeats.soldOut || softwareSeats.isPaused) return;
        updateField('package', COMBO_PACKAGE.id);
        setStage('review');
    };

    /* The signature check in /verify is what confirms a payment. If that call
       never lands (dropped connection), the Razorpay webhook marks the
       registration paid on the server, and polling /status picks that up. */
    const confirmPaid = async (registrationId, response) => {
        setStage('verifying');
        try {
            const { ok, data } = await postJson('/api/workshop/verify', response);
            if (ok && data.registration?.status === 'paid') {
                setRegistration(data.registration);
                setStage('success');
                return;
            }
        } catch {
            // Fall through to polling.
        }

        for (let attempt = 0; attempt < 10; attempt++) {
            await wait(3000);
            try {
                const res = await fetch(apiUrl(`/api/workshop/status/${registrationId}`));
                const data = await res.json().catch(() => ({}));
                if (data.registration?.status === 'paid') {
                    setRegistration(data.registration);
                    setStage('success');
                    return;
                }
            } catch {
                // Keep polling.
            }
        }
        setRegistration({ registrationId });
        setStage('unconfirmed');
    };

    const handlePay = async () => {
        setError('');
        setStage('paying');

        let result;
        try {
            result = await postJson('/api/workshop/register', {
                ...form,
                phone: normalizePhone(form.phone)
            });
        } catch {
            setError('Could not reach the server. Check your connection and try again.');
            setStage('review');
            return;
        }

        const { ok, data } = result;
        if (!ok) {
            if (data.alreadyPaid && data.canUpgrade) {
                setUpgradePrompt({
                    registrationId: data.existingRegistrationId,
                    existingPackage: data.existingPackage,
                    existingName: data.existingName,
                    upgradePrice: data.upgradePrice || 750
                });
                setStage('review');
            } else if (data.fields) {
                setFieldErrors(data.fields);
                setStage('form');
                setUpgradePrompt(null);
            } else {
                setStage('review');
                setUpgradePrompt(null);
            }
            setError(data.error || 'Registration failed. Please try again.');
            return;
        }

        setUpgradePrompt(null);

        const loaded = await loadRazorpayCheckout();
        if (!loaded || !window.Razorpay) {
            setError('Could not load the payment window. Disable any ad-blocker for this site and try again.');
            setStage('review');
            return;
        }

        const checkout = new window.Razorpay({
            key: data.keyId,
            order_id: data.order.id,
            amount: data.order.amount,
            currency: data.order.currency,
            name: 'Team Asterix',
            description: `${data.package.name} Workshop`,
            prefill: data.prefill,
            notes: { registrationId: data.registrationId },
            theme: { color: '#0ea5e9' },
            handler: (response) => confirmPaid(data.registrationId, response),
            modal: {
                ondismiss: () => {
                    setStage(current => (current === 'paying' ? 'review' : current));
                    setError(current => current || 'Payment window closed. You can try again whenever you are ready.');
                }
            }
        });
        checkout.on('payment.failed', (response) => {
            setError(response?.error?.description || 'Payment failed. You can retry.');
        });
        checkout.open();
    };

    const handleUpgrade = async (registrationId, prefill) => {
        setError('');
        setUpgradeBusy(true);
        setStage('paying');

        try {
            const { ok, data } = await postJson('/api/workshop/upgrade', {
                registrationId,
                ...(prefill ? { email: prefill.email, phone: normalizePhone(prefill.phone || prefill.contact), name: prefill.name } : {})
            });
            if (!ok) {
                setError(data.error || 'Upgrade failed. Please try again.');
                setStage('review');
                setUpgradeBusy(false);
                return;
            }

            const loaded = await loadRazorpayCheckout();
            if (!loaded || !window.Razorpay) {
                setError('Could not load payment gateway. Please disable ad-blockers and try again.');
                setStage('review');
                setUpgradeBusy(false);
                return;
            }

            const checkout = new window.Razorpay({
                key: data.keyId,
                order_id: data.order.id,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'Team Asterix',
                description: 'Dual-Track Combo Upgrade',
                prefill: data.prefill,
                notes: { registrationId: data.registrationId, type: 'upgrade' },
                theme: { color: '#0ea5e9' },
                handler: (response) => {
                    setUpgradeBusy(false);
                    confirmPaid(data.registrationId, response);
                },
                modal: {
                    ondismiss: () => {
                        setUpgradeBusy(false);
                        setStage(current => (current === 'paying' ? 'review' : current));
                        setError(current => current || 'Upgrade payment window closed. You can upgrade anytime.');
                    }
                }
            });
            checkout.on('payment.failed', (response) => {
                setUpgradeBusy(false);
                setError(response?.error?.description || 'Upgrade payment failed.');
            });
            checkout.open();
        } catch {
            setUpgradeBusy(false);
            setError('Could not reach the server for upgrade. Check your connection.');
            setStage('review');
        }
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setFieldErrors({});
        setError('');
        setRegistration(null);
        setUpgradePrompt(null);
        setUpsellOpen(false);
        setStage('form');
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-amber-300 selection:text-slate-900">
            <header className="sticky top-0 z-50 border-b-4 border-slate-900 bg-white/95 px-4 py-3.5 shadow-[0_4px_0px_#0f172a] backdrop-blur-md sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div>
                        <span className="font-mono text-xs font-black uppercase tracking-widest text-sky-600">Team Asterix</span>
                        <strong className="block text-sm font-black uppercase">Workshops 2026</strong>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <button type="button" onClick={onBack} className="press border-2 border-slate-900 bg-amber-300 px-3 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#0f172a] hover:bg-amber-400 sm:px-4">
                            ← Main<span className="hidden sm:inline"> Website</span>
                        </button>
                        {/* Prominent Upgrade to Combo Button in Header */}
                        <button
                            type="button"
                            onClick={() => setUpgradeModalOpen(true)}
                            aria-haspopup="dialog"
                            aria-label="Upgrade to Dual-Track Combo"
                            className="press inline-flex items-center gap-1.5 border-2 border-slate-900 bg-amber-400 px-2.5 py-2 font-mono text-xs font-black uppercase text-slate-950 shadow-[3px_3px_0px_#0284c7] hover:bg-amber-300 sm:px-3.5 cursor-pointer"
                        >
                            <span className="text-amber-950">★</span>
                            <span className="sm:hidden">Upgrade ₹750</span>
                            <span className="hidden sm:inline">Upgrade to Combo (₹750)</span>
                        </button>
                        {/* Check registration & receipt lookup button */}
                        <button
                            type="button"
                            onClick={() => setLookupOpen(true)}
                            aria-haspopup="dialog"
                            aria-label="Check registration"
                            className="press inline-flex items-center gap-1.5 border-2 border-slate-900 bg-emerald-400 px-2.5 py-2 font-mono text-xs font-black uppercase text-slate-900 shadow-[3px_3px_0px_#0f172a] hover:bg-emerald-300 sm:px-4"
                        >
                            <svg className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                            <span className="sm:hidden">Check Reg</span>
                            <span className="hidden sm:inline">Check Registration</span>
                        </button>
                    </div>
                </div>
            </header>

            <main>
                {/* Overview */}
                <section className="border-b-4 border-slate-900 bg-amber-300 px-4 py-16 sm:px-8 sm:py-24">
                    <div className="mx-auto max-w-6xl">
                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-3 py-1 font-mono text-xs font-black uppercase tracking-widest text-amber-300">
                            ✦ Workshop 2026
                        </span>
                        <h1 className="mt-5 max-w-5xl text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
                            Engineer autonomy with the team that builds it
                        </h1>
                        <p className="mt-6 max-w-3xl text-base font-bold leading-relaxed sm:text-xl">
                            Two hands-on tracks. One autonomous vehicle.<br className="hidden sm:inline" />
                            Learn the software that makes it think, or the electronics and powertrain that make it move.
                        </p>
                        <p className="mt-3 max-w-3xl text-sm font-bold leading-relaxed text-slate-800 sm:text-base">
                            Sessions led by Team Asterix engineers and industry experts with real hardware, handbooks and project work.
                        </p>
                        <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-slate-800 sm:text-base">
                            Choose one track, or take both with the combo package.
                        </p>

                        {/* Prominent Bank Maintenance Notice */}
                        {softwareSeats.isPaused && (
                            <div className="mt-8 border-4 border-slate-900 bg-white p-5 shadow-[6px_6px_0px_#0f172a] sm:p-6">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <span className="border-2 border-slate-900 bg-rose-500 text-white px-2.5 py-0.5 font-mono text-[11px] font-black uppercase">
                                        ⏸ Registrations Temporarily Paused
                                    </span>
                                    <span className="border-2 border-slate-900 bg-amber-400 text-slate-950 px-2.5 py-0.5 font-mono text-[11px] font-black uppercase">
                                        ⚡ Reopening Monday 8:00 AM
                                    </span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black uppercase text-slate-950 leading-tight">
                                    Fixing a technical issue on the bank's side
                                </h3>
                                <p className="mt-2 text-sm sm:text-base font-bold text-slate-800 leading-relaxed max-w-3xl">
                                    Registrations are temporarily paused while our team resolves a technical issue on the banking partner's end. Software &amp; Autonomous Systems registrations will resume tomorrow (Monday) morning at 8:00 AM and will close on Tuesday, 6 October at 11:59 PM (or when our 160-seat capacity is reached, whichever comes first).
                                </p>
                                <div className="mt-3.5 flex items-center gap-2 sm:gap-4 flex-wrap font-mono text-xs font-black text-slate-900">
                                    <span className="inline-block border border-slate-900 bg-amber-100 px-2 py-1">✦ Current Seats Filled: 145 / 160</span>
                                    <span className="inline-block border border-slate-900 bg-emerald-100 px-2 py-1">✦ Seats Remaining: {softwareSeats.seatsLeft ?? 15}</span>
                                    <span className="inline-block border border-slate-900 bg-sky-100 px-2 py-1">✦ Final Deadline: Tuesday 11:59 PM</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => openRegister()}
                                className="press border-2 border-slate-900 bg-slate-900 px-5 py-3 font-mono text-xs font-black uppercase text-amber-300 shadow-[4px_4px_0px_#0284c7] hover:bg-slate-800"
                            >
                                {softwareSeats.isPaused ? '⏸ Registration Paused · Reopens Mon 8 AM' : 'Register now →'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setUpgradeModalOpen(true)}
                                className="press border-2 border-slate-900 bg-amber-400 px-5 py-3 font-mono text-xs font-black uppercase text-slate-950 shadow-[4px_4px_0px_#0f172a] hover:bg-amber-300 flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>★ Already in Powertrain? Upgrade for ₹750</span>
                                <span>→</span>
                            </button>
                            <button type="button" onClick={() => scrollToEl(detailRef.current)} className="press border-2 border-slate-900 bg-white px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#0f172a] hover:bg-sky-100">
                                Explore the tracks ↓
                            </button>
                        </div>
                        <ClosingDate className="mt-5" />
                    </div>
                </section>

                {/* Track selector + details */}
                <section ref={detailRef} className="border-b-4 border-slate-900 bg-sky-100 px-4 py-12 sm:px-8 sm:py-16">
                    <div className="mx-auto max-w-6xl">
                        <span className="font-mono text-xs font-black uppercase tracking-widest text-sky-700">01 / Choose a track</span>
                        <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">The tracks</h2>

                        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4" role="tablist" aria-label="Workshop tracks">
                            {TRACK_ORDER.map((id) => {
                                const t = WORKSHOP_TRACKS[id];
                                const active = id === activeTrack;
                                const trackSeatStats = id === 'powertrain' ? powertrainSeats : softwareSeats;
                                const badgeInfo = getSeatBadgeInfo(trackSeatStats);

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => selectTrack(id)}
                                        className={`press group cursor-pointer border-3 sm:border-4 border-slate-900 p-3.5 sm:p-6 text-left transition-all ${active
                                            ? 'bg-slate-900 text-white shadow-[6px_6px_0px_#0284c7]'
                                            : 'bg-white text-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-amber-100 hover:shadow-[6px_6px_0px_#0f172a]'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className={`inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider ${active ? 'text-amber-300' : 'text-sky-600 group-hover:text-sky-700'
                                                }`}>
                                            <span>{active ? '● Selected' : '○ View Track'}</span>
                                            </span>
                                            <span className={`font-mono text-xs font-black ${active ? 'text-amber-300' : 'text-slate-400 group-hover:text-slate-900'
                                                }`}>
                                                {active ? '✓' : '↘'}
                                            </span>
                                        </div>
                                        <span className="mt-1.5 sm:mt-2 block text-sm sm:text-2xl lg:text-3xl font-black uppercase leading-tight">
                                            {t.name}
                                        </span>
                                        {/* Display seats left: >25 -> 'Limited seats available', <=25 -> 'x seats left' */}
                                        {badgeInfo && (
                                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 border-2 border-slate-900 ${
                                                    badgeInfo.isSoldOut
                                                        ? 'bg-rose-500 text-white'
                                                        : badgeInfo.isPaused
                                                            ? 'bg-amber-300 text-slate-950 shadow-[2px_2px_0px_#0f172a]'
                                                            : 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#0f172a]'
                                                }`}>
                                                    <span>{badgeInfo.isSoldOut ? '✕' : badgeInfo.isPaused ? '⏸' : '⚡'}</span>
                                                    <span>{badgeInfo.text}</span>
                                                </span>
                                            </div>
                                        )}
                                        <span className={`mt-2 hidden text-sm font-bold sm:block ${active ? 'text-slate-300' : 'text-slate-600'
                                            }`}>
                                            {t.tagline}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <TrackDetail
                            key={track.id}
                            track={track}
                            powertrainSeats={powertrainSeats}
                            softwareSeats={softwareSeats}
                            onRegister={openRegister}
                            onOpenUpgrade={() => setUpgradeModalOpen(true)}
                            onPreviewSyllabus={(url, name) => setPreviewSyllabus({ url, name })}
                        />

                        {/* Flexible Upgrade Anytime Banner on Home Page */}
                        <div className="mt-8 border-4 border-slate-900 bg-amber-300 p-5 shadow-[6px_6px_0px_#0f172a] sm:p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] sm:text-xs font-black uppercase text-amber-300">
                                            ★ Flexible Upgrade Policy
                                        </span>
                                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] sm:text-xs font-black uppercase text-amber-300">
                                            ₹750 to Upgrade
                                        </span>
                                    </div>
                                    <h3 className="text-lg sm:text-2xl font-black uppercase leading-tight text-slate-900">
                                        You can upgrade anytime later for 750
                                    </h3>
                                    <p className="text-xs sm:text-sm font-bold text-slate-800 max-w-2xl">
                                        Registered for a single track? Once you realise both sessions are an absolute banger and want complete domain knowledge across the autonomous software stack and vehicle powertrain, you can upgrade to the Dual-Track Combo anytime for just 750.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setUpgradeModalOpen(true)}
                                    className="press shrink-0 border-2 border-slate-900 bg-slate-900 text-amber-300 hover:bg-slate-800 px-6 py-3.5 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#0284c7] cursor-pointer"
                                >
                                    Upgrade to Combo for ₹750 ★
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Included Section */}
                <section className="border-b-4 border-slate-900 bg-amber-300 px-4 py-10 sm:px-8 sm:py-16">
                    <div className="mx-auto max-w-6xl">
                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-300">
                            ✦ All-Inclusive Experience
                        </span>
                        <h2 className="mt-2 text-2xl font-black uppercase sm:text-5xl leading-tight">
                            YOUR 1,000 INCLUDES
                        </h2>
                        <p className="mt-1.5 text-xs sm:text-base font-bold text-slate-800">
                            Everything you need to build real-world engineering mastery with Team Asterix and industry experts.
                        </p>

                        <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3.5">
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">01 / RESOURCES</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">Handbooks &amp; guides</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">Physical &amp; digital comprehensive manuals, schematics and code references.</p>
                            </div>
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">02 / PRACTICE</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">Hands-on learning</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">Direct hardware labs, vehicle testing and interactive debugging sessions.</p>
                            </div>
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">03 / BUILD</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">Mini-projects</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">End-to-end milestone projects designed to build practical engineering confidence.</p>
                            </div>
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">04 / CAREER</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">Build and strengthen your resume</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">Stand out with verified, hands-on project experience on real autonomous stacks and powertrain electronics.</p>
                            </div>
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">05 / CURRICULUM</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">Industry approved syllabus</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">Sessions handled by Team Asterix engineers and industry experts.</p>
                            </div>
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">06 / BONUS</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">3 complimentary sessions</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">Free cross-track masterclasses: Perception, Embedded Systems &amp; Mechanical Fundamentals.</p>
                            </div>
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">07 / VEHICLE</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">Real autonomous-vehicle context</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">Taught directly on the systems powering our national BAJA autonomous buggy.</p>
                            </div>
                            <div className="border-2 sm:border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_#0f172a] sm:shadow-[4px_4px_0px_#0f172a]">
                                <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-600">08 / SKILLS</span>
                                <h3 className="mt-1 text-sm sm:text-base font-black uppercase leading-snug">Future ready minds</h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">Master ROS, Computer Vision, Agentic AI, circuits, and PCB design.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Leads Section */}
                <section className="border-b-4 border-slate-900 bg-sky-50 px-4 py-10 sm:px-8 sm:py-14">
                    <div className="mx-auto max-w-6xl">
                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-400">
                            ✦ Get In Touch
                        </span>
                        <h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl leading-tight text-slate-900">
                            CONTACT THE LEADS
                        </h2>
                        <p className="mt-1.5 text-xs sm:text-base font-bold text-slate-700">
                            Have questions regarding track topics, prerequisites, timings, or payments? Feel free to reach out directly.
                        </p>

                        <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                            {/* Arya */}
                            <div className="border-3 border-slate-900 bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between">
                                <div>
                                    <span className="border-2 border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-900 inline-block mb-2">
                                        Software Lead
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black uppercase text-slate-900">Arya</h3>
                                    <p className="mt-1 font-mono text-xs font-bold text-slate-600">ROS, ML, Agentic AI &amp; Perception Track</p>
                                </div>
                                <div className="mt-4 pt-3 border-t-2 border-slate-200">
                                    <a
                                        href="tel:9994399419"
                                        className="press flex items-center justify-between border-2 border-slate-900 bg-slate-900 px-3.5 py-2.5 font-mono text-xs font-black uppercase text-amber-300 shadow-[2px_2px_0px_#0ea5e9] hover:bg-slate-800"
                                    >
                                        <span>+91 99943 99419</span>
                                        <span className="text-[10px] text-white font-mono">Call →</span>
                                    </a>
                                </div>
                            </div>

                            {/* Ratheeshwar S */}
                            <div className="border-3 border-slate-900 bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between">
                                <div>
                                    <span className="border-2 border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-900 inline-block mb-2">
                                        Software Lead
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black uppercase text-slate-900">Ratheeshwar S</h3>
                                    <p className="mt-1 font-mono text-xs font-bold text-slate-600">Autonomous Stack, CV &amp; System Design</p>
                                </div>
                                <div className="mt-4 pt-3 border-t-2 border-slate-200">
                                    <a
                                        href="tel:8608944644"
                                        className="press flex items-center justify-between border-2 border-slate-900 bg-slate-900 px-3.5 py-2.5 font-mono text-xs font-black uppercase text-amber-300 shadow-[2px_2px_0px_#0ea5e9] hover:bg-slate-800"
                                    >
                                        <span>+91 86089 44644</span>
                                        <span className="text-[10px] text-white font-mono">Call →</span>
                                    </a>
                                </div>
                            </div>

                            {/* Joel Anto Edwin */}
                            <div className="border-3 border-slate-900 bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between">
                                <div>
                                    <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-900 inline-block mb-2">
                                        Powertrain Lead
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black uppercase text-slate-900">Joel Anto Edwin</h3>
                                    <p className="mt-1 font-mono text-xs font-bold text-slate-600">Circuits, Motors, Microcontrollers &amp; PCB Design</p>
                                </div>
                                <div className="mt-4 pt-3 border-t-2 border-slate-200">
                                    <a
                                        href="tel:7207960077"
                                        className="press flex items-center justify-between border-2 border-slate-900 bg-slate-900 px-3.5 py-2.5 font-mono text-xs font-black uppercase text-amber-300 shadow-[2px_2px_0px_#0ea5e9] hover:bg-slate-800"
                                    >
                                        <span>+91 72079 60077</span>
                                        <span className="text-[10px] text-white font-mono">Call →</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Register CTA */}
                <section className="border-b-4 border-slate-900 bg-slate-900 px-4 py-12 text-white sm:px-8">
                    <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                        <div>
                            <span className="font-mono text-xs font-black uppercase tracking-widest text-amber-300">02 / Save your seat</span>
                            <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Ready to build?</h2>
                            <p className="mt-2 max-w-xl text-sm font-bold text-slate-300">
                                One track or both. Registration takes a minute; payment is handled securely by Razorpay.
                            </p>
                            <ClosingDate className="mt-4" dark />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setUpgradeModalOpen(true)}
                                aria-haspopup="dialog"
                                className="press border-3 border-amber-400 bg-amber-400 px-6 py-4 text-base sm:text-lg font-black uppercase tracking-wide text-slate-950 shadow-[5px_5px_0px_#0284c7] hover:bg-amber-300 cursor-pointer"
                            >
                                ★ Upgrade to Combo (₹750)
                            </button>
                            <button
                                type="button"
                                onClick={openRegister}
                                aria-haspopup="dialog"
                                className="press press-sky border-4 border-white bg-white px-8 py-4 text-lg font-black uppercase tracking-wide text-slate-900 shadow-[6px_6px_0px_#0ea5e9] hover:bg-amber-300"
                            >
                                {softwareSeats.isPaused ? 'Registration Paused ⏸' : 'Register ✦'}
                            </button>
                        </div>
                    </div>
                </section>

                {lookupOpen && <ReceiptLookupDialog onClose={() => setLookupOpen(false)} />}
                {upgradeModalOpen && <UpgradeModal onClose={() => setUpgradeModalOpen(false)} />}

                {previewSyllabus && (
                    <SyllabusPreviewModal
                        url={previewSyllabus.url}
                        trackName={previewSyllabus.name}
                        onClose={() => setPreviewSyllabus(null)}
                    />
                )}

                {/* Registration pop-up: Details -> Confirm -> Payment, sliding sideways. */}
                {registerOpen && (
                    <RegisterDialog step={stepFor(stage)} canClose={canClose} onClose={closeRegister}>
                        <form ref={formRef} onSubmit={handleConfirm} noValidate className="flex h-full flex-col">
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                                {!anyPriced && (
                                    <p className="mb-5 border-2 border-slate-900 bg-amber-100 p-3 font-mono text-xs font-black uppercase">
                                        Prices are yet to be announced. Payments open as soon as they are.
                                    </p>
                                )}
                                <ClosingDate className="mb-5" />

                                {/* Package first: it is what they came here to pick. */}
                                <fieldset data-field-wrap>
                                    <legend className="mb-2 font-mono text-xs font-black uppercase tracking-widest text-slate-700">1. Choose your track</legend>
                                    {softwareSeats.isPaused && (
                                        <div className="mb-4 border-2 border-slate-900 bg-amber-100 p-3 font-mono text-xs font-bold text-slate-800 space-y-1">
                                            <p className="font-black text-rose-700 uppercase">⏸ Registrations Temporarily Paused</p>
                                            <p>We are currently fixing a technical issue on the bank's side. Software track registrations will reopen tomorrow (Monday) morning at 8:00 AM and close Tuesday at 11:59 PM (or when 160 seats are reached).</p>
                                        </div>
                                    )}
                                    {powertrainSeats?.soldOut && !softwareSeats?.soldOut && !softwareSeats?.isPaused && (
                                        <div className="mb-3 border-2 border-slate-900 bg-amber-100 p-2.5 font-mono text-xs font-bold text-slate-800 space-y-1">
                                            <p className="font-black text-rose-700 uppercase">⚡ Powertrain seats are filled!</p>
                                            <p>Only the Software &amp; Autonomous Systems track is currently available. Learn ROS, Computer Vision, and autonomous algorithms. Stay tuned for future workshops by our team!</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {WORKSHOP_PACKAGES.map((pkg, index) => {
                                            const selected = form.package === pkg.id;
                                            const isCombo = pkg.id === COMBO_PACKAGE?.id;
                                            const trackSeats = pkg.id === 'powertrain' ? powertrainSeats : pkg.id === 'software' ? softwareSeats : comboSeats;
                                            const badgeInfo = getSeatBadgeInfo(trackSeats);
                                            const isSoldOut = badgeInfo?.isSoldOut;
                                            const isPaused = softwareSeats.isPaused && (pkg.id === 'software' || pkg.id === 'combo');
                                            const isOptionDisabled = isSoldOut || isPaused;

                                            return (
                                                <label
                                                    key={pkg.id}
                                                    className={`press flex min-h-14 items-center justify-between gap-3 border-2 p-3.5 ${
                                                        isOptionDisabled
                                                            ? 'opacity-60 bg-slate-100 border-slate-300 cursor-not-allowed'
                                                            : 'cursor-pointer ' + (fieldErrors.package ? 'border-red-600' : 'border-slate-950') + ' ' + (selected ? 'bg-amber-300 shadow-[4px_4px_0px_#0f172a]' : 'bg-slate-50 hover:bg-amber-50')
                                                    }`}
                                                >
                                                    <span className="flex min-w-0 items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="package"
                                                            value={pkg.id}
                                                            checked={selected}
                                                            disabled={isOptionDisabled}
                                                            onChange={() => !isOptionDisabled && updateField('package', pkg.id)}
                                                            data-field={index === 0 ? 'package' : undefined}
                                                            className="h-5 w-5 shrink-0 accent-slate-900 disabled:opacity-40"
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="mb-1 flex flex-wrap gap-1.5 items-center">
                                                                {isCombo && (
                                                                    <>
                                                                        <span className="border-2 border-slate-900 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase text-amber-300">★ Recommended</span>
                                                                        {COMBO_SAVING > 0 && (
                                                                            <span className="border-2 border-slate-900 bg-green-400 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase text-slate-900">Save {formatAmount(COMBO_SAVING)}</span>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {/* Show seats left badge for both tracks and combo */}
                                                                {badgeInfo && (
                                                                    <span className={`border-2 border-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase ${
                                                                        isSoldOut
                                                                            ? 'bg-rose-500 text-white'
                                                                            : badgeInfo.isPaused
                                                                                ? 'bg-amber-300 text-slate-950'
                                                                                : 'bg-amber-400 text-slate-950'
                                                                    }`}>
                                                                        {isSoldOut ? 'Sold Out' : badgeInfo.text}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="block text-sm font-black uppercase">
                                                                {pkg.name}
                                                                {isSoldOut && <span className="ml-2 text-xs font-black text-rose-600">(SOLD OUT)</span>}
                                                                {isPaused && !isSoldOut && <span className="ml-2 text-xs font-black text-amber-700">(PAUSED)</span>}
                                                            </span>
                                                            {pkg.tracksIncluded.length > 1 && (
                                                                <span className="block font-mono text-[11px] font-bold text-slate-600">
                                                                    {pkg.tracksIncluded.map(id => WORKSHOP_TRACKS[id].name).join(' + ')}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 text-right font-mono">
                                                        {isCombo && (
                                                            <span className="block text-xs font-bold text-slate-500 line-through">2,000</span>
                                                        )}
                                                        <span className="text-base font-black sm:text-lg">{formatPrice(pkg)}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {fieldErrors.package && <p className="mt-2 font-mono text-xs font-black text-red-600">{fieldErrors.package}</p>}
                                </fieldset>

                                <p className="mb-2 mt-6 font-mono text-xs font-black uppercase tracking-widest text-slate-700">2. Your details</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="Full name" error={fieldErrors.name}>
                                        <input data-field="name" className={inputClass(fieldErrors.name)} value={form.name} onChange={e => updateField('name', e.target.value)} autoComplete="name" autoCapitalize="words" enterKeyHint="next" maxLength={100} placeholder="As on your ID card" />
                                    </Field>
                                    <Field label="Registered number" error={fieldErrors.rollNo}>
                                        <input data-field="rollNo" className={inputClass(fieldErrors.rollNo)} value={form.rollNo} onChange={e => updateField('rollNo', e.target.value)} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="next" maxLength={40} placeholder="College register number" />
                                    </Field>
                                    <Field label="Department" error={fieldErrors.department}>
                                        <select data-field="department" className={inputClass(fieldErrors.department)} value={form.department} onChange={e => updateField('department', e.target.value)}>
                                            <option value="" disabled>Select department</option>
                                            {WORKSHOP_DEPARTMENTS.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Year" error={fieldErrors.year}>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['1', '2'].map(y => (
                                                <button
                                                    key={y}
                                                    type="button"
                                                    onClick={() => updateField('year', y)}
                                                    aria-pressed={form.year === y}
                                                    data-field={y === '1' ? 'year' : undefined}
                                                    className={`press min-h-12 border-2 p-3 font-mono text-sm font-black uppercase ${fieldErrors.year ? 'border-red-600' : 'border-slate-950'
                                                        } ${form.year === y ? 'bg-sky-500 text-white' : fieldErrors.year ? 'bg-red-50 hover:bg-sky-100' : 'bg-slate-50 hover:bg-sky-100'
                                                        }`}
                                                >
                                                    {y === '1' ? '1st year' : '2nd year'}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label="College Email ID" error={fieldErrors.email}>
                                        <input data-field="email" type="email" inputMode="email" className={inputClass(fieldErrors.email)} value={form.email} onChange={e => updateField('email', e.target.value)} autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" maxLength={254} placeholder="yourname@psgitech.ac.in" />
                                    </Field>
                                    <Field label="Phone" error={fieldErrors.phone}>
                                        <input data-field="phone" type="tel" inputMode="tel" className={inputClass(fieldErrors.phone)} value={form.phone} onChange={e => updateField('phone', e.target.value)} autoComplete="tel" enterKeyHint="done" maxLength={20} placeholder="10-digit mobile number" />
                                    </Field>
                                </div>
                            </div>

                            {/* Pinned to the bottom so the button is always in thumb reach. */}
                            <div className="relative border-t-4 border-slate-900 bg-slate-50 p-3 sm:p-4">
                                {upsellOpen && stage === 'form' && (
                                    <UpsellPopover
                                        offer={upsellFor(selectedPkg, {
                                            powertrainSoldOut: powertrainSeats.soldOut,
                                            softwareSoldOut: softwareSeats.soldOut,
                                            softwarePaused: softwareSeats.isPaused
                                        })}
                                        onAccept={acceptUpsell}
                                        onDecline={() => { setUpsellOpen(false); setStage('review'); }}
                                        onDismiss={() => setUpsellOpen(false)}
                                    />
                                )}
                                {error && stage === 'form' && (
                                    <p className="mb-3 border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700">{error}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={softwareSeats.isPaused}
                                    className={`press min-h-12 w-full border-2 border-slate-900 px-5 py-3.5 font-mono text-sm font-black uppercase ${
                                        softwareSeats.isPaused
                                            ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                                            : 'bg-slate-900 text-amber-300 shadow-[4px_4px_0px_#0284c7] hover:bg-slate-800'
                                    }`}
                                >
                                    {softwareSeats.isPaused ? '⏸ Registrations Reopen Monday 8:00 AM' : 'Review & continue →'}
                                </button>
                            </div>
                        </form>

                        <ReviewPanel
                            form={form}
                            pkg={selectedPkg}
                            error={stage === 'review' || stage === 'paying' ? error : ''}
                            busy={stage === 'paying'}
                            upgradePrompt={upgradePrompt}
                            upgradeBusy={upgradeBusy}
                            onUpgrade={handleUpgrade}
                            onEdit={() => { setError(''); setUpgradePrompt(null); setStage('form'); }}
                            onPay={handlePay}
                        />

                        <PaymentPanel
                            stage={stage}
                            registration={registration}
                            form={form}
                            onUpgrade={handleUpgrade}
                            upgradeBusy={upgradeBusy}
                            onRegisterAnother={resetForm}
                            onClose={closeRegister}
                        />
                    </RegisterDialog>
                )}
            </main>
        </div>
    );
}

function TrackDetail({ track, powertrainSeats, softwareSeats, onRegister, onOpenUpgrade, onPreviewSyllabus }) {
    const isSoftware = track.id === 'software';
    const isPowertrain = track.id === 'powertrain';
    const otherTrackName = isSoftware ? 'Powertrain' : 'Software';
    const trackSeats = isPowertrain ? powertrainSeats : softwareSeats;
    const badgeInfo = getSeatBadgeInfo(trackSeats);

    const comboSeats = {
        seatsLeft: (powertrainSeats?.seatsLeft !== null && softwareSeats?.seatsLeft !== null)
            ? Math.min(powertrainSeats.seatsLeft, softwareSeats.seatsLeft)
            : (powertrainSeats?.seatsLeft ?? softwareSeats?.seatsLeft ?? null),
        soldOut: Boolean(powertrainSeats?.soldOut || softwareSeats?.soldOut || softwareSeats?.isPaused),
        isPaused: softwareSeats?.isPaused
    };
    const comboBadgeInfo = getSeatBadgeInfo(comboSeats);

    const facts = [
        ['Dates', track.dates],
        ['Schedule', track.days],
        ['Timing', track.timing],
        ['Price', formatPrice(WORKSHOP_PACKAGES.find(p => p.id === track.id))]
    ];

    if (badgeInfo) {
        facts.push([
            'Seats Left',
            badgeInfo.fullText
        ]);
    }

    const hasSyllabus = Boolean(track.syllabus);
    const isImageKit = typeof track.syllabus === 'string' && track.syllabus.includes('ik.imagekit.io');
    const downloadUrl = isImageKit
        ? `${track.syllabus}${track.syllabus.includes('?') ? '&' : '?'}ik-attachment=true`
        : track.syllabus;

    return (
        <article className="mt-8 border-4 border-slate-900 bg-white p-5 shadow-[8px_8px_0px_#0f172a] sm:p-8 anim-pop" role="tabpanel">
            <h3 className="text-2xl font-black uppercase sm:text-4xl">{track.name}</h3>
            {track.tagline && (
                <p className="mt-2 text-base font-bold text-sky-700 sm:text-lg">{track.tagline}</p>
            )}

            {/* Prominent seat limit display */}
            {badgeInfo && (
                <div className="mt-4 flex items-center gap-2.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 border-2 border-slate-900 px-3.5 py-1.5 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#0f172a] ${
                        badgeInfo.isSoldOut
                            ? 'bg-rose-500 text-white'
                            : badgeInfo.isPaused
                                ? 'bg-amber-300 text-slate-950'
                                : 'bg-amber-300 text-slate-950'
                    }`}>
                        <span>{badgeInfo.isSoldOut ? '🚫' : badgeInfo.isPaused ? '⏸' : '⚡'}</span>
                        <span>{badgeInfo.isSoldOut ? 'SOLD OUT' : badgeInfo.text.toUpperCase()}</span>
                    </span>
                </div>
            )}

            {/* When Software is paused for technical issue */}
            {isSoftware && softwareSeats?.isPaused && (
                <div className="mt-5 border-3 border-slate-900 bg-amber-100 p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="border-2 border-slate-900 bg-rose-500 text-white px-2 py-0.5 font-mono text-[11px] font-black uppercase">
                            ⏸ Registrations Temporarily Paused
                        </span>
                        <span className="border-2 border-slate-900 bg-slate-900 text-amber-300 px-2 py-0.5 font-mono text-[11px] font-black uppercase">
                            ⚡ Reopens Monday 8:00 AM
                        </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black uppercase text-slate-900">
                        Fixing a technical issue on the bank's side
                    </h4>
                    <p className="text-xs sm:text-sm font-bold leading-relaxed text-slate-700">
                        We are currently resolving a technical issue on our banking partner's end. Software &amp; Autonomous Systems registrations will reopen tomorrow (Monday) morning at 8:00 AM and will remain open until Tuesday, 6 October at 11:59 PM (or when our 160-seat capacity is reached, whichever comes first).
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-700">
                        ★ Current count: 145 / 160 seats filled · <strong className="text-slate-950 font-black">Only {softwareSeats.seatsLeft ?? 15} seats remaining</strong>. Be ready when the window reopens!
                    </p>
                </div>
            )}

            {/* When Powertrain is full: display prominent notice that only Software is available, encourage registering for Software, and stay tuned note */}
            {isPowertrain && powertrainSeats?.soldOut && (
                <div className="mt-5 border-3 border-slate-900 bg-amber-100 p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="border-2 border-slate-900 bg-rose-500 text-white px-2 py-0.5 font-mono text-[11px] font-black uppercase">
                            ✕ Powertrain Track Sold Out
                        </span>
                        <span className="border-2 border-slate-900 bg-slate-900 text-amber-300 px-2 py-0.5 font-mono text-[11px] font-black uppercase">
                            ⚡ Software Track Reopens Mon 8 AM
                        </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black uppercase text-slate-900">
                        Powertrain seats are completely filled!
                    </h4>
                    <p className="text-xs sm:text-sm font-bold leading-relaxed text-slate-700">
                        Missed a seat in Powertrain? Don't worry — the <strong className="text-slate-950">Software &amp; Autonomous Systems</strong> track reopens tomorrow (Monday) at 8:00 AM! Understanding perception stacks, ROS navigation, and real-time computer vision is what brings vehicle electronics and motors to life. Mastering the software layer gives you the complete picture of how autonomous machines think and act.
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-600">
                        ★ Stay tuned for future workshops and bootcamps by our team.
                    </p>
                    <div className="pt-1 flex flex-wrap gap-2.5">
                        <button
                            type="button"
                            onClick={() => onRegister('software')}
                            className="press border-2 border-slate-900 bg-slate-900 px-4 py-2 font-mono text-xs font-black uppercase text-amber-300 shadow-[3px_3px_0px_#0284c7] hover:bg-slate-800 cursor-pointer"
                        >
                            View Software Track →
                        </button>
                        <button
                            type="button"
                            onClick={onOpenUpgrade}
                            className="press border-2 border-slate-900 bg-amber-400 px-4 py-2 font-mono text-xs font-black uppercase text-slate-950 shadow-[3px_3px_0px_#0f172a] hover:bg-amber-300 cursor-pointer"
                        >
                            ★ Already in Powertrain? Upgrade to Combo (₹750)
                        </button>
                    </div>
                </div>
            )}

            <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-slate-600 sm:text-base">{track.overview}</p>
            {track.highlight && (
                <p className="mt-4 inline-block border-2 border-slate-900 bg-green-400 px-3 py-1.5 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#0f172a]">
                    ⏱ {track.highlight}
                </p>
            )}

            <dl className={`mt-6 grid grid-cols-2 gap-3 ${badgeInfo ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                {facts.map(([label, value]) => (
                    <div key={label} className={`border-2 border-slate-900 p-3 ${label === 'Price' ? 'bg-amber-300' : label === 'Seats Left' ? (badgeInfo?.isSoldOut ? 'bg-rose-100' : 'bg-amber-100') : 'bg-sky-50'}`}>
                        <dt className="font-mono text-[10px] font-black uppercase tracking-widest text-slate-600">{label}</dt>
                        <dd className={`mt-1 text-sm font-black ${label === 'Seats Left' && badgeInfo?.isSoldOut ? 'text-rose-600' : ''}`}>{value}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-3 font-mono text-xs font-bold text-slate-600">{track.audience}</p>

            <h4 className="mt-6 font-mono text-xs font-black uppercase tracking-widest text-sky-600">What you will learn</h4>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">
                {track.topics.map(topic => topic.title).join(' · ')}.
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">Full topic list, weekly lab breakdown, and milestone schedule in the syllabus PDF.</p>

            {/* Simplified Curriculum Document Card: title alone, one download button, no description */}
            {hasSyllabus && (
                <div className="mt-6 border-3 border-slate-900 bg-sky-50 p-3.5 sm:p-4 shadow-[4px_4px_0px_#0f172a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-sm sm:text-base font-black uppercase text-slate-900">
                        {track.name} Syllabus &amp; Weekly Plan
                    </h4>
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={`${track.id}_syllabus.pdf`}
                        className="press border-2 border-slate-900 bg-slate-900 px-4 py-2 font-mono text-xs font-black uppercase text-amber-300 shadow-[2px_2px_0px_#0284c7] hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 no-underline cursor-pointer shrink-0"
                    >
                        <span>Download Syllabus</span>
                        <span>↓</span>
                    </a>
                </div>
            )}

            {/* Handbook & guided resources note */}
            <div className="mt-5 inline-flex items-center gap-2 border-2 border-slate-900 bg-sky-50 px-3.5 py-2 font-mono text-xs font-black uppercase text-slate-900 shadow-[2px_2px_0px_#0f172a]">
                <span className="text-sky-600">✦</span>
                <span>Handbook + guided resources included.</span>
            </div>

            {/* Cross-track combo offer card */}
            <div className="mt-6 border-3 border-dashed border-slate-900 bg-amber-50 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-900">
                                ★ Dual-Track Bundle Discount
                            </span>
                            {comboBadgeInfo && (
                                <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 border ${
                                    comboBadgeInfo.isSoldOut ? 'bg-rose-500 text-white border-rose-700' : 'bg-amber-300 text-slate-900 border-slate-900'
                                }`}>
                                    {comboBadgeInfo.isSoldOut ? (softwareSeats?.isPaused ? 'Paused ⏸' : 'Combo Full') : comboBadgeInfo.text}
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-base sm:text-lg font-black uppercase text-slate-900">
                            Want both tracks? Add {otherTrackName} for just 750 more →
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                            Get Software + Powertrain for 1,750 (Save 250). Includes both full tracks and all bonus sessions.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={onOpenUpgrade}
                            className="press shrink-0 border-2 border-slate-900 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#0f172a] cursor-pointer"
                        >
                            ★ Upgrade to Combo (₹750)
                        </button>
                        <button
                            type="button"
                            onClick={() => onRegister('combo')}
                            disabled={comboSeats.soldOut}
                            className={`press shrink-0 border-2 border-slate-900 px-4 py-2.5 font-mono text-xs font-black uppercase shadow-[3px_3px_0px_#0f172a] ${
                                comboSeats.soldOut
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-amber-300 text-slate-900 hover:bg-amber-400 cursor-pointer'
                            }`}
                        >
                            {comboSeats.soldOut ? (softwareSeats?.isPaused ? 'Paused ⏸' : 'Combo Sold Out ✕') : 'Get Combo (1,750) ✦'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => onRegister(track.id)}
                    disabled={badgeInfo?.isSoldOut || trackSeats?.isPaused}
                    className={`press border-2 border-slate-900 px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#0f172a] ${
                        badgeInfo?.isSoldOut || trackSeats?.isPaused
                            ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                            : 'bg-amber-300 hover:bg-amber-400 cursor-pointer text-slate-900'
                    }`}
                >
                    {trackSeats?.isPaused ? '⏸ Paused · Reopens Mon 8 AM' : badgeInfo?.isSoldOut ? 'Sold Out ✕' : 'Register ✦'}
                </button>
                <button
                    type="button"
                    onClick={onOpenUpgrade}
                    className="press border-2 border-slate-900 bg-amber-400 px-5 py-3 font-mono text-xs font-black uppercase text-slate-950 shadow-[4px_4px_0px_#0f172a] hover:bg-amber-300 cursor-pointer flex items-center gap-1.5"
                >
                    <span>★ Upgrade to Combo (₹750)</span>
                </button>
            </div>
            <p className="mt-4 font-mono text-[10px] font-bold uppercase text-slate-500">
                * Syllabus, schedule and other details are subject to change.
            </p>
        </article>
    );
}

function SyllabusPreviewModal({ url, trackName, onClose }) {
    useModal(true, onClose);
    if (!url) return null;

    const isImageKit = typeof url === 'string' && url.includes('ik.imagekit.io');
    const downloadUrl = isImageKit
        ? `${url}${url.includes('?') ? '&' : '?'}ik-attachment=true`
        : url;

    return createPortal(
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-2 sm:p-6 anim-fade"
            onClick={onClose}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={`${trackName} Syllabus PDF Preview`}
        >
            <div
                className="anim-pop-center flex h-[94dvh] w-full max-w-5xl flex-col border-4 border-slate-900 bg-white shadow-[8px_8px_0px_#0f172a]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b-4 border-slate-900 bg-slate-900 px-4 py-3 text-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="border border-amber-300 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-900">
                            Syllabus Viewer
                        </span>
                        <h3 className="truncate font-mono text-sm font-black uppercase text-white sm:text-base">
                            {trackName} • Curriculum PDF
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="press hidden sm:inline-flex items-center gap-1 border-2 border-white bg-sky-500 px-3 py-1 font-mono text-xs font-black uppercase text-white shadow-[2px_2px_0px_#fff] hover:bg-sky-600 no-underline cursor-pointer"
                        >
                            Open in New Tab ↗
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="press flex h-8 w-8 items-center justify-center border-2 border-white bg-rose-500 font-mono text-sm font-bold text-white hover:bg-rose-600 cursor-pointer"
                            aria-label="Close Preview"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Frame */}
                <div className="relative flex-1 bg-slate-100 overflow-hidden">
                    <iframe
                        src={`${url}#toolbar=1&navpanes=0`}
                        title={`${trackName} Syllabus PDF`}
                        className="w-full h-full border-none"
                    />
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-4 border-slate-900 bg-amber-100 px-4 py-2.5">
                    <p className="font-mono text-xs font-bold text-slate-700 truncate">
                        Official Team Asterix workshop curriculum and milestone plan.
                    </p>
                    <div className="flex items-center gap-2">
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={`${trackName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_syllabus.pdf`}
                            className="press border-2 border-slate-900 bg-white px-3 py-1 font-mono text-xs font-black uppercase text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-sky-100 no-underline cursor-pointer"
                        >
                            Download PDF ↓
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="press border-2 border-slate-900 bg-slate-900 px-3.5 py-1 font-mono text-xs font-black uppercase text-white hover:bg-slate-800 cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

function Field({ label, error, children }) {
    return (
        <label className="block" data-field-wrap>
            <span className="mb-1.5 block font-mono text-xs font-black uppercase tracking-widest text-slate-700">{label}</span>
            {children}
            {error && <span className="mt-1 block font-mono text-xs font-black text-red-600">{error}</span>}
        </label>
    );
}

function ClosingDate({ className = '', dark = false }) {
    return (
        <p className={`inline-flex flex-wrap items-center gap-2 border-2 px-3 py-1.5 font-mono text-xs font-black uppercase ${dark ? 'border-amber-300 text-amber-300' : 'border-slate-900 bg-white text-slate-900'
            } ${className}`}>
            <span aria-hidden="true">⏳</span>
            <span>Software Reopens Mon 8:00 AM · Closes Tue 11:59 PM (or at 160 seats)</span>
        </p>
    );
}

/* Small card that rises out of the Review & continue button when one track is
   picked. It sits inside the pop-up footer, so the form stays visible. */
function UpsellPopover({ offer, onAccept, onDecline, onDismiss }) {
    if (!offer) return null;
    return (
        <div
            role="dialog"
            aria-label="Add the other track"
            className="anim-pop absolute bottom-full right-3 left-3 z-10 mb-2 border-4 border-slate-900 bg-white p-4 shadow-[6px_6px_0px_#16a34a] sm:left-auto sm:right-4 sm:w-96"
        >
            <button type="button" onClick={onDismiss} aria-label="Close offer" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center font-black text-slate-500 hover:text-slate-900">
                ✕
            </button>
            <span className="inline-block border-2 border-slate-900 bg-green-400 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase">
                Save {formatAmount(COMBO_SAVING)}
            </span>
            <p className="mt-2 pr-6 text-base font-black uppercase leading-tight">
                Only {formatAmount(offer.extra)} more for {offer.other.name}
            </p>
            <p className="mt-1.5 text-sm font-bold text-slate-600">
                Get both tracks for {formatPrice(COMBO_PACKAGE)}. This {formatAmount(COMBO_SAVING)} saving is lost if you don’t add it now.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={onAccept} className="press min-h-11 border-2 border-slate-900 bg-green-400 px-3 py-2 font-mono text-[11px] font-black uppercase shadow-[3px_3px_0px_#0f172a] hover:bg-green-300">
                    Add both →
                </button>
                <button type="button" onClick={onDecline} className="press min-h-11 border-2 border-slate-900 bg-white px-3 py-2 font-mono text-[11px] font-black uppercase hover:bg-slate-100">
                    Continue with one
                </button>
            </div>
            {/* Arrow pointing down at the button. */}
            <span aria-hidden="true" className="absolute -bottom-[11px] right-10 h-4 w-4 rotate-45 border-b-4 border-r-4 border-slate-900 bg-white" />
        </div>
    );
}

/* Full-screen sheet on phones, centred card from sm up. The three children are
   laid side by side and the row slides left one slide per step; each slide
   scrolls on its own, so the buttons pinned at the bottom never move. */
// Page behind a pop-up stays still; Escape closes it when allowed.
function useModal(canClose, onClose) {
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.lenis?.stop();
        return () => {
            document.body.style.overflow = prevOverflow;
            window.lenis?.start();
        };
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && canClose) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [canClose, onClose]);
}

function RegisterDialog({ step, canClose, onClose, children }) {
    const slides = Array.isArray(children) ? children : [children];
    const slideRefs = useRef([]);
    useModal(canClose, onClose);

    // Keyboard / screen-reader focus follows the slide that is showing.
    useEffect(() => {
        slideRefs.current[step]?.focus({ preventScroll: true });
    }, [step]);

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm anim-fade sm:p-6"
            onClick={() => { if (canClose) onClose(); }}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-labelledby="workshop-register-title"
        >
            <div
                className="anim-pop-center flex h-[100dvh] w-full flex-col bg-white sm:h-[min(88vh,780px)] sm:max-w-2xl sm:border-4 sm:border-slate-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
                    <div className="min-w-0">
                        <span className="block font-mono text-[10px] font-black uppercase tracking-widest text-amber-300">Workshop 2026</span>
                        <h2 id="workshop-register-title" className="truncate text-base font-black uppercase sm:text-lg">Register for the workshop</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={!canClose}
                        aria-label="Close registration"
                        className="press press-flat flex h-9 w-9 shrink-0 items-center justify-center border-2 border-white bg-rose-500 font-sans text-base font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                <ol className="grid grid-cols-3 border-b-4 border-slate-900 font-mono text-[11px] font-black uppercase">
                    {STEPS.map((label, i) => (
                        <li
                            key={label}
                            aria-current={i === step ? 'step' : undefined}
                            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 transition-colors ${i > 0 ? 'border-l-2 border-slate-900' : ''} ${i === step ? 'bg-amber-300 text-slate-900' : i < step ? 'bg-sky-100 text-slate-700' : 'bg-white text-slate-400'
                                }`}
                        >
                            <span>{i < step ? '✓' : i + 1}</span>
                            <span>{label}</span>
                        </li>
                    ))}
                </ol>

                <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div
                        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
                        style={{ width: `${slides.length * 100}%`, transform: `translateX(-${(step * 100) / slides.length}%)` }}
                    >
                        {slides.map((slide, i) => (
                            <div
                                key={i}
                                ref={el => { slideRefs.current[i] = el; }}
                                tabIndex={-1}
                                inert={i !== step}
                                aria-hidden={i !== step}
                                className="h-full min-w-0 outline-none"
                                style={{ width: `${100 / slides.length}%` }}
                            >
                                {slide}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

function ReviewPanel({ form, pkg, error, busy, upgradePrompt, upgradeBusy, onUpgrade, onEdit, onPay }) {
    const rows = [
        ['Name', form.name],
        ['Registered number', form.rollNo],
        ['Department', form.department],
        ['Year', form.year === '1' ? '1st year' : '2nd year'],
        ['Email', form.email],
        ['Phone', normalizePhone(form.phone)],
        ['Track', pkg?.name]
    ];

    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                {upgradePrompt ? (
                    <div className="mb-4 border-3 border-amber-900 bg-amber-100 p-4 shadow-[4px_4px_0px_#0f172a]">
                        <div className="flex items-center gap-2">
                            <span className="border-2 border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-amber-300">
                                ★ Already Enrolled
                            </span>
                        </div>
                        <h3 className="mt-2 text-base font-black uppercase text-slate-900">
                            You are already registered for {upgradePrompt.existingPackage?.toUpperCase() || 'one track'}!
                        </h3>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-slate-700">
                            Want to attend both tracks for complete domain knowledge? You can upgrade your seat to the Dual-Track Combo now for only {upgradePrompt.upgradePrice || 750}.
                        </p>
                        <button
                            type="button"
                            disabled={upgradeBusy || busy}
                            onClick={() => onUpgrade?.(upgradePrompt.registrationId, { name: form.name, email: form.email, contact: form.phone })}
                            className="press mt-3 min-h-12 w-full border-2 border-slate-900 bg-amber-400 hover:bg-amber-300 px-4 py-3 font-mono text-xs font-black uppercase text-slate-950 shadow-[3px_3px_0px_#0f172a] disabled:opacity-60"
                        >
                            {upgradeBusy ? 'Opening Upgrade Payment…' : `Pay ${upgradePrompt.upgradePrice || 750} & Upgrade to Combo ✦`}
                        </button>
                    </div>
                ) : null}

                <p className="font-mono text-xs font-black uppercase tracking-widest text-sky-600">Check your details before paying</p>
                <dl className="mt-3 divide-y-2 divide-slate-200 border-2 border-slate-900">
                    {rows.map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-3 p-3 sm:grid-cols-[9rem_1fr]">
                            <dt className="font-mono text-xs font-black uppercase text-slate-500">{label}</dt>
                            <dd className="min-w-0 break-words text-sm font-black">{value}</dd>
                        </div>
                    ))}
                    <div className="grid grid-cols-[6.5rem_1fr] gap-3 bg-amber-300 p-3 sm:grid-cols-[9rem_1fr]">
                        <dt className="font-mono text-xs font-black uppercase">Amount</dt>
                        <dd className="font-mono text-lg font-black">
                            {formatPrice(pkg)}
                            {pkg?.id === COMBO_PACKAGE?.id && COMBO_SAVING > 0 && (
                                <span className="ml-2 border-2 border-slate-900 bg-green-400 px-1.5 py-0.5 align-middle text-[10px] uppercase">You save {formatAmount(COMBO_SAVING)}</span>
                            )}
                        </dd>
                    </div>
                </dl>
                <p className="mt-4 font-mono text-[10px] font-bold uppercase text-slate-500">
                    Payments are processed by Razorpay. Team Asterix never sees your card or UPI details.
                </p>
            </div>

            <div className="border-t-4 border-slate-900 bg-slate-50 p-3 sm:p-4">
                {error && <p className="mb-3 border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700">{error}</p>}
                <div className="grid grid-cols-[auto_1fr] gap-3">
                    <button type="button" onClick={onEdit} disabled={busy || upgradeBusy} className="press min-h-12 border-2 border-slate-900 bg-white px-4 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#0f172a] hover:bg-sky-100 disabled:opacity-50">
                        ← Edit
                    </button>
                    <button type="button" onClick={onPay} disabled={busy || upgradeBusy || !PAYMENTS_ENABLED} className="press min-h-12 border-2 border-slate-900 bg-sky-500 px-5 py-3 font-mono text-sm font-black uppercase text-white shadow-[4px_4px_0px_#0f172a] hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-sky-500">
                        {busy ? 'Opening payment…' : `Pay ${formatPrice(pkg)} →`}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* Slide 3. Razorpay Checkout opens as its own secure window on top of this
   slide (it cannot be embedded), so while it is open this slide says so;
   once the payment is confirmed it becomes the receipt. */
function PaymentPanel({ stage, registration, form, onUpgrade, upgradeBusy, onRegisterAnother, onClose }) {
    if (stage === 'success' && registration) {
        return <ReceiptPanel registration={registration} form={form} onUpgrade={onUpgrade} upgradeBusy={upgradeBusy} onRegisterAnother={onRegisterAnother} onClose={onClose} />;
    }
    if (stage === 'unconfirmed') {
        return (
            <StatusCard
                title="Payment is still being confirmed"
                body={`If money was deducted, your registration will be confirmed automatically within a few minutes. Do not pay again. If it still is not confirmed, contact the team with this reference: ${registration?.registrationId}.`}
            />
        );
    }
    if (stage === 'verifying') {
        return <StatusCard busy title="Confirming your payment…" body="Hold on, this only takes a few seconds. Please do not close this page." />;
    }
    return (
        <StatusCard
            busy={stage === 'paying'}
            title="Secure payment"
            body="Complete your payment in the Razorpay window. Your receipt appears here as soon as it is confirmed."
        />
    );
}

const WHATSAPP_GROUPS = {
    software: {
        name: 'Software & Perception',
        url: 'https://chat.whatsapp.com/F53PZl3LzGh34OFL1aDqgh'
    },
    powertrain: {
        name: 'Electronics & Powertrain',
        url: 'https://chat.whatsapp.com/K6wPojX4IeF6SQmMTW8Xro'
    }
};

function WhatsAppGroupInvite({ pkgId, tracksEnrolled = [] }) {
    const isCombo = pkgId === 'combo' || (Array.isArray(tracksEnrolled) && tracksEnrolled.includes('software') && tracksEnrolled.includes('powertrain'));
    const hasSoftware = isCombo || pkgId === 'software' || tracksEnrolled?.includes('software');
    const hasPowertrain = isCombo || pkgId === 'powertrain' || tracksEnrolled?.includes('powertrain');

    return (
        <div className="mt-4 border-3 border-slate-900 bg-emerald-50 p-4 shadow-[4px_4px_0px_#0f172a]">
            <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 font-mono text-xs font-black text-white">
                    💬
                </span>
                <span className="font-mono text-xs font-black uppercase tracking-wider text-emerald-950">
                    Official WhatsApp Group{isCombo ? 's' : ''}
                </span>
            </div>
            <p className="mt-1.5 text-xs font-bold leading-relaxed text-slate-700">
                All future updates, meeting links, lab reporting instructions, and study materials will be shared here. Please join your track group:
            </p>

            <div className="mt-3 flex flex-col gap-2">
                {hasSoftware && (
                    <a
                        href={WHATSAPP_GROUPS.software.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press flex items-center justify-between border-2 border-slate-900 bg-[#25D366] hover:bg-[#20bd5a] px-3.5 py-2.5 font-mono text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_#0f172a] no-underline"
                    >
                        <span>Join Software &amp; Perception Group →</span>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">WhatsApp ↗</span>
                    </a>
                )}
                {hasPowertrain && (
                    <a
                        href={WHATSAPP_GROUPS.powertrain.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press flex items-center justify-between border-2 border-slate-900 bg-[#25D366] hover:bg-[#20bd5a] px-3.5 py-2.5 font-mono text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_#0f172a] no-underline"
                    >
                        <span>Join Electronics &amp; Powertrain Group →</span>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">WhatsApp ↗</span>
                    </a>
                )}
            </div>
        </div>
    );
}

function ReceiptPanel({ registration, form, onUpgrade, upgradeBusy, onRegisterAnother, onClose }) {
    /* The server's public view has no roll number, department or phone, so
       those come from the form just submitted (it is not cleared on success). */
    const isCombo = registration.package === 'combo' || (Array.isArray(registration.tracksEnrolled) && registration.tracksEnrolled.includes('software') && registration.tracksEnrolled.includes('powertrain'));
    const rows = receiptRows({
        ...registration,
        name: registration.name || form.name,
        email: registration.email || form.email,
        rollNo: form.rollNo,
        department: form.department,
        year: form.year,
        phone: normalizePhone(form.phone)
    });
    const fileId = registration.receiptNo || registration.registrationId;

    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                <div className="border-4 border-slate-900 bg-white shadow-[6px_6px_0px_#16a34a]">
                    <div className="border-b-4 border-slate-900 bg-green-400 p-4 sm:p-5">
                        <span className="font-mono text-xs font-black uppercase tracking-widest">✓ Payment confirmed</span>
                        <p className="mt-1 text-2xl font-black uppercase">You’re in, {registration.name?.split(' ')[0]}!</p>
                    </div>
                    <dl className="divide-y-2 divide-slate-200">
                        {rows.map(([label, value]) => (
                            <div key={label} className={`grid grid-cols-[6.5rem_1fr] gap-3 p-3 sm:grid-cols-[9rem_1fr] ${label === 'Amount paid' ? 'bg-amber-300' : ''}`}>
                                <dt className="font-mono text-xs font-black uppercase text-slate-500">{label}</dt>
                                <dd className="min-w-0 break-words font-mono text-sm font-black">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <WhatsAppGroupInvite pkgId={registration.package || form.package} tracksEnrolled={registration.tracksEnrolled} />

                {/* Single-track upgrade promotion card */}
                {!isCombo && (
                    <div className="mt-4 border-3 border-amber-900 bg-amber-100 p-4 shadow-[4px_4px_0px_#0f172a]">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 font-mono text-xs font-black text-slate-900">
                                ★
                            </span>
                            <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-950">
                                Complete Domain Knowledge
                            </span>
                        </div>
                        <p className="mt-2 text-sm font-black uppercase text-slate-900">
                            Upgrade by paying 750 and get the second workshop track
                        </p>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-slate-700">
                            Gain complete domain knowledge across autonomous software (ROS, CV, AI) and powertrain engineering (circuits, microcontrollers, PCB design). You can upgrade right now or come back anytime later to upgrade.
                        </p>
                        <button
                            type="button"
                            disabled={upgradeBusy}
                            onClick={() => onUpgrade?.(registration.registrationId || registration._id, form)}
                            className="press mt-3 min-h-11 w-full border-2 border-slate-900 bg-amber-400 hover:bg-amber-300 px-4 py-2.5 font-mono text-xs font-black uppercase text-slate-950 shadow-[3px_3px_0px_#0f172a] disabled:opacity-60"
                        >
                            {upgradeBusy ? 'Opening Upgrade Payment…' : 'Upgrade to Combo (750) ✦'}
                        </button>
                        <p className="mt-2 font-mono text-[10px] font-bold text-slate-600 text-center">
                            💡 You can return anytime to upgrade by looking up your receipt on this site.
                        </p>
                    </div>
                )}

                <p className="mt-4 text-sm font-bold text-slate-600">
                    Keep your receipt handy. Session details will be shared with you before the workshop begins.
                </p>
            </div>

            <div className="border-t-4 border-slate-900 bg-slate-50 p-3 sm:p-4">
                <button
                    type="button"
                    onClick={() => downloadReceipt(rows, fileId)}
                    className="press min-h-12 w-full border-2 border-slate-900 bg-slate-900 px-5 py-3.5 font-mono text-sm font-black uppercase text-amber-300 shadow-[4px_4px_0px_#16a34a] hover:bg-slate-800"
                >
                    Download receipt ↓
                </button>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <button type="button" onClick={onRegisterAnother} className="press min-h-11 border-2 border-slate-900 bg-white px-3 py-2 font-mono text-[11px] font-black uppercase shadow-[3px_3px_0px_#0f172a] hover:bg-sky-100">
                        Register another
                    </button>
                    <button type="button" onClick={onClose} className="press min-h-11 border-2 border-slate-900 bg-amber-300 px-3 py-2 font-mono text-[11px] font-black uppercase shadow-[3px_3px_0px_#0f172a] hover:bg-amber-400">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Dedicated Upgrade Modal:
 * Allows students who registered for the single Powertrain track (or Software)
 * to pay ₹750 and upgrade directly to the Dual-Track Combo.
 */
function UpgradeModal({ onClose }) {
    const [lookupQuery, setLookupQuery] = useState('');
    const [busy, setBusy] = useState(false);
    const [upgradeBusy, setUpgradeBusy] = useState(false);
    const [error, setError] = useState('');
    const [foundRecord, setFoundRecord] = useState(null);
    const [successRecord, setSuccessRecord] = useState(null);
    useModal(true, onClose);

    const handleSearch = async (e) => {
        e.preventDefault();
        const q = lookupQuery.trim();
        if (!q) {
            setError('Please enter your College Roll No, Registration No, Email, or Phone.');
            return;
        }
        setBusy(true);
        setError('');
        setFoundRecord(null);
        setSuccessRecord(null);
        try {
            const { ok, data } = await postJson('/api/workshop/receipt-lookup', {
                query: q,
                rollNo: q,
                phone: q.replace(/\D/g, '').length >= 10 ? q : undefined,
                email: q.includes('@') ? q : undefined
            });
            if (ok && data.receipts?.length) {
                // Find single-track Powertrain or single-track Software registration
                const single = data.receipts.find(r => r.package === 'powertrain' || r.package === 'software');
                setFoundRecord(single || data.receipts[0]);
            } else {
                setError(data.error || 'No registered participant found with these details. Please double-check and try again.');
            }
        } catch {
            setError('Could not reach the server. Please check your internet connection.');
        } finally {
            setBusy(false);
        }
    };

    const handleUpgradePayment = async () => {
        if (!foundRecord) return;
        setUpgradeBusy(true);
        setError('');
        try {
            const { ok, data } = await postJson('/api/workshop/upgrade', {
                registrationId: foundRecord.registrationId
            });
            if (!ok) {
                setError(data.error || 'Failed to initiate upgrade checkout. Please try again.');
                setUpgradeBusy(false);
                return;
            }
            const loaded = await loadRazorpayCheckout();
            if (!loaded || !window.Razorpay) {
                setError('Could not open payment window. Please disable any popup/ad-blocker.');
                setUpgradeBusy(false);
                return;
            }
            const checkout = new window.Razorpay({
                key: data.keyId,
                order_id: data.order.id,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'Team Asterix',
                description: 'Dual-Track Combo Upgrade (₹750)',
                prefill: data.prefill,
                notes: { registrationId: data.registrationId, type: 'upgrade' },
                theme: { color: '#0ea5e9' },
                handler: async (response) => {
                    const verifyRes = await postJson('/api/workshop/verify', response);
                    if (verifyRes.ok && verifyRes.data.registration) {
                        setSuccessRecord({
                            ...foundRecord,
                            ...verifyRes.data.registration,
                            package: 'combo',
                            packageName: 'Dual-Track Combo',
                            tracksEnrolled: ['software', 'powertrain'],
                            amount: 1750
                        });
                        setFoundRecord(null);
                    } else {
                        setError(verifyRes.data?.error || 'Upgrade payment recorded but verification pending. Please refresh or contact support.');
                    }
                    setUpgradeBusy(false);
                },
                modal: {
                    ondismiss: () => {
                        setUpgradeBusy(false);
                    }
                }
            });
            checkout.on('payment.failed', (err) => {
                setError(err?.error?.description || 'Upgrade payment was cancelled or failed.');
                setUpgradeBusy(false);
            });
            checkout.open();
        } catch {
            setError('Could not connect to payment gateway. Please try again.');
            setUpgradeBusy(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm anim-fade sm:p-6"
            onClick={onClose}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
        >
            <div
                className="anim-pop-center flex max-h-[92dvh] w-full max-w-lg flex-col border-4 border-slate-900 bg-white shadow-[10px_10px_0px_#0284c7]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
                    <div className="min-w-0">
                        <span className="block font-mono text-[10px] font-black uppercase tracking-widest text-amber-300">
                            ★ Instant Workshop Upgrade
                        </span>
                        <h2 id="upgrade-modal-title" className="truncate text-base font-black uppercase sm:text-lg">
                            Upgrade to Dual-Track Combo
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="press press-flat flex h-9 w-9 shrink-0 items-center justify-center border-2 border-white bg-rose-500 font-sans text-base font-bold text-white hover:bg-rose-600 cursor-pointer"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                    {/* Success State */}
                    {successRecord ? (
                        <div className="space-y-4">
                            <div className="border-3 border-emerald-700 bg-emerald-50 p-4 text-emerald-950">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🎉</span>
                                    <h3 className="font-mono text-sm font-black uppercase">Upgrade Successful!</h3>
                                </div>
                                <p className="mt-1 text-xs font-bold text-emerald-800">
                                    You are now fully enrolled in the <strong className="font-black text-emerald-950">Dual-Track Combo (Software + Powertrain)</strong>. Your receipt has been updated to ₹1,750.
                                </p>
                            </div>

                            <dl className="divide-y-2 divide-slate-200 border-2 border-slate-900">
                                {receiptRows(successRecord).map(([label, value]) => (
                                    <div key={label} className={`grid grid-cols-[6.5rem_1fr] gap-3 p-2 sm:grid-cols-[8rem_1fr] ${label === 'Amount paid' ? 'bg-amber-300' : ''}`}>
                                        <dt className="font-mono text-[11px] font-black uppercase text-slate-500">{label}</dt>
                                        <dd className="min-w-0 break-words font-mono text-sm font-black">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            <WhatsAppGroupInvite pkgId="combo" tracksEnrolled={['software', 'powertrain']} />

                            <div className="pt-2 flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => downloadReceipt(receiptRows(successRecord), successRecord.receiptNo || successRecord.registrationId)}
                                    className="press min-h-12 w-full border-2 border-slate-900 bg-slate-900 px-5 py-3 font-mono text-sm font-black uppercase text-amber-300 shadow-[4px_4px_0px_#0284c7] hover:bg-slate-800 cursor-pointer"
                                >
                                    Download Upgraded Receipt ↓
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="press min-h-10 w-full border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase text-slate-900 hover:bg-slate-100 cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : foundRecord ? (
                        /* Found Registration State */
                        <div className="space-y-4">
                            {foundRecord.package === 'combo' || (Array.isArray(foundRecord.tracksEnrolled) && foundRecord.tracksEnrolled.includes('software') && foundRecord.tracksEnrolled.includes('powertrain')) ? (
                                <div className="border-3 border-sky-600 bg-sky-50 p-4">
                                    <span className="font-mono text-[11px] font-black uppercase text-sky-900 block mb-1">
                                        ✦ Already Enrolled in Combo
                                    </span>
                                    <p className="text-sm font-black text-slate-900">{foundRecord.name} ({foundRecord.rollNo})</p>
                                    <p className="text-xs font-bold text-slate-700 mt-1">
                                        You are already registered for the Dual-Track Combo package! No upgrade required.
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => downloadReceipt(receiptRows(foundRecord), foundRecord.receiptNo || foundRecord.registrationId)}
                                            className="press border-2 border-slate-900 bg-slate-900 text-amber-300 px-4 py-2 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_#0284c7] cursor-pointer"
                                        >
                                            Download Receipt ↓
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFoundRecord(null)}
                                            className="press border-2 border-slate-900 bg-white text-slate-900 px-3 py-2 font-mono text-xs font-black uppercase cursor-pointer"
                                        >
                                            Search another
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="border-3 border-slate-900 bg-amber-50 p-4 shadow-[3px_3px_0px_#0f172a]">
                                        <div className="flex items-center justify-between gap-2 border-b-2 border-slate-300 pb-2">
                                            <div>
                                                <p className="text-sm font-black uppercase text-slate-900">{foundRecord.name}</p>
                                                <p className="font-mono text-xs font-bold text-slate-600">Roll No: {foundRecord.rollNo}</p>
                                            </div>
                                            <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                                                Paid ₹{foundRecord.amount || 1000}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                                            <div className="border border-slate-200 bg-white p-2.5">
                                                <span className="text-[10px] font-black uppercase text-slate-500 block">Enrolled In</span>
                                                <strong className="text-slate-900 font-black block mt-0.5">
                                                    {foundRecord.package === 'powertrain' ? 'Electronics & Powertrain' : 'Software Track'}
                                                </strong>
                                                <span className="text-[10px] text-slate-600 block mt-1">Single Track</span>
                                            </div>
                                            <div className="border border-slate-900 bg-amber-300 p-2.5">
                                                <span className="text-[10px] font-black uppercase text-amber-950 block">Upgrading To</span>
                                                <strong className="text-slate-950 font-black block mt-0.5">Dual-Track Combo</strong>
                                                <span className="text-[10px] text-amber-950 font-bold block mt-1">Software + Powertrain</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost breakdown */}
                                    <div className="border-2 border-slate-900 bg-slate-900 text-white p-3.5 flex items-center justify-between">
                                        <div>
                                            <span className="font-mono text-[10px] font-black uppercase text-amber-300 block">Upgrade Amount</span>
                                            <span className="text-2xl font-black">₹750</span>
                                            <span className="font-mono text-[10px] text-slate-300 block">Total ₹1,750 Combo Value (Save ₹250)</span>
                                        </div>
                                        <div className="text-right font-mono text-[11px] text-emerald-400 font-bold">
                                            ⚡ Instant Confirmation<br />
                                            Claims 1 of 15 Software Seats
                                        </div>
                                    </div>

                                    {error && <p className="border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700" role="alert">{error}</p>}

                                    <button
                                        type="button"
                                        disabled={upgradeBusy}
                                        onClick={handleUpgradePayment}
                                        className="press min-h-12 w-full border-2 border-slate-900 bg-amber-400 hover:bg-amber-300 px-5 py-3.5 font-mono text-sm font-black uppercase text-slate-950 shadow-[4px_4px_0px_#0284c7] cursor-pointer disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {upgradeBusy ? 'Opening Payment…' : 'Pay ₹750 & Upgrade to Combo ✦'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setFoundRecord(null); setError(''); }}
                                        className="w-full text-center font-mono text-xs font-black uppercase text-sky-700 underline cursor-pointer"
                                    >
                                        ← Look up another registration
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Initial Search Form */
                        <form onSubmit={handleSearch} noValidate className="space-y-4">
                            <div className="border-2 border-slate-900 bg-amber-100 p-3.5 shadow-[2px_2px_0px_#0f172a]">
                                <h3 className="font-mono text-xs font-black uppercase text-amber-950">
                                    ★ Already Registered for Electronics &amp; Powertrain?
                                </h3>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-800">
                                    Pay just <strong className="text-slate-950">₹750</strong> to unlock the <strong className="text-slate-950">Software &amp; Autonomous Systems</strong> track and get the full Combo experience! You'll master ROS, Computer Vision, ML, and autonomous vehicle system design.
                                </p>
                            </div>

                            <Field label="College Roll No, Reg No, Email, or Phone">
                                <input
                                    className={inputClass(false)}
                                    value={lookupQuery}
                                    onChange={e => { setLookupQuery(e.target.value); setError(''); }}
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    enterKeyHint="search"
                                    maxLength={80}
                                    placeholder="e.g. 26m125 / 7207960077 / email"
                                />
                            </Field>

                            {error && <p className="border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700" role="alert">{error}</p>}

                            <button
                                type="submit"
                                disabled={busy}
                                className="press min-h-12 w-full border-2 border-slate-900 bg-amber-400 px-5 py-3.5 font-mono text-sm font-black uppercase text-slate-950 shadow-[4px_4px_0px_#0f172a] hover:bg-amber-300 cursor-pointer disabled:cursor-wait disabled:opacity-60"
                            >
                                {busy ? 'Searching registration…' : 'Find My Registration & Upgrade →'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

/* "Download receipt" for students who registered earlier: college register
   number OR phone number in, their receipt(s) out. */
function ReceiptLookupDialog({ onClose }) {
    const [lookup, setLookup] = useState({ rollNo: '', phone: '' });
    const [busy, setBusy] = useState(false);
    const [upgradeBusyId, setUpgradeBusyId] = useState(null);
    const [error, setError] = useState('');
    const [receipts, setReceipts] = useState(null);
    useModal(true, onClose);

    const update = (key, value) => {
        setLookup(prev => ({ ...prev, [key]: value }));
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const rollTrimmed = lookup.rollNo.trim();
        const phoneTrimmed = lookup.phone.trim();

        if (!rollTrimmed && !phoneTrimmed) {
            setError('Please enter your College Roll No, Registration No, Email, or Phone Number.');
            return;
        }

        setBusy(true);
        setError('');
        try {
            const { ok, data } = await postJson('/api/workshop/receipt-lookup', {
                rollNo: rollTrimmed,
                phone: phoneTrimmed,
                email: rollTrimmed.includes('@') ? rollTrimmed : undefined,
                query: rollTrimmed || phoneTrimmed
            });
            if (ok && data.receipts?.length) {
                setReceipts(data.receipts);
            } else {
                setError(data.error || 'No paid registration found. Please check your details and try again.');
            }
        } catch {
            setError('Could not reach the server. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    const handleLookupUpgrade = async (record) => {
        setUpgradeBusyId(record.registrationId);
        try {
            const { ok, data } = await postJson('/api/workshop/upgrade', {
                registrationId: record.registrationId
            });
            if (!ok) {
                alert(data.error || 'Failed to start upgrade. Please try again.');
                setUpgradeBusyId(null);
                return;
            }
            const loaded = await loadRazorpayCheckout();
            if (!loaded || !window.Razorpay) {
                alert('Could not load payment window. Please disable ad-blocker.');
                setUpgradeBusyId(null);
                return;
            }
            const checkout = new window.Razorpay({
                key: data.keyId,
                order_id: data.order.id,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'Team Asterix',
                description: 'Dual-Track Combo Upgrade',
                prefill: data.prefill,
                notes: { registrationId: data.registrationId, type: 'upgrade' },
                theme: { color: '#0ea5e9' },
                handler: async (response) => {
                    const verifyRes = await postJson('/api/workshop/verify', response);
                    if (verifyRes.ok && verifyRes.data.registration) {
                        setReceipts(prev => prev.map(r => r.registrationId === record.registrationId ? {
                            ...r,
                            ...verifyRes.data.registration,
                            package: 'combo',
                            packageName: 'Dual-Track Combo',
                            tracksEnrolled: ['software', 'powertrain'],
                            amount: 1750
                        } : r));
                    }
                    setUpgradeBusyId(null);
                },
                modal: {
                    ondismiss: () => {
                        setUpgradeBusyId(null);
                    }
                }
            });
            checkout.on('payment.failed', (err) => {
                alert(err?.error?.description || 'Upgrade payment failed.');
                setUpgradeBusyId(null);
            });
            checkout.open();
        } catch {
            alert('Could not reach the server for upgrade.');
            setUpgradeBusyId(null);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm anim-fade sm:p-6"
            onClick={onClose}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-labelledby="workshop-receipt-title"
        >
            <div
                className="anim-pop-center flex max-h-[90dvh] w-full max-w-lg flex-col border-4 border-slate-900 bg-white shadow-[10px_10px_0px_#16a34a]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
                    <div className="min-w-0">
                        <span className="block font-mono text-[10px] font-black uppercase tracking-widest text-green-400">Already registered?</span>
                        <h2 id="workshop-receipt-title" className="truncate text-base font-black uppercase sm:text-lg">Check registration & receipt</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="press press-flat flex h-9 w-9 shrink-0 items-center justify-center border-2 border-white bg-rose-500 font-sans text-base font-bold text-white hover:bg-rose-600"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    {receipts ? (
                        <div className="space-y-5">
                            {receipts.map(record => {
                                const isCombo = record.package === 'combo' || (Array.isArray(record.tracksEnrolled) && record.tracksEnrolled.includes('software') && record.tracksEnrolled.includes('powertrain'));
                                const rows = receiptRows(record);
                                return (
                                    <div key={record.registrationId}>
                                        <dl className="divide-y-2 divide-slate-200 border-2 border-slate-900">
                                            {rows.map(([label, value]) => (
                                                <div key={label} className={`grid grid-cols-[6.5rem_1fr] gap-3 p-2.5 sm:grid-cols-[8rem_1fr] ${label === 'Amount paid' ? 'bg-amber-300' : ''}`}>
                                                    <dt className="font-mono text-[11px] font-black uppercase text-slate-500">{label}</dt>
                                                    <dd className="min-w-0 break-words font-mono text-sm font-black">{value}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                        <WhatsAppGroupInvite pkgId={record.package} tracksEnrolled={record.tracksEnrolled} />

                                        {/* Upgrade Option directly in Receipt Lookup */}
                                        {!isCombo && (
                                            <div className="mt-3 border-2 border-slate-900 bg-amber-100 p-3.5 shadow-[3px_3px_0px_#0f172a]">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono text-[11px] font-black uppercase text-amber-950">
                                                        ★ Complete Domain Knowledge
                                                    </span>
                                                    <span className="border border-slate-900 bg-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-black">
                                                        750 only
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-700">
                                                    Upgrade by paying 750 to add the other workshop track and gain complete domain knowledge. You can upgrade anytime!
                                                </p>
                                                <button
                                                    type="button"
                                                    disabled={upgradeBusyId === record.registrationId}
                                                    onClick={() => handleLookupUpgrade(record)}
                                                    className="press mt-2.5 min-h-11 w-full border-2 border-slate-900 bg-amber-400 hover:bg-amber-300 px-4 py-2 font-mono text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_#0f172a] disabled:opacity-60"
                                                >
                                                    {upgradeBusyId === record.registrationId ? 'Opening Upgrade…' : 'Upgrade to Combo (750) ✦'}
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => downloadReceipt(rows, record.receiptNo || record.registrationId)}
                                            className="press mt-3 min-h-12 w-full border-2 border-slate-900 bg-slate-900 px-5 py-3.5 font-mono text-sm font-black uppercase text-amber-300 shadow-[4px_4px_0px_#16a34a] hover:bg-slate-800"
                                        >
                                            Download receipt ↓
                                        </button>
                                    </div>
                                );
                            })}
                            <button type="button" onClick={() => setReceipts(null)} className="font-mono text-xs font-black uppercase text-sky-700 underline">
                                ← Look up a different registration
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            <p className="text-sm font-bold text-slate-700">
                                Enter your <span className="font-black text-slate-900">College Roll No, Reg No, or Email</span> to find and download your receipt.
                            </p>

                            <Field label="Option 1: Roll No, University Reg No, or College Email">
                                <input
                                    className={inputClass(false)}
                                    value={lookup.rollNo}
                                    onChange={e => update('rollNo', e.target.value)}
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    enterKeyHint="next"
                                    maxLength={80}
                                    placeholder="e.g. 26m125 / 715526114026 / 26m125@psgitech.ac.in"
                                />
                            </Field>

                            <div className="relative my-2 flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t-2 border-dashed border-slate-300" />
                                </div>
                                <span className="relative bg-white px-3 font-mono text-xs font-black uppercase text-slate-500">
                                    — OR —
                                </span>
                            </div>

                            <Field label="Option 2: Registered Phone Number">
                                <input
                                    className={inputClass(false)}
                                    type="tel"
                                    inputMode="tel"
                                    value={lookup.phone}
                                    onChange={e => update('phone', e.target.value)}
                                    autoComplete="tel"
                                    enterKeyHint="search"
                                    maxLength={20}
                                    placeholder="10-digit mobile number"
                                />
                            </Field>

                            {error && <p className="border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700" role="alert">{error}</p>}

                            <button
                                type="submit"
                                disabled={busy}
                                className="press min-h-12 w-full border-2 border-slate-900 bg-green-400 px-5 py-3.5 font-mono text-sm font-black uppercase shadow-[4px_4px_0px_#0f172a] hover:bg-green-300 disabled:cursor-wait disabled:opacity-60"
                            >
                                {busy ? 'Looking up receipt…' : 'Find my receipt →'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function StatusCard({ title, body, busy = false }) {
    return (
        <div className="flex h-full items-center justify-center p-4 sm:p-6">
            <div className="w-full border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_#0f172a]" role="status">
                {busy && <span className="mb-4 block h-8 w-8 animate-spin border-4 border-slate-900 border-t-amber-300" aria-hidden="true" />}
                <p className="text-xl font-black uppercase">{title}</p>
                <p className="mt-2 text-sm font-bold text-slate-600">{body}</p>
            </div>
        </div>
    );
}
