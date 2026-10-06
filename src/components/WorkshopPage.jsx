import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUrl } from '../lib/api';
import { useWebsiteData } from '../context/WebsiteDataContext';
import { downloadAllIcsFile } from '../utils/calendarUtils';
import SessionDetailModal from './SessionDetailModal';
import WorkshopLoginModal from './WorkshopLoginModal';
/* Shared with the backend so the page and the server can never disagree on
   what a package includes or costs. The server still looks the price up on
   its own side when it creates the order; this import is for display only. */
import {
    WORKSHOP_TRACKS,
    WORKSHOP_PACKAGES,
    WORKSHOP_DEPARTMENTS,
    SOFTWARE_MAX_SEATS,
    POWERTRAIN_MAX_SEATS,
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
    return `w-full min-h-12 px-3 py-3 border-2 font-mono text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm ${
        hasError ? 'border-red-600 bg-red-50' : 'border-slate-950 bg-slate-50'
    }`;
}

/* Same rule as the server: keep the last 10 digits, so "+91 98765 43210"
   and "098765 43210" are accepted as the number they are. */
function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

// Shown on the page as the deadline.

function formatAmount(amount) {
    if (typeof amount !== 'number') return 'TBD';
    return amount.toLocaleString('en-IN');
}

function formatPrice(pkg) {
    return isPriced(pkg) ? formatAmount(pkg.price) : 'TBD';
}

/* Combo offer maths, worked out from the package prices so the tags never
   drift from what is actually charged. */
const SINGLE_PACKAGES = WORKSHOP_PACKAGES.filter((p) => p.tracksIncluded.length === 1);
const COMBO_PACKAGE = WORKSHOP_PACKAGES.find((p) => p.tracksIncluded.length > 1) || null;
const COMBO_SAVING =
    isPriced(COMBO_PACKAGE) && SINGLE_PACKAGES.every(isPriced)
        ? SINGLE_PACKAGES.reduce((sum, p) => sum + p.price, 0) - COMBO_PACKAGE.price
        : 0;

/**
 * Computes badge text according to capacity and threshold rules:
 * - When paused for technical maintenance: "Paused · Reopens Mon 6 AM"
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
            text: 'Paused · Reopens Mon 6 AM',
            fullText: 'Temporarily Paused (Bank Issue) · Reopens Monday Morning (6:00 AM)',
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
    const other = SINGLE_PACKAGES.find((p) => p.id !== pkg.id);
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
    const pkg = WORKSHOP_PACKAGES.find((p) => p.id === form.package);
    if (!pkg) errors.package = 'Choose a track.';
    else if (!isPriced(pkg)) errors.package = 'Pricing for this package is not announced yet.';
    else if (pkg.id === 'software' && softwarePaused) {
        errors.package =
            "Software registrations are temporarily paused while we fix a technical issue on the bank's side. Registrations reopen tomorrow (Monday) morning at 6:00 AM and close Tuesday at 11:59 PM (or when remaining seats are filled).";
    } else if (pkg.id === 'combo' && softwarePaused) {
        errors.package =
            "Dual-Track registrations are temporarily paused while we fix a technical issue on the bank's side. Registrations reopen tomorrow (Monday) morning at 6:00 AM.";
    } else if (pkg.id === 'powertrain' && powertrainSoldOut) {
        errors.package =
            'Electronics & Powertrain is completely full! Only Software & Autonomous Systems track is available — learn the brains behind the vehicle (ROS, AI & Perception). Stay tuned for future workshops by our team.';
    } else if (pkg.id === 'software' && softwareSoldOut) {
        errors.package =
            'Software & Autonomous Systems workshop registrations are fully booked (no seats remaining). Stay tuned for future workshops by our team.';
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
        const W = 640,
            PAD = 36,
            LABEL_W = 170,
            LINE_H = 24,
            ROW_PAD = 18;
        const HEADER_H = 128,
            FOOTER_H = 84;
        const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        const VALUE_FONT = `700 17px ${SANS}`;
        const valueW = W - PAD * 2 - LABEL_W;

        const canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = VALUE_FONT;
        const laid = rows.map(([label, value]) => ({
            label,
            lines: wrapText(ctx, String(value ?? ''), valueW)
        }));
        const H =
            HEADER_H +
            laid.reduce((sum, row) => sum + row.lines.length * LINE_H + ROW_PAD, 0) +
            FOOTER_H +
            16;

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
                            navigator
                                .share({ files: [file], title: `Asterix Workshop Receipt - ${safeId}` })
                                .catch(() => {});
                        }
                    } catch {
                        // ignore share error
                    }
                }
            }, 'image/png');
        }
    } catch (err) {
        console.error('Download receipt failed:', err);
        alert(
            'Could not download receipt image automatically. Please take a screenshot of your receipt on screen.'
        );
    }
}

export default function WorkshopPage({ onBack }) {
    const [activeTrack, setActiveTrack] = useState('software');
    const [registerOpen, setRegisterOpen] = useState(false);
    const [lookupOpen, setLookupOpen] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [student, setStudent] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('workshop_student')) || null;
        } catch {
            return null;
        }
    });
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
        ...dynamicTracks[activeTrack]
    };
    const selectedPkg = WORKSHOP_PACKAGES.find((p) => p.id === form.package) || null;
    const anyPriced = WORKSHOP_PACKAGES.some(isPriced);

    const [powertrainSeats, setPowertrainSeats] = useState({
        maxSeats: POWERTRAIN_MAX_SEATS,
        seatsLeft: 0,
        soldOut: true
    });
    const [softwareSeats, setSoftwareSeats] = useState(() => {
        const initialSoftwareState = getSoftwareRegistrationState(Date.now(), 145);
        return {
            maxSeats: SOFTWARE_MAX_SEATS,
            seatsLeft: initialSoftwareState.seatsLeft,
            soldOut: initialSoftwareState.soldOut,
            isPaused: initialSoftwareState.isPaused,
            isPastDeadline: initialSoftwareState.isPastDeadline,
            open: initialSoftwareState.open,
            pauseMessage: initialSoftwareState.pauseMessage,
            scheduleSummary: initialSoftwareState.scheduleSummary
        };
    });

    const comboSeats = useMemo(
        () => ({
            seatsLeft:
                powertrainSeats.seatsLeft !== null && softwareSeats.seatsLeft !== null
                    ? Math.min(powertrainSeats.seatsLeft, softwareSeats.seatsLeft)
                    : (powertrainSeats.seatsLeft ?? softwareSeats.seatsLeft ?? null),
            soldOut: Boolean(powertrainSeats.soldOut || softwareSeats.soldOut || softwareSeats.isPaused),
            isPaused: softwareSeats.isPaused
        }),
        [powertrainSeats, softwareSeats]
    );

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
            setError(
                softwareSeats.pauseMessage ||
                    "We are currently fixing a technical issue on the bank's side. Software track registrations will reopen tomorrow (Monday) morning at 6:00 AM and close Tuesday at 11:59 PM (or when remaining seats are filled)."
            );
            setUpgradePrompt(null);
            setRegisterOpen(true);
            return;
        }
        if (typeof packageId === 'string' && packageId) {
            if (isPackageSoldOut(packageId)) {
                if (packageId === 'powertrain' || packageId === 'combo') {
                    if (!softwareSeats.soldOut && !softwareSeats.isPaused) {
                        setForm((prev) => ({ ...prev, package: 'software' }));
                        setError(
                            'Electronics & Powertrain is fully booked! Only Software & Autonomous Systems track is available — learn ROS, Computer Vision, and autonomous vehicle stacks to master full vehicle intelligence! Stay tuned for future workshops by our team.'
                        );
                    } else {
                        setForm((prev) => ({ ...prev, package: '' }));
                        setError(
                            'Workshop registrations are currently not available. Stay tuned for future workshops by our team!'
                        );
                    }
                } else if (packageId === 'software') {
                    if (!powertrainSeats.soldOut) {
                        setForm((prev) => ({ ...prev, package: 'powertrain' }));
                        setError(
                            'Software track is fully booked. You can still register for Electronics & Powertrain! Stay tuned for future workshops by our team.'
                        );
                    } else {
                        setForm((prev) => ({ ...prev, package: '' }));
                        setError(
                            'Workshop registrations are fully booked. Stay tuned for future workshops by our team!'
                        );
                    }
                }
            } else {
                setForm((prev) => ({ ...prev, package: packageId }));
                setFieldErrors((prev) => ({ ...prev, package: undefined }));
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
        setForm((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
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
            setError(`Please fix: ${keys.map((key) => FIELD_LABELS[key] || key).join(', ')}.`);
            // On a phone the first problem is usually off screen: take them to it.
            // validate() adds keys in form order, so keys[0] is the topmost field.
            const target = formRef.current?.querySelector(`[data-field="${keys[0]}"]`);
            if (target) {
                (target.closest('[data-field-wrap]') || target).scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                target.focus({ preventScroll: true });
            }
            return;
        }
        setError('');
        // One track picked: offer the combo once before moving on (if not sold out).
        if (
            upsellFor(selectedPkg, {
                powertrainSoldOut: powertrainSeats.soldOut,
                softwareSoldOut: softwareSeats.soldOut,
                softwarePaused: softwareSeats.isPaused
            }) &&
            !upsellOpen
        ) {
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
            setError(
                'Could not load the payment window. Disable any ad-blocker for this site and try again.'
            );
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
                    setStage((current) => (current === 'paying' ? 'review' : current));
                    setError(
                        (current) =>
                            current || 'Payment window closed. You can try again whenever you are ready.'
                    );
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
                ...(prefill
                    ? {
                          email: prefill.email,
                          phone: normalizePhone(prefill.phone || prefill.contact),
                          name: prefill.name
                      }
                    : {})
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
                        setStage((current) => (current === 'paying' ? 'review' : current));
                        setError(
                            (current) => current || 'Upgrade payment window closed. You can upgrade anytime.'
                        );
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
                        <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                            Team Asterix
                        </span>
                        <strong className="block text-sm font-black uppercase">Workshops 2026</strong>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-3 py-2 font-mono text-xs font-black uppercase hover:bg-amber-400 sm:px-4"
                        >
                            ← Main<span className="hidden sm:inline"> Website</span>
                        </button>
                        {/* Student JWT Login Status / Button */}
                        {student ? (
                            <div className="flex items-center gap-2 border-2 border-slate-900 bg-emerald-400 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase shadow-brutal-2">
                                <span>👤 {student.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        localStorage.removeItem('workshop_jwt');
                                        localStorage.removeItem('workshop_student');
                                        setStudent(null);
                                    }}
                                    className="press border border-slate-900 bg-white px-2 py-0.5 text-[10px] text-slate-900 uppercase hover:bg-rose-200"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setLoginModalOpen(true)}
                                className="press shadow-brutal-3 border-2 border-slate-900 bg-sky-300 px-3 py-2 font-mono text-xs font-black uppercase text-slate-950 hover:bg-sky-400 sm:px-4"
                            >
                                🔑 Student Login
                            </button>
                        )}
                        {/* Participant Locker / Profile Button in Header */}
                        <button
                            type="button"
                            onClick={() => {
                                window.location.hash = '#workshop-profile';
                            }}
                            aria-haspopup="dialog"
                            aria-label="Participant Profile and Attendance Locker"
                            className="press shadow-brutal-3-brand inline-flex cursor-pointer items-center gap-1.5 border-2 border-slate-900 bg-purple-300 px-3 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-purple-400 sm:px-4"
                        >
                            <svg
                                className="h-4 w-4 shrink-0 stroke-[2.5]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                />
                            </svg>
                            <span>Profile & Notes 🔓</span>
                        </button>
                    </div>
                </div>
            </header>

            <main>
                {/* Information Deck Overview Hero */}
                <section className="border-b-4 border-slate-900 bg-amber-300 px-4 py-12 sm:px-8 sm:py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-block border-2 border-slate-900 bg-slate-900 px-3 py-1 font-mono text-xs font-black tracking-widest text-amber-300 uppercase">
                                ✦ WORKSHOP INFORMATION DECK
                            </span>
                            <span className="inline-block border-2 border-slate-900 bg-rose-600 px-3 py-1 font-mono text-xs font-black tracking-widest text-white uppercase">
                                REGISTRATION OFFICIALLY CLOSED
                            </span>
                            <span className="inline-block border-2 border-slate-900 bg-emerald-400 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 uppercase">
                                PARTICIPANT PORTAL LIVE
                            </span>
                        </div>

                        <h1 className="mt-5 max-w-5xl text-3xl leading-[0.95] font-black tracking-tight uppercase sm:text-6xl">
                            Autonomous Subsystems Masterclass Deck
                        </h1>
                        <p className="mt-4 max-w-3xl text-base leading-relaxed font-bold text-slate-900 sm:text-xl">
                            Official curriculum, session schedules, software guides, and project portal for both
                            Team Asterix engineering subsystems.
                        </p>

                        {/* Quick CTA Actions */}
                        <div className="mt-8 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.hash = '#workshop-profile';
                                }}
                                className="press shadow-brutal-4-brand flex cursor-pointer items-center gap-2 border-2 border-slate-900 bg-purple-400 px-5 py-3 font-mono text-xs font-black text-slate-950 uppercase hover:bg-purple-300"
                            >
                                <span>My Profile & Attendance Notes</span>
                                <span>🔓</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToEl(detailRef.current)}
                                className="press shadow-brutal-4 border-2 border-slate-900 bg-white px-5 py-3 font-mono text-xs font-black uppercase hover:bg-sky-100"
                            >
                                Browse Subsystem Decks ↓
                            </button>
                            <a
                                href="#workshop-project-submit"
                                className="press shadow-brutal-4 inline-flex items-center border-2 border-slate-900 bg-emerald-400 px-5 py-3 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-emerald-300"
                            >
                                Submit Mini-Project →
                            </a>
                            <a
                                href="#quiz"
                                className="press shadow-brutal-4 inline-flex items-center border-2 border-slate-900 bg-sky-300 px-5 py-3 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-sky-400"
                            >
                                Take Track Quiz 📝
                            </a>
                        </div>
                    </div>
                </section>

                {/* Track selector + details */}
                <section
                    ref={detailRef}
                    className="border-b-4 border-slate-900 bg-sky-100 px-4 py-12 sm:px-8 sm:py-16"
                >
                    <div className="mx-auto max-w-6xl">
                        <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                            01 / Select Subsystem Deck
                        </span>
                        <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Subsystem Decks</h2>

                        <div
                            className="mt-8 grid grid-cols-2 gap-3 sm:gap-4"
                            role="tablist"
                            aria-label="Subsystem Information Decks"
                        >
                            {TRACK_ORDER.map((id) => {
                                const t = WORKSHOP_TRACKS[id];
                                const active = id === activeTrack;
                                const isEnrolled =
                                    !student ||
                                    student.package === 'combo' ||
                                    student.package === id ||
                                    (Array.isArray(student.tracksEnrolled) && student.tracksEnrolled.includes(id));

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => selectTrack(id)}
                                        className={`press group cursor-pointer border-3 border-slate-900 p-3.5 text-left transition-all sm:border-4 sm:p-6 ${
                                            active
                                                ? 'shadow-brutal-6-brand bg-slate-900 text-white'
                                                : 'shadow-brutal-4 hover:shadow-brutal-6 bg-white text-slate-900 hover:bg-amber-100'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span
                                                className={`inline-flex items-center gap-1 font-mono text-[10px] font-black tracking-wider uppercase sm:text-xs ${
                                                    active
                                                        ? 'text-amber-300'
                                                        : 'text-sky-700 group-hover:text-sky-700'
                                                }`}
                                            >
                                                <span>{active ? '● Active Subsystem' : '○ View Subsystem'}</span>
                                            </span>
                                            {student && (
                                                <span
                                                    className={`border border-slate-900 px-2 py-0.5 font-mono text-[9px] font-black uppercase ${
                                                        isEnrolled
                                                            ? 'bg-emerald-400 text-slate-950'
                                                            : 'bg-amber-300 text-slate-950'
                                                    }`}
                                                >
                                                    {isEnrolled ? '✓ Unlocked' : '🔒 Combo Required'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="mt-1.5 block text-sm leading-tight font-black uppercase sm:mt-2 sm:text-2xl lg:text-3xl">
                                            {t.name}
                                        </span>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 border-2 border-slate-900 bg-emerald-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase sm:text-xs">
                                                <span>✦ DECK READY</span>
                                            </span>
                                        </div>
                                        <span
                                            className={`mt-2 hidden text-sm font-bold sm:block ${
                                                active ? 'text-slate-300' : 'text-slate-600'
                                            }`}
                                        >
                                            {t.tagline}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {student && student.package !== 'combo' && student.package !== activeTrack ? (
                            <div className="shadow-brutal-6 mt-8 border-4 border-slate-900 bg-slate-900 p-8 text-center text-white">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-3 border-amber-300 bg-amber-300 text-3xl font-black text-slate-900">
                                    🔒
                                </div>
                                <h3 className="mt-4 text-2xl font-black uppercase tracking-tight text-amber-300 sm:text-3xl">
                                    {track.name} Notes &amp; Deck Locked
                                </h3>
                                <p className="mx-auto mt-2 max-w-xl text-sm font-bold text-slate-300 sm:text-base">
                                    Your account (<strong>{student.name}</strong>) is enrolled in the{' '}
                                    <span className="text-amber-300 uppercase">{student.package}</span> track.
                                    Only candidates who paid for the <strong>Dual-Track Combo</strong> can access both Software and Powertrain notes and sessions!
                                </p>
                                <div className="mt-6 flex flex-wrap justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => selectTrack(student.package === 'software' ? 'software' : 'powertrain')}
                                        className="press shadow-brutal-4 border-2 border-slate-900 bg-amber-300 px-5 py-2.5 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-400"
                                    >
                                        ← Switch to My Registered Track ({student.package?.toUpperCase()})
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <TrackDetail
                                key={track.id}
                                track={track}
                                student={student}
                                onPreviewSyllabus={(url, name) => setPreviewSyllabus({ url, name })}
                            />
                        )}

                        {/* Participant Locker Quick Card */}
                        <div className="shadow-brutal-6 mt-8 border-4 border-slate-900 bg-amber-300 p-5 sm:p-6">
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase sm:text-xs">
                                            🔓 Registered Participant Access
                                        </span>
                                        <span className="inline-block border-2 border-slate-900 bg-emerald-400 px-2.5 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase sm:text-xs">
                                            Instant Verification
                                        </span>
                                    </div>
                                    <h3 className="text-lg leading-tight font-black text-slate-900 uppercase sm:text-2xl">
                                        Check Your Registered Track &amp; Attendance Records
                                    </h3>
                                    <p className="max-w-2xl text-xs font-bold text-slate-800 sm:text-sm">
                                        Registered for the workshop? Enter your registered email or phone number to unlock your verified participant status, downloadable payment receipt, attendance logs, and project submissions.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLookupOpen(true)}
                                    className="press shadow-brutal-3-brand shrink-0 cursor-pointer border-2 border-slate-900 bg-slate-900 px-6 py-3.5 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                >
                                    Unlock Participant Locker 🔓
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Included Section */}
                <section className="border-b-4 border-slate-900 bg-amber-300 px-4 py-10 sm:px-8 sm:py-16">
                    <div className="mx-auto max-w-6xl">
                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-amber-300 uppercase sm:text-xs">
                            ✦ All-Inclusive Experience
                        </span>
                        <h2 className="mt-2 text-2xl leading-tight font-black uppercase sm:text-5xl">
                            YOUR 1,000 INCLUDES
                        </h2>
                        <p className="mt-1.5 text-xs font-bold text-slate-800 sm:text-base">
                            Everything you need to build real-world engineering mastery with Team Asterix and
                            industry experts.
                        </p>

                        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    01 / RESOURCES
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    Handbooks &amp; guides
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    Physical &amp; digital comprehensive manuals, schematics and code
                                    references.
                                </p>
                            </div>
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    02 / PRACTICE
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    Hands-on learning
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    Direct hardware labs, vehicle testing and interactive debugging sessions.
                                </p>
                            </div>
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    03 / BUILD
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    Mini-projects
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    End-to-end milestone projects designed to build practical engineering
                                    confidence.
                                </p>
                            </div>
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    04 / CAREER
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    Build and strengthen your resume
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    Stand out with verified, hands-on project experience on real autonomous
                                    stacks and powertrain electronics.
                                </p>
                            </div>
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    05 / CURRICULUM
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    Industry approved syllabus
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    Sessions handled by Team Asterix engineers and industry experts.
                                </p>
                            </div>
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    06 / BONUS
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    3 complimentary sessions
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    Free cross-track masterclasses: Perception, Embedded Systems &amp;
                                    Mechanical Fundamentals.
                                </p>
                            </div>
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    07 / VEHICLE
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    Real autonomous-vehicle context
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    Taught directly on the systems powering our full-scale autonomous vehicle
                                    platform.
                                </p>
                            </div>
                            <div className="shadow-brutal-3 sm:shadow-brutal-4 border-2 border-slate-900 bg-white p-3.5 sm:border-3 sm:p-4">
                                <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase sm:text-xs">
                                    08 / SKILLS
                                </span>
                                <h3 className="mt-1 text-sm leading-snug font-black uppercase sm:text-base">
                                    Future ready minds
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-600">
                                    Master ROS, Computer Vision, Agentic AI, circuits, and PCB design.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Leads Section */}
                <section className="border-b-4 border-slate-900 bg-sky-50 px-4 py-10 sm:px-8 sm:py-14">
                    <div className="mx-auto max-w-6xl">
                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-sky-400 uppercase sm:text-xs">
                            ✦ Get In Touch
                        </span>
                        <h2 className="mt-2 text-2xl leading-tight font-black text-slate-900 uppercase sm:text-4xl">
                            CONTACT THE LEADS
                        </h2>
                        <p className="mt-1.5 text-xs font-bold text-slate-700 sm:text-base">
                            Have questions regarding track topics, prerequisites, timings, or payments? Feel
                            free to reach out directly.
                        </p>

                        <div className="mt-6 grid grid-cols-1 gap-3.5 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                            {/* Ratheeswar */}
                            <div className="shadow-brutal-4 flex flex-col justify-between border-3 border-slate-900 bg-white p-4 sm:p-5">
                                <div>
                                    <span className="mb-2 inline-block border-2 border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                        Software Lead
                                    </span>
                                    <h3 className="text-base font-black text-slate-900 uppercase sm:text-lg">
                                        Ratheeswar S
                                    </h3>
                                    <p className="mt-1 font-mono text-xs font-bold text-slate-600">
                                        ROS, ML, Agentic AI &amp; Perception Track
                                    </p>
                                </div>
                                <div className="mt-4 border-t-2 border-slate-200 pt-3">
                                    <a
                                        href="tel:8608944644"
                                        className="press shadow-brutal-2-bright flex items-center justify-between border-2 border-slate-900 bg-slate-900 px-3.5 py-2.5 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                    >
                                        <span>+91 8608944644</span>
                                        <span className="font-mono text-[10px] text-white">Call →</span>
                                    </a>
                                </div>
                            </div>

                            {/* Arya A */}
                            <div className="shadow-brutal-4 flex flex-col justify-between border-3 border-slate-900 bg-white p-4 sm:p-5">
                                <div>
                                    <span className="mb-2 inline-block border-2 border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                        Software Lead
                                    </span>
                                    <h3 className="text-base font-black text-slate-900 uppercase sm:text-lg">
                                        Arya A
                                    </h3>
                                    <p className="mt-1 font-mono text-xs font-bold text-slate-600">
                                        Autonomous Stack, CV &amp; System Design
                                    </p>
                                </div>
                                <div className="mt-4 border-t-2 border-slate-200 pt-3">
                                    <a
                                        href="tel:9994399419"
                                        className="press shadow-brutal-2-bright flex items-center justify-between border-2 border-slate-900 bg-slate-900 px-3.5 py-2.5 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                    >
                                        <span>+91 99943 99419</span>
                                        <span className="font-mono text-[10px] text-white">Call →</span>
                                    </a>
                                </div>
                            </div>

                            {/* Joel Anto Edwin */}
                            <div className="shadow-brutal-4 flex flex-col justify-between border-3 border-slate-900 bg-white p-4 sm:p-5">
                                <div>
                                    <span className="mb-2 inline-block border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                        Powertrain Lead
                                    </span>
                                    <h3 className="text-base font-black text-slate-900 uppercase sm:text-lg">
                                        Joel Anto Edwin
                                    </h3>
                                    <p className="mt-1 font-mono text-xs font-bold text-slate-600">
                                        Circuits, Motors, Microcontrollers &amp; PCB Design
                                    </p>
                                </div>
                                <div className="mt-4 border-t-2 border-slate-200 pt-3">
                                    <a
                                        href="tel:7207960077"
                                        className="press shadow-brutal-2-bright flex items-center justify-between border-2 border-slate-900 bg-slate-900 px-3.5 py-2.5 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                    >
                                        <span>+91 72079 60077</span>
                                        <span className="font-mono text-[10px] text-white">Call →</span>
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
                            <span className="font-mono text-xs font-black tracking-widest text-amber-300 uppercase">
                                02 / Save your seat
                            </span>
                            <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
                                Ready to build?
                            </h2>
                            <p className="mt-2 max-w-xl text-sm font-bold text-slate-300">
                                One track or both. Registration takes a minute; payment is handled securely by
                                Razorpay.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setUpgradeModalOpen(true)}
                                aria-haspopup="dialog"
                                className="press shadow-brutal-5-brand cursor-pointer border-3 border-amber-400 bg-amber-400 px-6 py-4 text-base font-black tracking-wide text-slate-950 uppercase hover:bg-amber-300 sm:text-lg"
                            >
                                {softwareSeats.isPaused
                                    ? '⏸ Upgrades Reopen Mon 6 AM'
                                    : '★ Upgrade to Combo (₹750)'}
                            </button>
                            <button
                                type="button"
                                onClick={openRegister}
                                aria-haspopup="dialog"
                                className="press press-sky shadow-brutal-6-bright border-4 border-white bg-white px-8 py-4 text-lg font-black tracking-wide text-slate-900 uppercase hover:bg-amber-300"
                            >
                                {softwareSeats.isPaused ? 'Registration Paused ⏸' : 'Register ✦'}
                            </button>
                        </div>
                    </div>
                </section>

                {lookupOpen && (
                    <ReceiptLookupDialog softwareSeats={softwareSeats} onClose={() => setLookupOpen(false)} />
                )}
                {upgradeModalOpen && (
                    <UpgradeModal softwareSeats={softwareSeats} onClose={() => setUpgradeModalOpen(false)} />
                )}

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
                        <form
                            ref={formRef}
                            onSubmit={handleConfirm}
                            noValidate
                            className="flex h-full flex-col"
                        >
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                                {!anyPriced && (
                                    <p className="mb-5 border-2 border-slate-900 bg-amber-100 p-3 font-mono text-xs font-black uppercase">
                                        Prices are yet to be announced. Payments open as soon as they are.
                                    </p>
                                )}

                                {/* Package first: it is what they came here to pick. */}
                                <fieldset data-field-wrap>
                                    <legend className="mb-2 font-mono text-xs font-black tracking-widest text-slate-700 uppercase">
                                        1. Choose your track
                                    </legend>
                                    {softwareSeats.isPaused && (
                                        <div className="mb-4 space-y-1 border-2 border-slate-900 bg-amber-100 p-3 font-mono text-xs font-bold text-slate-800">
                                            <p className="font-black text-rose-700 uppercase">
                                                ⏸ Registrations Temporarily Paused
                                            </p>
                                            <p>
                                                We are currently fixing a technical issue on the bank's side.
                                                Software track registrations will reopen tomorrow (Monday)
                                                morning at 6:00 AM and close Tuesday at 11:59 PM (or when
                                                remaining seats are filled).
                                            </p>
                                        </div>
                                    )}
                                    {powertrainSeats?.soldOut &&
                                        !softwareSeats?.soldOut &&
                                        !softwareSeats?.isPaused && (
                                            <div className="mb-3 space-y-1 border-2 border-slate-900 bg-amber-100 p-2.5 font-mono text-xs font-bold text-slate-800">
                                                <p className="font-black text-rose-700 uppercase">
                                                    ⚡ Powertrain seats are filled!
                                                </p>
                                                <p>
                                                    Only the Software &amp; Autonomous Systems track is
                                                    currently available. Learn ROS, Computer Vision, and
                                                    autonomous algorithms. Stay tuned for future workshops by
                                                    our team!
                                                </p>
                                            </div>
                                        )}
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {WORKSHOP_PACKAGES.map((pkg, index) => {
                                            const selected = form.package === pkg.id;
                                            const isCombo = pkg.id === COMBO_PACKAGE?.id;
                                            const trackSeats =
                                                pkg.id === 'powertrain'
                                                    ? powertrainSeats
                                                    : pkg.id === 'software'
                                                      ? softwareSeats
                                                      : comboSeats;
                                            const badgeInfo = getSeatBadgeInfo(trackSeats);
                                            const isSoldOut = badgeInfo?.isSoldOut;
                                            const isPaused =
                                                softwareSeats.isPaused &&
                                                (pkg.id === 'software' || pkg.id === 'combo');
                                            const isOptionDisabled = isSoldOut || isPaused;

                                            return (
                                                <label
                                                    key={pkg.id}
                                                    className={`press flex min-h-14 items-center justify-between gap-3 border-2 p-3.5 ${
                                                        isOptionDisabled
                                                            ? 'cursor-not-allowed border-slate-300 bg-slate-100 opacity-60'
                                                            : 'cursor-pointer ' +
                                                              (fieldErrors.package
                                                                  ? 'border-red-600'
                                                                  : 'border-slate-950') +
                                                              ' ' +
                                                              (selected
                                                                  ? 'shadow-brutal-4 bg-amber-300'
                                                                  : 'bg-slate-50 hover:bg-amber-50')
                                                    }`}
                                                >
                                                    <span className="flex min-w-0 items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="package"
                                                            value={pkg.id}
                                                            checked={selected}
                                                            disabled={isOptionDisabled}
                                                            onChange={() =>
                                                                !isOptionDisabled &&
                                                                updateField('package', pkg.id)
                                                            }
                                                            data-field={index === 0 ? 'package' : undefined}
                                                            className="h-5 w-5 shrink-0 accent-slate-900 disabled:opacity-40"
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="mb-1 flex flex-wrap items-center gap-1.5">
                                                                {isCombo && (
                                                                    <>
                                                                        <span className="border-2 border-slate-900 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                                            ★ Recommended
                                                                        </span>
                                                                        {COMBO_SAVING > 0 && (
                                                                            <span className="border-2 border-slate-900 bg-green-400 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                                                                Save{' '}
                                                                                {formatAmount(COMBO_SAVING)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {/* Show seats left badge for both tracks and combo */}
                                                                {badgeInfo && (
                                                                    <span
                                                                        className={`border-2 border-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase ${
                                                                            isSoldOut
                                                                                ? 'bg-rose-500 text-white'
                                                                                : badgeInfo.isPaused
                                                                                  ? 'bg-amber-300 text-slate-950'
                                                                                  : 'bg-amber-400 text-slate-950'
                                                                        }`}
                                                                    >
                                                                        {isSoldOut
                                                                            ? 'Sold Out'
                                                                            : badgeInfo.text}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="block text-sm font-black uppercase">
                                                                {pkg.name}
                                                                {isSoldOut && (
                                                                    <span className="ml-2 text-xs font-black text-rose-600">
                                                                        (SOLD OUT)
                                                                    </span>
                                                                )}
                                                                {isPaused && !isSoldOut && (
                                                                    <span className="ml-2 text-xs font-black text-amber-700">
                                                                        (PAUSED)
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {pkg.tracksIncluded.length > 1 && (
                                                                <span className="block font-mono text-[11px] font-bold text-slate-600">
                                                                    {pkg.tracksIncluded
                                                                        .map((id) => WORKSHOP_TRACKS[id].name)
                                                                        .join(' + ')}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 text-right font-mono">
                                                        {isCombo && (
                                                            <span className="block text-xs font-bold text-slate-500 line-through">
                                                                2,000
                                                            </span>
                                                        )}
                                                        <span className="text-base font-black sm:text-lg">
                                                            {formatPrice(pkg)}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {fieldErrors.package && (
                                        <p className="mt-2 font-mono text-xs font-black text-red-600">
                                            {fieldErrors.package}
                                        </p>
                                    )}
                                </fieldset>

                                <p className="mt-6 mb-2 font-mono text-xs font-black tracking-widest text-slate-700 uppercase">
                                    2. Your details
                                </p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="Full name" error={fieldErrors.name}>
                                        <input
                                            data-field="name"
                                            className={inputClass(fieldErrors.name)}
                                            value={form.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            autoComplete="name"
                                            autoCapitalize="words"
                                            enterKeyHint="next"
                                            maxLength={100}
                                            placeholder="As on your ID card"
                                        />
                                    </Field>
                                    <Field label="Registered number" error={fieldErrors.rollNo}>
                                        <input
                                            data-field="rollNo"
                                            className={inputClass(fieldErrors.rollNo)}
                                            value={form.rollNo}
                                            onChange={(e) => updateField('rollNo', e.target.value)}
                                            autoComplete="off"
                                            autoCapitalize="characters"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            enterKeyHint="next"
                                            maxLength={40}
                                            placeholder="College register number"
                                        />
                                    </Field>
                                    <Field label="Department" error={fieldErrors.department}>
                                        <select
                                            data-field="department"
                                            className={inputClass(fieldErrors.department)}
                                            value={form.department}
                                            onChange={(e) => updateField('department', e.target.value)}
                                        >
                                            <option value="" disabled>
                                                Select department
                                            </option>
                                            {WORKSHOP_DEPARTMENTS.map((dept) => (
                                                <option key={dept} value={dept}>
                                                    {dept}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Year" error={fieldErrors.year}>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['1', '2'].map((y) => (
                                                <button
                                                    key={y}
                                                    type="button"
                                                    onClick={() => updateField('year', y)}
                                                    aria-pressed={form.year === y}
                                                    data-field={y === '1' ? 'year' : undefined}
                                                    className={`press min-h-12 border-2 p-3 font-mono text-sm font-black uppercase ${
                                                        fieldErrors.year
                                                            ? 'border-red-600'
                                                            : 'border-slate-950'
                                                    } ${
                                                        form.year === y
                                                            ? 'bg-sky-500 text-slate-950'
                                                            : fieldErrors.year
                                                              ? 'bg-red-50 hover:bg-sky-100'
                                                              : 'bg-slate-50 hover:bg-sky-100'
                                                    }`}
                                                >
                                                    {y === '1' ? '1st year' : '2nd year'}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label="College Email ID" error={fieldErrors.email}>
                                        <input
                                            data-field="email"
                                            type="email"
                                            inputMode="email"
                                            className={inputClass(fieldErrors.email)}
                                            value={form.email}
                                            onChange={(e) => updateField('email', e.target.value)}
                                            autoComplete="email"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            enterKeyHint="next"
                                            maxLength={254}
                                            placeholder="yourname@psgitech.ac.in"
                                        />
                                    </Field>
                                    <Field label="Phone" error={fieldErrors.phone}>
                                        <input
                                            data-field="phone"
                                            type="tel"
                                            inputMode="tel"
                                            className={inputClass(fieldErrors.phone)}
                                            value={form.phone}
                                            onChange={(e) => updateField('phone', e.target.value)}
                                            autoComplete="tel"
                                            enterKeyHint="done"
                                            maxLength={20}
                                            placeholder="10-digit mobile number"
                                        />
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
                                        onDecline={() => {
                                            setUpsellOpen(false);
                                            setStage('review');
                                        }}
                                        onDismiss={() => setUpsellOpen(false)}
                                    />
                                )}
                                {error && stage === 'form' && (
                                    <p className="mb-3 border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700">
                                        {error}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={softwareSeats.isPaused}
                                    className={`press min-h-12 w-full border-2 border-slate-900 px-5 py-3.5 font-mono text-sm font-black uppercase ${
                                        softwareSeats.isPaused
                                            ? 'cursor-not-allowed bg-slate-300 text-slate-600'
                                            : 'shadow-brutal-4-brand bg-slate-900 text-amber-300 hover:bg-slate-800'
                                    }`}
                                >
                                    {softwareSeats.isPaused
                                        ? '⏸ Registrations Reopen Monday 6:00 AM'
                                        : 'Review & continue →'}
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
                            onEdit={() => {
                                setError('');
                                setUpgradePrompt(null);
                                setStage('form');
                            }}
                            onPay={handlePay}
                        />

                        <PaymentPanel
                            stage={stage}
                            registration={registration}
                            form={form}
                            softwareSeats={softwareSeats}
                            onUpgrade={handleUpgrade}
                            upgradeBusy={upgradeBusy}
                            onRegisterAnother={resetForm}
                            onClose={closeRegister}
                        />
                    </RegisterDialog>
                )}

                <WorkshopLoginModal
                    isOpen={loginModalOpen}
                    onClose={() => setLoginModalOpen(false)}
                    onSuccess={(std) => {
                        setStudent(std);
                        setLoginModalOpen(false);
                    }}
                />
            </main>
        </div>
    );
}

function TrackDetail({ track, student, onPreviewSyllabus }) {
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedSession, setSelectedSession] = useState(null);
    const isSoftware = track.id === 'software';

    const hasSyllabus = Boolean(track.syllabus);
    const isImageKit = typeof track.syllabus === 'string' && track.syllabus.includes('ik.imagekit.io');
    const downloadUrl = isImageKit
        ? `${track.syllabus}${track.syllabus.includes('?') ? '&' : '?'}ik-attachment=true`
        : track.syllabus;

    // Subsystem specific tool guides
    const toolGuides = isSoftware
        ? [
              { name: 'ROS 2 Humble / Ubuntu 24.04', desc: 'Core robotics framework & node setup guide', link: 'https://docs.ros.org/en/humble/' },
              { name: 'OpenCV & Python Setup', desc: 'Computer vision & image processing environment', link: 'https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html' },
              { name: 'PyTorch / ML Stack', desc: 'Machine learning fundamentals for perception', link: 'https://pytorch.org/get-started/locally/' },
              { name: 'Agentic AI & LLM Tools', desc: 'Building autonomous decision-making agents', link: 'https://github.com/' }
          ]
        : [
              { name: 'LTspice Simulation Software', desc: 'Circuit design, transient analysis & SPICE simulation', link: 'https://www.analog.com/en/design-center/design-tools-and-calculators/ltspice-simulator.html' },
              { name: 'Tinkercad Circuits', desc: 'Virtual microcontroller lab & interlock testbed', link: 'https://www.tinkercad.com/' },
              { name: 'Arduino IDE / ESP32 Core', desc: 'Flashing firmware & motor controller code', link: 'https://docs.espressif.com/projects/arduino-esp32/en/latest/' },
              { name: 'KiCad EDA PCB Design', desc: 'Schematic capture and multi-layer PCB layout', link: 'https://www.kicad.org/' }
          ];

    const allSchedule = track.schedule || [];
    const filteredSchedule = useMemo(() => {
        if (activeFilter === 'lecture') return allSchedule.filter((s) => s.type === 'lecture');
        if (activeFilter === 'handson') return allSchedule.filter((s) => s.type === 'handson');
        if (activeFilter === 'expert') return allSchedule.filter((s) => s.type === 'expert');
        if (activeFilter === 'bonus') return allSchedule.filter((s) => ['catchup', 'complimentary', 'online'].includes(s.type));
        return allSchedule;
    }, [allSchedule, activeFilter]);

    const counts = useMemo(() => ({
        all: allSchedule.length,
        lecture: allSchedule.filter((s) => s.type === 'lecture').length,
        handson: allSchedule.filter((s) => s.type === 'handson').length,
        expert: allSchedule.filter((s) => s.type === 'expert').length,
        bonus: allSchedule.filter((s) => ['catchup', 'complimentary', 'online'].includes(s.type)).length
    }), [allSchedule]);

    const renderTypeBadge = (type) => {
        switch (type) {
            case 'lecture':
                return <span className="border border-slate-900 bg-indigo-600 px-2 py-0.5 font-mono text-[10px] font-black text-white uppercase">📖 Core Talk</span>;
            case 'handson':
                return <span className="border border-slate-900 bg-emerald-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">💻 Hands-on Lab</span>;
            case 'expert':
                return <span className="border border-slate-900 bg-purple-600 px-2 py-0.5 font-mono text-[10px] font-black text-white uppercase">🎓 Expert Session</span>;
            case 'online':
                return <span className="border border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">🌐 Pre-Workshop</span>;
            case 'catchup':
                return <span className="border border-slate-900 bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">🔄 Weekly Catch-up</span>;
            case 'complimentary':
                return <span className="border border-slate-900 bg-teal-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">🎁 Complimentary</span>;
            case 'holiday':
                return <span className="border border-slate-900 bg-rose-500 px-2 py-0.5 font-mono text-[10px] font-black text-white uppercase">🌴 Holiday</span>;
            default:
                return null;
        }
    };

    return (
        <article
            className="shadow-brutal-8 anim-pop mt-8 border-4 border-slate-900 bg-white p-5 sm:p-8"
            role="tabpanel"
        >
            {/* Header & Quick Navigation Bar */}
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <span className="inline-block border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase sm:text-xs">
                        ✦ {isSoftware ? 'SOFTWARE & AUTONOMOUS SUBSYSTEM DECK' : 'ELECTRONICS & POWERTRAIN SUBSYSTEM DECK'}
                    </span>
                    <h3 className="mt-2 text-2xl font-black uppercase sm:text-4xl">{track.name}</h3>
                    {track.tagline && (
                        <p className="mt-1 text-sm font-bold text-sky-700 sm:text-lg">{track.tagline}</p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="border-2 border-slate-900 bg-emerald-400 px-3 py-1 font-mono text-xs font-black text-slate-950 uppercase shadow-brutal-2">
                        OFFICIAL SYLLABUS LIVE
                    </span>
                </div>
            </div>

            {/* Quick Navigation Jump Anchors */}
            <nav aria-label="Deck section navigation" className="mt-4 flex flex-wrap items-center gap-2 border-y-2 border-slate-900 py-3">
                <span className="font-mono text-xs font-black text-slate-500 uppercase">Quick Jump:</span>
                <a href="#topics-section" className="press shadow-brutal-2 border-2 border-slate-900 bg-slate-100 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-300">
                    Topics ↓
                </a>
                <a href="#timetable-section" className="press shadow-brutal-2 border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-400">
                    Timetable ({allSchedule.length}) ↓
                </a>
                <a href="#resources-section" className="press shadow-brutal-2 border-2 border-slate-900 bg-slate-100 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-300">
                    Tools &amp; Resources ↓
                </a>
                <a href="#safety-section" className="press shadow-brutal-2 border-2 border-slate-900 bg-slate-100 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-300">
                    Lab Rules ↓
                </a>
            </nav>

            <p className="mt-4 max-w-4xl text-sm leading-relaxed font-bold text-slate-700 sm:text-base">
                {track.overview}
            </p>

            {/* Quick Stats Grid */}
            <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="border-2 border-slate-900 bg-amber-100 p-3 shadow-brutal-2">
                    <dt className="font-mono text-[10px] font-black tracking-widest text-slate-600 uppercase">Dates</dt>
                    <dd className="mt-1 text-xs font-black text-slate-950 sm:text-sm">{track.dates}</dd>
                </div>
                <div className="border-2 border-slate-900 bg-sky-100 p-3 shadow-brutal-2">
                    <dt className="font-mono text-[10px] font-black tracking-widest text-slate-600 uppercase">Schedule</dt>
                    <dd className="mt-1 text-xs font-black text-slate-950 sm:text-sm">{track.days}</dd>
                </div>
                <div className="border-2 border-slate-900 bg-amber-100 p-3 shadow-brutal-2">
                    <dt className="font-mono text-[10px] font-black tracking-widest text-slate-600 uppercase">Session Timing</dt>
                    <dd className="mt-1 text-xs font-black text-slate-950 sm:text-sm">{track.timing}</dd>
                </div>
                <div className="border-2 border-slate-900 bg-emerald-100 p-3 shadow-brutal-2">
                    <dt className="font-mono text-[10px] font-black tracking-widest text-slate-600 uppercase">Primary Venue</dt>
                    <dd className="mt-1 text-xs font-black text-slate-950 sm:text-sm truncate">{track.venue?.split('(')[0] || 'PSG iTech Labs'}</dd>
                </div>
            </dl>

            {/* Topics Covered */}
            <div id="topics-section" className="mt-8">
                <h4 className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                    01 / Core Curriculum Topics
                </h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {track.topics?.map((topic, i) => (
                        <div key={i} className="border-2 border-slate-900 bg-slate-50 p-4 shadow-brutal-3">
                            <span className="font-mono text-[10px] font-black text-sky-700 uppercase">Topic 0{i + 1}</span>
                            <h5 className="mt-1 text-base font-black uppercase text-slate-900">{topic.title}</h5>
                            <ul className="mt-2 space-y-1">
                                {topic.points?.map((pt, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 text-xs font-bold text-slate-600">
                                        <span className="text-amber-600">▪</span>
                                        <span>{pt}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Interactive Session Schedule & Filter Tabs */}
            {allSchedule.length > 0 && (
                <div id="timetable-section" className="mt-10 border-t-4 border-slate-900 pt-8">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                            <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                02 / Subsystem Masterclass Timeline &amp; Interactive Timetable
                            </span>
                            <h4 className="mt-1 text-xl font-black uppercase text-slate-900 sm:text-2xl">
                                Session Schedule ({filteredSchedule.length} of {allSchedule.length})
                            </h4>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                downloadAllIcsFile(
                                    filteredSchedule.map((s) => ({ ...s, track: activeTrack })),
                                    track.name,
                                    { [activeTrack]: track }
                                )
                            }
                            className="press border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black uppercase text-slate-950 shadow-brutal-2 hover:bg-amber-400"
                        >
                            📅 Sync All Sessions to Calendar (.ICS)
                        </button>
                    </div>

                    {/* Timeline Category Filters */}
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveFilter('all')}
                            className={`press border-2 border-slate-900 px-3 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                                activeFilter === 'all'
                                    ? 'bg-slate-900 text-amber-300 shadow-brutal-2'
                                    : 'bg-white text-slate-900 hover:bg-amber-100'
                            }`}
                        >
                            All ({counts.all})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFilter('lecture')}
                            className={`press border-2 border-slate-900 px-3 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                                activeFilter === 'lecture'
                                    ? 'bg-indigo-600 text-white shadow-brutal-2'
                                    : 'bg-indigo-50 text-indigo-950 hover:bg-indigo-100'
                            }`}
                        >
                            📖 Core Talks ({counts.lecture})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFilter('handson')}
                            className={`press border-2 border-slate-900 px-3 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                                activeFilter === 'handson'
                                    ? 'bg-emerald-400 text-slate-950 shadow-brutal-2'
                                    : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
                            }`}
                        >
                            💻 Hands-on Labs ({counts.handson})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFilter('expert')}
                            className={`press border-2 border-slate-900 px-3 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                                activeFilter === 'expert'
                                    ? 'bg-purple-600 text-white shadow-brutal-2'
                                    : 'bg-purple-50 text-purple-950 hover:bg-purple-100'
                            }`}
                        >
                            🎓 Industry Experts ({counts.expert})
                        </button>
                        {counts.bonus > 0 && (
                            <button
                                type="button"
                                onClick={() => setActiveFilter('bonus')}
                                className={`press border-2 border-slate-900 px-3 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                                    activeFilter === 'bonus'
                                        ? 'bg-amber-400 text-slate-950 shadow-brutal-2'
                                        : 'bg-amber-50 text-amber-950 hover:bg-amber-100'
                                }`}
                            >
                                🔄 Bonus &amp; Catch-ups ({counts.bonus})
                            </button>
                        )}
                    </div>

                    {/* Timeline List */}
                    <div className="mt-6 space-y-4">
                        {filteredSchedule.map((item) => {
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedSession(item)}
                                    className={`group cursor-pointer border-3 border-slate-900 p-4 shadow-brutal-4 transition-all hover:border-sky-600 ${
                                        item.type === 'handson'
                                            ? 'bg-emerald-50/70 hover:bg-emerald-100/80'
                                            : item.type === 'expert'
                                            ? 'bg-purple-50/70 hover:bg-purple-100/80'
                                            : item.type === 'holiday'
                                            ? 'bg-rose-50/70 opacity-75'
                                            : 'bg-sky-50/60 hover:bg-sky-100/80'
                                    }`}
                                >
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                    {item.label}
                                                </span>
                                                <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                                    {item.days} ({item.date})
                                                </span>
                                                {renderTypeBadge(item.type)}
                                                {item.subject && (
                                                    <span className="border border-slate-900 bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                                        📚 {item.subject}
                                                    </span>
                                                )}
                                            </div>
                                            <h5 className="text-base font-black uppercase text-slate-900 group-hover:text-sky-900 sm:text-lg">
                                                {item.title}
                                            </h5>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-mono text-xs font-bold text-slate-700">
                                                {item.instructor && item.instructor !== '-' && (
                                                    <span className="flex items-center gap-1 text-slate-900">
                                                        <span>👤 Handled by:</span>
                                                        <strong className="font-black text-sky-800">{item.instructor}</strong>
                                                    </span>
                                                )}
                                                {item.venue && item.venue !== '-' && (
                                                    <span className="flex items-center gap-1 text-slate-700">
                                                        <span>📍 Venue:</span>
                                                        <strong>{item.venue}</strong>
                                                    </span>
                                                )}
                                                {item.project && (
                                                    <span className="flex items-center gap-1 text-emerald-800">
                                                        <span>🚀 Milestone:</span>
                                                        <strong className="font-black">{item.project}</strong>
                                                    </span>
                                                )}
                                            </div>

                                            {item.reportingInstructions && (
                                                <p className="text-xs font-bold text-slate-700 pt-0.5">
                                                    ℹ️ {item.reportingInstructions}
                                                </p>
                                            )}
                                        </div>

                                        {/* Clickable Details Indicator */}
                                        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-2 md:pt-0">
                                            <span className="press shadow-brutal-2 inline-flex items-center gap-1.5 border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase group-hover:bg-amber-300">
                                                <span>View Details &amp; Notes</span>
                                                <span>→</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Session Detail Modal */}
            <SessionDetailModal
                session={selectedSession}
                trackName={track.name}
                student={student}
                isOpen={Boolean(selectedSession)}
                onClose={() => setSelectedSession(null)}
                onTakeQuiz={(sess) => {
                    window.location.hash = `#quiz/${sess.id || 'system-design'}`;
                }}
            />


            {/* Resource Library & Handouts */}
            <div id="resources-section" className="mt-10 border-t-4 border-slate-900 pt-8">
                <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                    03 / Subsystem Software &amp; Tool Setup Guides
                </span>
                <h4 className="mt-1 text-xl font-black uppercase text-slate-900 sm:text-2xl">
                    Resource Library &amp; Documentation
                </h4>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {toolGuides.map((guide, idx) => (
                        <a
                            key={idx}
                            href={guide.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="press group border-2 border-slate-900 bg-white p-4 shadow-brutal-3 no-underline transition-all hover:bg-amber-100"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-black text-sky-700 uppercase">Guide 0{idx + 1}</span>
                                <span className="font-mono text-xs font-black text-slate-900 group-hover:translate-x-0.5">↗</span>
                            </div>
                            <h5 className="mt-1.5 text-sm font-black uppercase text-slate-900">{guide.name}</h5>
                            <p className="mt-1 text-xs font-bold text-slate-600">{guide.desc}</p>
                        </a>
                    ))}
                </div>

                {/* Syllabus PDF download card */}
                {hasSyllabus && (
                    <div className="shadow-brutal-4 mt-6 flex flex-col justify-between gap-3 border-3 border-slate-900 bg-amber-100 p-4 sm:flex-row sm:items-center">
                        <div>
                            <span className="font-mono text-[10px] font-black tracking-wider text-amber-900 uppercase">Official Curriculum Document</span>
                            <h5 className="text-base font-black text-slate-900 uppercase sm:text-lg">
                                {track.name} Official Syllabus &amp; Lab Manual PDF
                            </h5>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {onPreviewSyllabus && (
                                <button
                                    type="button"
                                    onClick={() => onPreviewSyllabus(track.syllabus, track.name)}
                                    className="press shadow-brutal-2 border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-sky-100"
                                >
                                    Preview PDF 👁️
                                </button>
                            )}
                            <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={`${track.id}_syllabus.pdf`}
                                className="press shadow-brutal-2-brand inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-slate-900 px-4 py-2 font-mono text-xs font-black text-amber-300 uppercase no-underline hover:bg-slate-800"
                            >
                                <span>Download PDF</span>
                                <span>↓</span>
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Lab Noticeboard & Guidelines */}
            <div id="safety-section" className="mt-10 border-t-4 border-slate-900 pt-8">
                <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                    04 / Lab Guidelines &amp; Venue Directions
                </span>
                <h4 className="mt-1 text-xl font-black uppercase text-slate-900 sm:text-2xl">
                    Reporting Instructions &amp; Lab Safety
                </h4>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="border-3 border-slate-900 bg-sky-50 p-4 shadow-brutal-3">
                        <span className="font-mono text-[10px] font-black text-sky-700 uppercase">📍 Primary Venue</span>
                        <h5 className="mt-1 text-base font-black text-slate-900 uppercase">{track.venue}</h5>
                        <p className="mt-2 text-xs font-bold text-slate-700 leading-relaxed">
                            {track.reportingInstructions}
                        </p>
                    </div>

                    <div className="border-3 border-slate-900 bg-amber-50 p-4 shadow-brutal-3">
                        <span className="font-mono text-[10px] font-black text-amber-700 uppercase">⚠️ Mandatory Gear &amp; Attendance</span>
                        <h5 className="mt-1 text-base font-black text-slate-900 uppercase">Safety &amp; Hardware Rules</h5>
                        <ul className="mt-2 space-y-1 text-xs font-bold text-slate-700">
                            <li>▪ Closed-toe shoes mandatory inside all laboratory bays.</li>
                            <li>▪ Bring laptop with power chargers for every hands-on lab.</li>
                            <li>▪ Arrive 10 minutes prior to session timing for check-in.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Direct Shortcuts */}
            <div className="mt-10 border-t-4 border-slate-900 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-5 text-white shadow-brutal-6">
                    <div>
                        <span className="font-mono text-[10px] font-black text-amber-300 uppercase">PARTICIPANT ACTIONS</span>
                        <h4 className="text-lg font-black uppercase text-white sm:text-xl">
                            Ready to test your knowledge or submit your project?
                        </h4>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <a
                            href="#quiz"
                            className="press shadow-brutal-2-white inline-flex items-center border-2 border-white bg-amber-400 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-amber-300"
                        >
                            Launch Track Quiz 📝
                        </a>
                        <a
                            href="#workshop-project-submit"
                            className="press shadow-brutal-2-white inline-flex items-center border-2 border-white bg-emerald-400 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-emerald-300"
                        >
                            Submit Mini-Project 🚀
                        </a>
                    </div>
                </div>
            </div>
        </article>
    );
}

function SyllabusPreviewModal({ url, trackName, onClose }) {
    useModal(true, onClose);
    if (!url) return null;

    const isImageKit = typeof url === 'string' && url.includes('ik.imagekit.io');
    const downloadUrl = isImageKit ? `${url}${url.includes('?') ? '&' : '?'}ik-attachment=true` : url;

    return createPortal(
        <div
            className="anim-fade fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-2 backdrop-blur-sm sm:p-6"
            onClick={onClose}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={`${trackName} Syllabus PDF Preview`}
        >
            <div
                className="anim-pop-center shadow-brutal-8 flex h-[94dvh] w-full max-w-5xl flex-col border-4 border-slate-900 bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b-4 border-slate-900 bg-slate-900 px-4 py-3 text-white">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="border border-amber-300 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                            Syllabus Viewer
                        </span>
                        <h3 className="truncate font-mono text-sm font-black text-white uppercase sm:text-base">
                            {trackName} • Curriculum PDF
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="press shadow-brutal-2-white hidden cursor-pointer items-center gap-1 border-2 border-white bg-sky-500 px-3 py-1 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-sky-600 sm:inline-flex"
                        >
                            Open in New Tab ↗
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="press flex h-8 w-8 cursor-pointer items-center justify-center border-2 border-white bg-rose-500 font-mono text-sm font-bold text-white hover:bg-rose-600"
                            aria-label="Close Preview"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Frame */}
                <div className="relative flex-1 overflow-hidden bg-slate-100">
                    <iframe
                        src={`${url}#toolbar=1&navpanes=0`}
                        title={`${trackName} Syllabus PDF`}
                        className="h-full w-full border-none"
                    />
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-4 border-slate-900 bg-amber-100 px-4 py-2.5">
                    <p className="truncate font-mono text-xs font-bold text-slate-700">
                        Official Team Asterix workshop curriculum and milestone plan.
                    </p>
                    <div className="flex items-center gap-2">
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={`${trackName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_syllabus.pdf`}
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-sky-100"
                        >
                            Download PDF ↓
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="press cursor-pointer border-2 border-slate-900 bg-slate-900 px-3.5 py-1 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
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
            <span className="mb-1.5 block font-mono text-xs font-black tracking-widest text-slate-700 uppercase">
                {label}
            </span>
            {children}
            {error && <span className="mt-1 block font-mono text-xs font-black text-red-600">{error}</span>}
        </label>
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
            className="anim-pop shadow-brutal-6-go absolute right-3 bottom-full left-3 z-10 mb-2 border-4 border-slate-900 bg-white p-4 sm:right-4 sm:left-auto sm:w-96"
        >
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Close offer"
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center font-black text-slate-500 hover:text-slate-900"
            >
                ✕
            </button>
            <span className="inline-block border-2 border-slate-900 bg-green-400 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase">
                Save {formatAmount(COMBO_SAVING)}
            </span>
            <p className="mt-2 pr-6 text-base leading-tight font-black uppercase">
                Only {formatAmount(offer.extra)} more for {offer.other.name}
            </p>
            <p className="mt-1.5 text-sm font-bold text-slate-600">
                Get both tracks for {formatPrice(COMBO_PACKAGE)}. This {formatAmount(COMBO_SAVING)} saving is
                lost if you don’t add it now.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onAccept}
                    className="press shadow-brutal-3 min-h-11 border-2 border-slate-900 bg-green-400 px-3 py-2 font-mono text-[11px] font-black uppercase hover:bg-green-300"
                >
                    Add both →
                </button>
                <button
                    type="button"
                    onClick={onDecline}
                    className="press min-h-11 border-2 border-slate-900 bg-white px-3 py-2 font-mono text-[11px] font-black uppercase hover:bg-slate-100"
                >
                    Continue with one
                </button>
            </div>
            {/* Arrow pointing down at the button. */}
            <span
                aria-hidden="true"
                className="absolute right-10 -bottom-[11px] h-4 w-4 rotate-45 border-r-4 border-b-4 border-slate-900 bg-white"
            />
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
        const onKey = (e) => {
            if (e.key === 'Escape' && canClose) onClose();
        };
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
            className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm sm:p-6"
            onClick={() => {
                if (canClose) onClose();
            }}
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
                        <span className="block font-mono text-[10px] font-black tracking-widest text-amber-300 uppercase">
                            Workshop 2026
                        </span>
                        <h2
                            id="workshop-register-title"
                            className="truncate text-base font-black uppercase sm:text-lg"
                        >
                            Register for the workshop
                        </h2>
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
                            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 transition-colors ${i > 0 ? 'border-l-2 border-slate-900' : ''} ${
                                i === step
                                    ? 'bg-amber-300 text-slate-900'
                                    : i < step
                                      ? 'bg-sky-100 text-slate-700'
                                      : 'bg-white text-slate-500'
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
                        style={{
                            width: `${slides.length * 100}%`,
                            transform: `translateX(-${(step * 100) / slides.length}%)`
                        }}
                    >
                        {slides.map((slide, i) => (
                            <div
                                key={i}
                                ref={(el) => {
                                    slideRefs.current[i] = el;
                                }}
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
                    <div className="shadow-brutal-4 mb-4 border-3 border-amber-900 bg-amber-100 p-4">
                        <div className="flex items-center gap-2">
                            <span className="border-2 border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                ★ Already Enrolled
                            </span>
                        </div>
                        <h3 className="mt-2 text-base font-black text-slate-900 uppercase">
                            You are already registered for{' '}
                            {upgradePrompt.existingPackage?.toUpperCase() || 'one track'}!
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed font-bold text-slate-700">
                            Want to attend both tracks for complete domain knowledge? You can upgrade your
                            seat to the Dual-Track Combo now for only {upgradePrompt.upgradePrice || 750}.
                        </p>
                        <button
                            type="button"
                            disabled={upgradeBusy || busy}
                            onClick={() =>
                                onUpgrade?.(upgradePrompt.registrationId, {
                                    name: form.name,
                                    email: form.email,
                                    contact: form.phone
                                })
                            }
                            className="press shadow-brutal-3 mt-3 min-h-12 w-full border-2 border-slate-900 bg-amber-400 px-4 py-3 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-300 disabled:opacity-60"
                        >
                            {upgradeBusy
                                ? 'Opening Upgrade Payment…'
                                : `Pay ${upgradePrompt.upgradePrice || 750} & Upgrade to Combo ✦`}
                        </button>
                    </div>
                ) : null}

                <p className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                    Check your details before paying
                </p>
                <dl className="mt-3 divide-y-2 divide-slate-200 border-2 border-slate-900">
                    {rows.map(([label, value]) => (
                        <div
                            key={label}
                            className="grid grid-cols-[6.5rem_1fr] gap-3 p-3 sm:grid-cols-[9rem_1fr]"
                        >
                            <dt className="font-mono text-xs font-black text-slate-500 uppercase">{label}</dt>
                            <dd className="min-w-0 text-sm font-black break-words">{value}</dd>
                        </div>
                    ))}
                    <div className="grid grid-cols-[6.5rem_1fr] gap-3 bg-amber-300 p-3 sm:grid-cols-[9rem_1fr]">
                        <dt className="font-mono text-xs font-black uppercase">Amount</dt>
                        <dd className="font-mono text-lg font-black">
                            {formatPrice(pkg)}
                            {pkg?.id === COMBO_PACKAGE?.id && COMBO_SAVING > 0 && (
                                <span className="ml-2 border-2 border-slate-900 bg-green-400 px-1.5 py-0.5 align-middle text-[10px] uppercase">
                                    You save {formatAmount(COMBO_SAVING)}
                                </span>
                            )}
                        </dd>
                    </div>
                </dl>
                <p className="mt-4 font-mono text-[10px] font-bold text-slate-500 uppercase">
                    Payments are processed by Razorpay. Team Asterix never sees your card or UPI details.
                </p>
            </div>

            <div className="border-t-4 border-slate-900 bg-slate-50 p-3 sm:p-4">
                {error && (
                    <p className="mb-3 border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700">
                        {error}
                    </p>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-3">
                    <button
                        type="button"
                        onClick={onEdit}
                        disabled={busy || upgradeBusy}
                        className="press shadow-brutal-4 min-h-12 border-2 border-slate-900 bg-white px-4 py-3 font-mono text-xs font-black uppercase hover:bg-sky-100 disabled:opacity-50"
                    >
                        ← Edit
                    </button>
                    <button
                        type="button"
                        onClick={onPay}
                        disabled={busy || upgradeBusy || !PAYMENTS_ENABLED}
                        className="press shadow-brutal-4 min-h-12 border-2 border-slate-900 bg-sky-500 px-5 py-3 font-mono text-sm font-black text-slate-950 uppercase hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-sky-500"
                    >
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
function PaymentPanel({
    stage,
    registration,
    form,
    softwareSeats,
    onUpgrade,
    upgradeBusy,
    onRegisterAnother,
    onClose
}) {
    if (stage === 'success' && registration) {
        return (
            <ReceiptPanel
                registration={registration}
                form={form}
                softwareSeats={softwareSeats}
                onUpgrade={onUpgrade}
                upgradeBusy={upgradeBusy}
                onRegisterAnother={onRegisterAnother}
                onClose={onClose}
            />
        );
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
        return (
            <StatusCard
                busy
                title="Confirming your payment…"
                body="Hold on, this only takes a few seconds. Please do not close this page."
            />
        );
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
    const isCombo =
        pkgId === 'combo' ||
        (Array.isArray(tracksEnrolled) &&
            tracksEnrolled.includes('software') &&
            tracksEnrolled.includes('powertrain'));
    const hasSoftware = isCombo || pkgId === 'software' || tracksEnrolled?.includes('software');
    const hasPowertrain = isCombo || pkgId === 'powertrain' || tracksEnrolled?.includes('powertrain');

    return (
        <div className="shadow-brutal-4 mt-4 border-3 border-slate-900 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 font-mono text-xs font-black text-white">
                    💬
                </span>
                <span className="font-mono text-xs font-black tracking-wider text-emerald-950 uppercase">
                    Official WhatsApp Group{isCombo ? 's' : ''}
                </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed font-bold text-slate-700">
                All future updates, meeting links, lab reporting instructions, and study materials will be
                shared here. Please join your track group:
            </p>

            <div className="mt-3 flex flex-col gap-2">
                {hasSoftware && (
                    <a
                        href={WHATSAPP_GROUPS.software.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press shadow-brutal-2 flex items-center justify-between border-2 border-slate-900 bg-[#25D366] px-3.5 py-2.5 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-[#20bd5a]"
                    >
                        <span>Join Software &amp; Perception Group →</span>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">
                            WhatsApp ↗
                        </span>
                    </a>
                )}
                {hasPowertrain && (
                    <a
                        href={WHATSAPP_GROUPS.powertrain.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press shadow-brutal-2 flex items-center justify-between border-2 border-slate-900 bg-[#25D366] px-3.5 py-2.5 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-[#20bd5a]"
                    >
                        <span>Join Electronics &amp; Powertrain Group →</span>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">
                            WhatsApp ↗
                        </span>
                    </a>
                )}
            </div>
        </div>
    );
}

function ReceiptPanel({
    registration,
    form,
    softwareSeats,
    onUpgrade,
    upgradeBusy,
    onRegisterAnother,
    onClose
}) {
    /* The server's public view has no roll number, department or phone, so
       those come from the form just submitted (it is not cleared on success). */
    const isCombo =
        registration.package === 'combo' ||
        (Array.isArray(registration.tracksEnrolled) &&
            registration.tracksEnrolled.includes('software') &&
            registration.tracksEnrolled.includes('powertrain'));
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
                <div className="shadow-brutal-6-go border-4 border-slate-900 bg-white">
                    <div className="border-b-4 border-slate-900 bg-green-400 p-4 sm:p-5">
                        <span className="font-mono text-xs font-black tracking-widest uppercase">
                            ✓ Payment confirmed
                        </span>
                        <p className="mt-1 text-2xl font-black uppercase">
                            You’re in, {registration.name?.split(' ')[0]}!
                        </p>
                    </div>
                    <dl className="divide-y-2 divide-slate-200">
                        {rows.map(([label, value]) => (
                            <div
                                key={label}
                                className={`grid grid-cols-[6.5rem_1fr] gap-3 p-3 sm:grid-cols-[9rem_1fr] ${label === 'Amount paid' ? 'bg-amber-300' : ''}`}
                            >
                                <dt className="font-mono text-xs font-black text-slate-500 uppercase">
                                    {label}
                                </dt>
                                <dd className="min-w-0 font-mono text-sm font-black break-words">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <WhatsAppGroupInvite
                    pkgId={registration.package || form.package}
                    tracksEnrolled={registration.tracksEnrolled}
                />

                {/* Single-track upgrade promotion card: only shown for Powertrain because Powertrain is full and Software participants cannot upgrade to Combo */}
                {!isCombo && (registration.package === 'powertrain' || form.package === 'powertrain') && (
                    <div className="shadow-brutal-4 mt-4 border-3 border-amber-900 bg-amber-100 p-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 font-mono text-xs font-black text-slate-900">
                                ★
                            </span>
                            <span className="font-mono text-xs font-black tracking-wider text-amber-950 uppercase">
                                Complete Domain Knowledge
                            </span>
                        </div>
                        <p className="mt-2 text-sm font-black text-slate-900 uppercase">
                            Upgrade by paying ₹750 and get the Software workshop track
                        </p>
                        <p className="mt-1 text-xs leading-relaxed font-bold text-slate-700">
                            {softwareSeats?.isPaused
                                ? 'Combo upgrades to add the Software track are temporarily paused while our team resolves banking maintenance. Upgrades will resume tomorrow (Monday) at 6:00 AM.'
                                : 'Gain complete domain knowledge across autonomous software (ROS, CV, AI) and powertrain engineering. You can upgrade right now or come back anytime later to upgrade.'}
                        </p>
                        <button
                            type="button"
                            disabled={upgradeBusy || softwareSeats?.isPaused}
                            onClick={() => onUpgrade?.(registration.registrationId || registration._id, form)}
                            className={`press shadow-brutal-3 mt-3 min-h-11 w-full border-2 border-slate-900 px-4 py-2.5 font-mono text-xs font-black uppercase ${
                                softwareSeats?.isPaused
                                    ? 'cursor-not-allowed bg-slate-300 text-slate-600'
                                    : 'cursor-pointer bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-60'
                            }`}
                        >
                            {upgradeBusy
                                ? 'Opening Upgrade Payment…'
                                : softwareSeats?.isPaused
                                  ? '⏸ Upgrades Reopen Monday 6:00 AM'
                                  : 'Upgrade to Combo (₹750) ✦'}
                        </button>
                        <p className="mt-2 text-center font-mono text-[10px] font-bold text-slate-600">
                            💡 You can return anytime to upgrade by looking up your receipt on this site.
                        </p>
                    </div>
                )}

                <p className="mt-4 text-sm font-bold text-slate-600">
                    Keep your receipt handy. Session details will be shared with you before the workshop
                    begins.
                </p>
            </div>

            <div className="border-t-4 border-slate-900 bg-slate-50 p-3 sm:p-4">
                <button
                    type="button"
                    onClick={() => downloadReceipt(rows, fileId)}
                    className="press shadow-brutal-4-go min-h-12 w-full border-2 border-slate-900 bg-slate-900 px-5 py-3.5 font-mono text-sm font-black text-amber-300 uppercase hover:bg-slate-800"
                >
                    Download receipt ↓
                </button>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onRegisterAnother}
                        className="press shadow-brutal-3 min-h-11 border-2 border-slate-900 bg-white px-3 py-2 font-mono text-[11px] font-black uppercase hover:bg-sky-100"
                    >
                        Register another
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="press shadow-brutal-3 min-h-11 border-2 border-slate-900 bg-amber-300 px-3 py-2 font-mono text-[11px] font-black uppercase hover:bg-amber-400"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

function UpgradeModal({ onClose, softwareSeats }) {
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
                const single =
                    data.receipts.find((r) => r.package === 'powertrain') ||
                    data.receipts.find((r) => r.package === 'software');
                setFoundRecord(single || data.receipts[0]);
            } else {
                setError(
                    data.error ||
                        'No registered participant found with these details. Please double-check and try again.'
                );
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
                        setError(
                            verifyRes.data?.error ||
                                'Upgrade payment recorded but verification pending. Please refresh or contact support.'
                        );
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
            className="anim-fade fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6"
            onClick={onClose}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
        >
            <div
                className="anim-pop-center shadow-brutal-10-brand flex max-h-[92dvh] w-full max-w-lg flex-col border-4 border-slate-900 bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
                    <div className="min-w-0">
                        <span className="block font-mono text-[10px] font-black tracking-widest text-amber-300 uppercase">
                            ★ Instant Workshop Upgrade
                        </span>
                        <h2
                            id="upgrade-modal-title"
                            className="truncate text-base font-black uppercase sm:text-lg"
                        >
                            Upgrade to Dual-Track Combo
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="press press-flat flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border-2 border-white bg-rose-500 font-sans text-base font-bold text-white hover:bg-rose-600"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    {/* Success State */}
                    {successRecord ? (
                        <div className="space-y-4">
                            <div className="border-3 border-emerald-700 bg-emerald-50 p-4 text-emerald-950">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🎉</span>
                                    <h3 className="font-mono text-sm font-black uppercase">
                                        Upgrade Successful!
                                    </h3>
                                </div>
                                <p className="mt-1 text-xs font-bold text-emerald-800">
                                    You are now fully enrolled in the{' '}
                                    <strong className="font-black text-emerald-950">
                                        Dual-Track Combo (Software + Powertrain)
                                    </strong>
                                    . Your receipt has been updated to ₹1,750.
                                </p>
                            </div>

                            <dl className="divide-y-2 divide-slate-200 border-2 border-slate-900">
                                {receiptRows(successRecord).map(([label, value]) => (
                                    <div
                                        key={label}
                                        className={`grid grid-cols-[6.5rem_1fr] gap-3 p-2 sm:grid-cols-[8rem_1fr] ${label === 'Amount paid' ? 'bg-amber-300' : ''}`}
                                    >
                                        <dt className="font-mono text-[11px] font-black text-slate-500 uppercase">
                                            {label}
                                        </dt>
                                        <dd className="min-w-0 font-mono text-sm font-black break-words">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>

                            <WhatsAppGroupInvite pkgId="combo" tracksEnrolled={['software', 'powertrain']} />

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadReceipt(
                                            receiptRows(successRecord),
                                            successRecord.receiptNo || successRecord.registrationId
                                        )
                                    }
                                    className="press shadow-brutal-4-brand min-h-12 w-full cursor-pointer border-2 border-slate-900 bg-slate-900 px-5 py-3 font-mono text-sm font-black text-amber-300 uppercase hover:bg-slate-800"
                                >
                                    Download Upgraded Receipt ↓
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="press min-h-10 w-full cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : foundRecord ? (
                        /* Found Registration State */
                        <div className="space-y-4">
                            {foundRecord.package === 'combo' ||
                            (Array.isArray(foundRecord.tracksEnrolled) &&
                                foundRecord.tracksEnrolled.includes('software') &&
                                foundRecord.tracksEnrolled.includes('powertrain')) ? (
                                <div className="border-3 border-sky-600 bg-sky-50 p-4">
                                    <span className="mb-1 block font-mono text-[11px] font-black text-sky-900 uppercase">
                                        ✦ Already Enrolled in Combo
                                    </span>
                                    <p className="text-sm font-black text-slate-900">
                                        {foundRecord.name} ({foundRecord.rollNo})
                                    </p>
                                    <p className="mt-1 text-xs font-bold text-slate-700">
                                        You are already registered for the Dual-Track Combo package! No
                                        upgrade required.
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                downloadReceipt(
                                                    receiptRows(foundRecord),
                                                    foundRecord.receiptNo || foundRecord.registrationId
                                                )
                                            }
                                            className="press shadow-brutal-2-brand cursor-pointer border-2 border-slate-900 bg-slate-900 px-4 py-2 font-mono text-xs font-black text-amber-300 uppercase"
                                        >
                                            Download Receipt ↓
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFoundRecord(null)}
                                            className="press cursor-pointer border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs font-black text-slate-900 uppercase"
                                        >
                                            Search another
                                        </button>
                                    </div>
                                </div>
                            ) : foundRecord.package === 'software' ? (
                                /* When Software: Powertrain slots are completed, so don't show upgrade option to combo */
                                <div className="border-3 border-slate-900 bg-slate-100 p-4">
                                    <div className="flex items-center gap-2 border-b-2 border-slate-300 pb-2">
                                        <span className="border border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                            Enrolled in Software Track
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-sm font-black text-slate-900 uppercase">
                                            {foundRecord.name}
                                        </p>
                                        <p className="font-mono text-xs font-bold text-slate-600">
                                            Roll No: {foundRecord.rollNo}
                                        </p>
                                        <div className="mt-3 space-y-1 border-2 border-rose-600 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-950">
                                            <p className="font-black text-rose-700 uppercase">
                                                ✕ Combo Upgrade Unavailable
                                            </p>
                                            <p>
                                                You are registered for the Software &amp; Autonomous Systems
                                                track. Because Electronics &amp; Powertrain slots are 100%
                                                full (160/160 seats completed), upgrades from Software to
                                                Combo are not available.
                                            </p>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadReceipt(
                                                        receiptRows(foundRecord),
                                                        foundRecord.receiptNo || foundRecord.registrationId
                                                    )
                                                }
                                                className="press shadow-brutal-2-brand cursor-pointer border-2 border-slate-900 bg-slate-900 px-4 py-2 font-mono text-xs font-black text-amber-300 uppercase"
                                            >
                                                Download Receipt ↓
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFoundRecord(null);
                                                    setError('');
                                                }}
                                                className="press cursor-pointer border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs font-black text-slate-900 uppercase"
                                            >
                                                Search another
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="shadow-brutal-3 border-3 border-slate-900 bg-amber-50 p-4">
                                        <div className="flex items-center justify-between gap-2 border-b-2 border-slate-300 pb-2">
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase">
                                                    {foundRecord.name}
                                                </p>
                                                <p className="font-mono text-xs font-bold text-slate-600">
                                                    Roll No: {foundRecord.rollNo}
                                                </p>
                                            </div>
                                            <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                                                Paid ₹{foundRecord.amount || 1000}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                                            <div className="border border-slate-200 bg-white p-2.5">
                                                <span className="block text-[10px] font-black text-slate-500 uppercase">
                                                    Enrolled In
                                                </span>
                                                <strong className="mt-0.5 block font-black text-slate-900">
                                                    Electronics &amp; Powertrain
                                                </strong>
                                                <span className="mt-1 block text-[10px] text-slate-600">
                                                    Single Track
                                                </span>
                                            </div>
                                            <div className="border border-slate-900 bg-amber-300 p-2.5">
                                                <span className="block text-[10px] font-black text-amber-950 uppercase">
                                                    Upgrading To
                                                </span>
                                                <strong className="mt-0.5 block font-black text-slate-950">
                                                    Dual-Track Combo
                                                </strong>
                                                <span className="mt-1 block text-[10px] font-bold text-amber-950">
                                                    Software + Powertrain
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost breakdown */}
                                    <div className="flex items-center justify-between border-2 border-slate-900 bg-slate-900 p-3.5 text-white">
                                        <div>
                                            <span className="block font-mono text-[10px] font-black text-amber-300 uppercase">
                                                Upgrade Amount
                                            </span>
                                            <span className="text-2xl font-black">₹750</span>
                                            <span className="block font-mono text-[10px] text-slate-300">
                                                Total ₹1,750 Combo Value (Save ₹250)
                                            </span>
                                        </div>
                                        <div className="text-right font-mono text-[11px] font-bold text-emerald-400">
                                            ⚡ Instant Confirmation
                                            <br />
                                            Claims 1 of {softwareSeats?.seatsLeft ?? 15} Software Seats
                                        </div>
                                    </div>

                                    {error && (
                                        <p
                                            className="border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700"
                                            role="alert"
                                        >
                                            {error}
                                        </p>
                                    )}

                                    {softwareSeats?.isPaused ? (
                                        <div className="space-y-2">
                                            <div className="border-2 border-amber-800 bg-amber-100 p-2.5 font-mono text-xs font-bold text-amber-950">
                                                ⏸ Combo upgrades to add the Software track are temporarily
                                                paused while banking maintenance is underway. Upgrades reopen
                                                tomorrow (Monday) morning at 6:00 AM.
                                            </div>
                                            <button
                                                type="button"
                                                disabled
                                                className="min-h-12 w-full cursor-not-allowed border-2 border-slate-900 bg-slate-300 px-5 py-3.5 font-mono text-sm font-black text-slate-600 uppercase"
                                            >
                                                ⏸ Upgrades Reopen Monday 6:00 AM
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={upgradeBusy}
                                            onClick={handleUpgradePayment}
                                            className="press shadow-brutal-4-brand min-h-12 w-full cursor-pointer border-2 border-slate-900 bg-amber-400 px-5 py-3.5 font-mono text-sm font-black text-slate-950 uppercase hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {upgradeBusy
                                                ? 'Opening Payment…'
                                                : 'Pay ₹750 & Upgrade to Combo ✦'}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFoundRecord(null);
                                            setError('');
                                        }}
                                        className="w-full cursor-pointer text-center font-mono text-xs font-black text-sky-700 uppercase underline"
                                    >
                                        ← Look up another registration
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Initial Search Form */
                        <form onSubmit={handleSearch} noValidate className="space-y-4">
                            {softwareSeats?.isPaused && (
                                <div className="border-2 border-amber-800 bg-amber-100 p-3 font-mono text-xs font-bold text-amber-950">
                                    ⏸ <strong>Note:</strong> Combo upgrades are temporarily paused and will
                                    reopen tomorrow (Monday) morning at 6:00 AM alongside Software track
                                    registrations.
                                </div>
                            )}

                            <div className="shadow-brutal-2 border-2 border-slate-900 bg-amber-100 p-3.5">
                                <h3 className="font-mono text-xs font-black text-amber-950 uppercase">
                                    ★ Already Registered for Electronics &amp; Powertrain?
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-800">
                                    {softwareSeats?.isPaused
                                        ? 'Pay just ₹750 to unlock the Software & Autonomous Systems track and get the full Combo experience! Upgrades reopen tomorrow (Monday) at 6:00 AM.'
                                        : "Pay just ₹750 to unlock the Software & Autonomous Systems track and get the full Combo experience! You'll master ROS, Computer Vision, ML, and autonomous vehicle system design."}
                                </p>
                            </div>

                            <Field label="College Roll No, Reg No, Email, or Phone">
                                <input
                                    className={inputClass(false)}
                                    value={lookupQuery}
                                    onChange={(e) => {
                                        setLookupQuery(e.target.value);
                                        setError('');
                                    }}
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    enterKeyHint="search"
                                    maxLength={80}
                                    placeholder="e.g. 26m125 / 7207960077 / email"
                                />
                            </Field>

                            {error && (
                                <p
                                    className="border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={busy}
                                className="press shadow-brutal-4 min-h-12 w-full cursor-pointer border-2 border-slate-900 bg-amber-400 px-5 py-3.5 font-mono text-sm font-black text-slate-950 uppercase hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
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
function ReceiptLookupDialog({ onClose, softwareSeats }) {
    const [lookup, setLookup] = useState({ rollNo: '', phone: '' });
    const [busy, setBusy] = useState(false);
    const [upgradeBusyId, setUpgradeBusyId] = useState(null);
    const [error, setError] = useState('');
    const [receipts, setReceipts] = useState(null);
    useModal(true, onClose);

    const update = (key, value) => {
        setLookup((prev) => ({ ...prev, [key]: value }));
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
                setError(
                    data.error || 'No paid registration found. Please check your details and try again.'
                );
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
                        setReceipts((prev) =>
                            prev.map((r) =>
                                r.registrationId === record.registrationId
                                    ? {
                                          ...r,
                                          ...verifyRes.data.registration,
                                          package: 'combo',
                                          packageName: 'Dual-Track Combo',
                                          tracksEnrolled: ['software', 'powertrain'],
                                          amount: 1750
                                      }
                                    : r
                            )
                        );
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
            className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6"
            onClick={onClose}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-labelledby="workshop-receipt-title"
        >
            <div
                className="anim-pop-center shadow-brutal-10-go flex max-h-[90dvh] w-full max-w-lg flex-col border-4 border-slate-900 bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
                    <div className="min-w-0">
                        <span className="block font-mono text-[10px] font-black tracking-widest text-green-400 uppercase">
                            Already registered?
                        </span>
                        <h2
                            id="workshop-receipt-title"
                            className="truncate text-base font-black uppercase sm:text-lg"
                        >
                            Check registration & receipt
                        </h2>
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
                            {receipts.map((record) => {
                                const isCombo =
                                    record.package === 'combo' ||
                                    (Array.isArray(record.tracksEnrolled) &&
                                        record.tracksEnrolled.includes('software') &&
                                        record.tracksEnrolled.includes('powertrain'));
                                const rows = receiptRows(record);
                                return (
                                    <div key={record.registrationId}>
                                        <dl className="divide-y-2 divide-slate-200 border-2 border-slate-900">
                                            {rows.map(([label, value]) => (
                                                <div
                                                    key={label}
                                                    className={`grid grid-cols-[6.5rem_1fr] gap-3 p-2.5 sm:grid-cols-[8rem_1fr] ${label === 'Amount paid' ? 'bg-amber-300' : ''}`}
                                                >
                                                    <dt className="font-mono text-[11px] font-black text-slate-500 uppercase">
                                                        {label}
                                                    </dt>
                                                    <dd className="min-w-0 font-mono text-sm font-black break-words">
                                                        {value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                        <WhatsAppGroupInvite
                                            pkgId={record.package}
                                            tracksEnrolled={record.tracksEnrolled}
                                        />

                                        {/* Upgrade Option: Only shown for Powertrain participants since Powertrain is full and Software participants cannot upgrade to Combo */}
                                        {!isCombo && record.package === 'powertrain' && (
                                            <div className="shadow-brutal-3 mt-3 border-2 border-slate-900 bg-amber-100 p-3.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono text-[11px] font-black text-amber-950 uppercase">
                                                        ★ Complete Domain Knowledge
                                                    </span>
                                                    <span className="border border-slate-900 bg-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-black">
                                                        ₹750 only
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs leading-relaxed font-bold text-slate-700">
                                                    {softwareSeats?.isPaused
                                                        ? 'Combo upgrades to add the Software track are temporarily paused while our team resolves banking maintenance. Upgrades reopen tomorrow (Monday) at 6:00 AM.'
                                                        : 'Upgrade by paying ₹750 to add the Software & Autonomous Systems track and gain complete domain knowledge across both domains!'}
                                                </p>
                                                <button
                                                    type="button"
                                                    disabled={
                                                        upgradeBusyId === record.registrationId ||
                                                        softwareSeats?.isPaused
                                                    }
                                                    onClick={() => handleLookupUpgrade(record)}
                                                    className={`press shadow-brutal-2 mt-2.5 min-h-11 w-full border-2 border-slate-900 px-4 py-2 font-mono text-xs font-black uppercase ${
                                                        softwareSeats?.isPaused
                                                            ? 'cursor-not-allowed bg-slate-300 text-slate-600'
                                                            : 'cursor-pointer bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-60'
                                                    }`}
                                                >
                                                    {upgradeBusyId === record.registrationId
                                                        ? 'Opening Upgrade…'
                                                        : softwareSeats?.isPaused
                                                          ? '⏸ Upgrades Reopen Monday 6:00 AM'
                                                          : 'Upgrade to Combo (₹750) ✦'}
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                downloadReceipt(
                                                    rows,
                                                    record.receiptNo || record.registrationId
                                                )
                                            }
                                            className="press shadow-brutal-4-go mt-3 min-h-12 w-full border-2 border-slate-900 bg-slate-900 px-5 py-3.5 font-mono text-sm font-black text-amber-300 uppercase hover:bg-slate-800"
                                        >
                                            Download receipt ↓
                                        </button>
                                    </div>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setReceipts(null)}
                                className="font-mono text-xs font-black text-sky-700 uppercase underline"
                            >
                                ← Look up a different registration
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            <p className="text-sm font-bold text-slate-700">
                                Enter your{' '}
                                <span className="font-black text-slate-900">
                                    College Roll No, Reg No, or Email
                                </span>{' '}
                                to find and download your receipt.
                            </p>

                            <Field label="Option 1: Roll No, University Reg No, or College Email">
                                <input
                                    className={inputClass(false)}
                                    value={lookup.rollNo}
                                    onChange={(e) => update('rollNo', e.target.value)}
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
                                <span className="relative bg-white px-3 font-mono text-xs font-black text-slate-500 uppercase">
                                    — OR —
                                </span>
                            </div>

                            <Field label="Option 2: Registered Phone Number">
                                <input
                                    className={inputClass(false)}
                                    type="tel"
                                    inputMode="tel"
                                    value={lookup.phone}
                                    onChange={(e) => update('phone', e.target.value)}
                                    autoComplete="tel"
                                    enterKeyHint="search"
                                    maxLength={20}
                                    placeholder="10-digit mobile number"
                                />
                            </Field>

                            {error && (
                                <p
                                    className="border-2 border-red-600 bg-red-50 p-2.5 font-mono text-xs font-black text-red-700"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={busy}
                                className="press shadow-brutal-4 min-h-12 w-full border-2 border-slate-900 bg-green-400 px-5 py-3.5 font-mono text-sm font-black uppercase hover:bg-green-300 disabled:cursor-wait disabled:opacity-60"
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
            <div className="shadow-brutal-8 w-full border-4 border-slate-900 bg-white p-6" role="status">
                {busy && (
                    <span
                        className="mb-4 block h-8 w-8 animate-spin border-4 border-slate-900 border-t-amber-300"
                        aria-hidden="true"
                    />
                )}
                <p className="text-xl font-black uppercase">{title}</p>
                <p className="mt-2 text-sm font-bold text-slate-600">{body}</p>
            </div>
        </div>
    );
}
