import { useState, useEffect, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import useScrollAssembly from './hooks/useScrollAssembly';
import useParallax from './hooks/useParallax';
import CyberNavbar from './components/CyberNavbar';
import IntroScrollSequence from './components/IntroScrollSequence';
import CyberHero from './components/CyberHero';
import MarqueeTicker from './components/MarqueeTicker';
import TheSquad from './components/TheSquad';
import CyberNewsletterCTA from './components/CyberNewsletterCTA';
import CyberFooter from './components/CyberFooter';
import SubsystemDetail from './components/SubsystemDetail';
import FloatingBackground from './components/FloatingBackground';
import WorkshopLoginModal from './components/WorkshopLoginModal';
import { WebsiteDataProvider } from './context/WebsiteDataContext';
import { CommunityAuthProvider } from './context/CommunityAuthContext';
import CommunityLoginModal from './components/community/CommunityLoginModal';
import CommunityProfileModal from './components/community/CommunityProfileModal';
import CommunityMessagingDrawer from './components/community/CommunityMessagingDrawer';

const BajaModelPage = lazy(() => import('./components/BajaModelPage'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const SponsorPage = lazy(() => import('./components/SponsorPage'));
const WorkshopPage = lazy(() => import('./components/WorkshopPage'));
const WorkshopAttendanceProjector = lazy(() => import('./components/admin/WorkshopAttendanceProjector'));
const WorkshopAttendanceCheckin = lazy(() => import('./components/WorkshopAttendanceCheckin'));
const WorkshopProjectSubmissionPage = lazy(() => import('./components/WorkshopProjectSubmissionPage'));
const QuizRunner = lazy(() => import('./components/quiz/QuizRunner'));
const ParticipantProfilePage = lazy(() => import('./components/ParticipantProfilePage'));

function MainApp() {
    const [selectedSubsystem, setSelectedSubsystem] = useState(null);
    const [isModelPage, setIsModelPage] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(() => window.location.hash.startsWith('#admin'));
    const [isSponsorPage, setIsSponsorPage] = useState(() => window.location.hash === '#sponsor');
    const [isWorkshopPage, setIsWorkshopPage] = useState(() => window.location.hash === '#workshop');
    const [isProfilePage, setIsProfilePage] = useState(
        () =>
            window.location.hash === '#workshop-profile' ||
            window.location.hash === '#profile' ||
            window.location.pathname.startsWith('/workshop/profile')
    );
    const [isCommunityPage, setIsCommunityPage] = useState(() => window.location.hash === '#community');
    const [isWorkshopProjectPage, setIsWorkshopProjectPage] = useState(
        () => window.location.hash === '#workshop-project-submit'
    );
    const [isAttendancePage, setIsAttendancePage] = useState(
        () =>
            window.location.hash.startsWith('#attendance') &&
            !window.location.hash.startsWith('#attendance-projector')
    );
    const [isProjectorPage, setIsProjectorPage] = useState(() =>
        window.location.hash.startsWith('#attendance-projector')
    );
    const [isQuizPage, setIsQuizPage] = useState(() => window.location.hash.startsWith('#quiz'));
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [lenisInstance, setLenisInstance] = useState(null);

    const scrollToTop = () => {
        window.scrollTo(0, 0);
        if (window.lenis) {
            window.lenis.scrollTo(0, { immediate: true });
        }
    };

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            // Clear retired recruitment, freshers and submission hashes to prevent broken landing
            if (
                ['#join', '#recruitment', '#freshers-recruitment', '#freshers'].includes(hash) ||
                hash.startsWith('#submit') ||
                hash.startsWith('#recruitment-submit')
            ) {
                window.history.replaceState(null, '', window.location.pathname);
                scrollToTop();
                return;
            }
            setIsAdminOpen(hash.startsWith('#admin'));
            setIsSponsorPage(hash === '#sponsor');
            setIsWorkshopPage(false);
            setIsProfilePage(
                hash === '#workshop-profile' ||
                hash === '#profile' ||
                hash === '#workshop' ||
                window.location.pathname.startsWith('/workshop/profile')
            );
            setIsCommunityPage(hash === '#community');
            setIsWorkshopProjectPage(hash === '#workshop-project-submit');
            setIsAttendancePage(hash.startsWith('#attendance') && !hash.startsWith('#attendance-projector'));
            setIsProjectorPage(hash.startsWith('#attendance-projector'));
            setIsQuizPage(hash.startsWith('#quiz'));
            if (hash === '#model') setIsModelPage(true);
            scrollToTop();
        };

        const initialHash = window.location.hash;
        if (
            ['#join', '#recruitment', '#freshers-recruitment', '#freshers'].includes(initialHash) ||
            initialHash.startsWith('#submit') ||
            initialHash.startsWith('#recruitment-submit')
        ) {
            window.history.replaceState(null, '', window.location.pathname);
        }

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        scrollToTop();
    }, [
        isSponsorPage,
        isWorkshopPage,
        isProfilePage,
        isCommunityPage,
        isWorkshopProjectPage,
        isAttendancePage,
        isProjectorPage,
        isQuizPage,
        selectedSubsystem,
        isModelPage,
        isAdminOpen
    ]);

    useEffect(() => {
        // Readers who ask for reduced motion get the browser's native scroll.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        // Initialize Lenis smooth momentum scrolling
        const lenis = new Lenis({
            duration: 1.6,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 0.9,
            touchMultiplier: 1.5
        });

        // eslint-disable-next-line react/set-state-in-effect
        setLenisInstance(lenis);
        window.lenis = lenis;

        // The frame id has to be tracked across every frame. Capturing only
        // the first one meant cleanup cancelled a frame that had already run,
        // and the loop kept rescheduling itself forever against a destroyed
        // Lenis instance -- twice over, under StrictMode's double mount.
        let rafId = null;

        const raf = (time) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            lenis.destroy();
            setLenisInstance(null);
            window.lenis = null;
        };
    }, []);

    // Activate the global scroll assembly/forming effect across all sections and pages
    useScrollAssembly(lenisInstance, selectedSubsystem);

    // Activate the multi-speed depth parallax & kinetic decal float across all sections
    useParallax(lenisInstance, selectedSubsystem);

    /* Every page here is a boolean, and forgetting one in a handler leaves two
       pages claiming the screen at once. `closeAll` is the single place that
       knows the full set. */
    const closeAll = () => {
        setSelectedSubsystem(null);
        setIsModelPage(false);
        setIsAdminOpen(false);
        setIsSponsorPage(false);
        setIsWorkshopPage(false);
        setIsProfilePage(false);
        setIsCommunityPage(false);
        setIsWorkshopProjectPage(false);
    };

    const handleSelectSubsystem = (id) => {
        closeAll();
        setSelectedSubsystem(id);
        scrollToTop();
    };

    const handleOpenModelViewer = () => {
        closeAll();
        setIsModelPage(true);
        scrollToTop();
    };

    const handleOpenSponsor = () => {
        closeAll();
        setIsSponsorPage(true);
        window.location.hash = '#sponsor';
        scrollToTop();
    };

    const handleOpenWorkshop = () => {
        closeAll();
        setIsProfilePage(true);
        window.location.hash = '#workshop-profile';
        scrollToTop();
    };

    const handleOpenProfile = () => {
        closeAll();
        setIsProfilePage(true);
        window.location.hash = '#workshop-profile';
        scrollToTop();
    };

    const handleOpenCommunity = () => {
        closeAll();
        setIsCommunityPage(true);
        window.location.hash = '#community';
        scrollToTop();
    };

    const handleOpenAdmin = () => {
        closeAll();
        setIsAdminOpen(true);
        window.location.hash = '#admin';
        scrollToTop();
    };

    const handleBackToHome = () => {
        closeAll();
        const hash = window.location.hash;
        if (
            hash.startsWith('#admin') ||
            ['#sponsor', '#workshop', '#workshop-profile', '#profile', '#community', '#workshop-project-submit', '#model'].includes(hash)
        ) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        scrollToTop();
    };

    const pageFallback = (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-900 font-mono text-sky-400">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-400 border-t-transparent"></div>
            <span className="text-xs font-black tracking-widest text-slate-300 uppercase">
                LOADING ASTERIX PORTAL...
            </span>
        </div>
    );

    // Dedicated Full-Screen Admin Management Interface
    if (isAdminOpen) {
        return (
            <Suspense fallback={pageFallback}>
                <AdminDashboard onExit={handleBackToHome} />
            </Suspense>
        );
    }

    if (isProfilePage) {
        return (
            <Suspense fallback={pageFallback}>
                <ParticipantProfilePage onBack={handleBackToHome} onSelectSubsystem={handleSelectSubsystem} />
            </Suspense>
        );
    }

    if (isWorkshopPage) {
        return (
            <Suspense fallback={pageFallback}>
                <WorkshopPage onBack={handleBackToHome} />
            </Suspense>
        );
    }

    if (isCommunityPage) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center">
                <div className="shadow-brutal-8 w-full max-w-lg border-4 border-slate-900 bg-white p-8 sm:p-10">
                    <span className="inline-block border-2 border-slate-900 bg-emerald-300 px-3 py-1 font-mono text-xs font-black text-slate-950 uppercase">
                        Community &amp; Horizon 💬
                    </span>
                    <h1 className="mt-4 text-4xl font-black text-slate-900 uppercase sm:text-5xl">Coming soon</h1>
                    <p className="mt-3 text-sm font-bold text-slate-600">
                        We're building a space for Team Asterix members and workshop participants to share projects
                        and connect. Check back soon.
                    </p>
                    <button
                        type="button"
                        onClick={handleBackToHome}
                        className="press shadow-brutal-3 mt-8 border-2 border-slate-900 bg-amber-300 px-5 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-400"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        );
    }

    if (isWorkshopProjectPage) {
        return (
            <Suspense fallback={pageFallback}>
                <WorkshopProjectSubmissionPage onBack={handleBackToHome} />
            </Suspense>
        );
    }

    if (isProjectorPage) {
        return (
            <Suspense fallback={pageFallback}>
                <WorkshopAttendanceProjector onExit={handleBackToHome} />
            </Suspense>
        );
    }

    if (isAttendancePage) {
        return (
            <Suspense fallback={pageFallback}>
                <WorkshopAttendanceCheckin onGoHome={handleBackToHome} />
            </Suspense>
        );
    }

    if (isQuizPage) {
        return (
            <Suspense fallback={pageFallback}>
                <QuizRunner onBack={handleBackToHome} />
            </Suspense>
        );
    }

    const isDetailPage = Boolean(selectedSubsystem || isSponsorPage || isModelPage);

    const currentPage = isSponsorPage
        ? 'sponsor'
        : isModelPage
          ? 'model'
          : selectedSubsystem
            ? 'subsystem'
            : 'home';

    // Dedicated Full-Screen Sponsorship & Pitch Deck Portal
    if (isSponsorPage) {
        return (
            <Suspense fallback={pageFallback}>
                <SponsorPage onBack={handleBackToHome} />
            </Suspense>
        );
    }

    return (
        <div className="relative min-h-screen overflow-x-clip bg-white font-sans text-slate-900 selection:bg-sky-500 selection:text-white">
            {/* Photorealistic 3D Floating Baja Buggy Canvas & Swimming Goldfish */}
            <FloatingBackground />

            {/* Main Content Layer */}
            <div className="relative z-10">
                {/* Cyberbites Chunky Brutalist Navigation */}
                <CyberNavbar
                    onSelectSubsystem={handleSelectSubsystem}
                    isDetailPage={isDetailPage}
                    currentPage={currentPage}
                    onBackToHome={handleBackToHome}
                    onOpenSponsor={handleOpenSponsor}
                    onOpenCommunity={handleOpenCommunity}
                    onOpenProfile={handleOpenProfile}
                />

                {isModelPage ? (
                    <Suspense fallback={pageFallback}>
                        <BajaModelPage onBack={handleBackToHome} />
                    </Suspense>
                ) : isSponsorPage ? (
                    <Suspense fallback={pageFallback}>
                        <SponsorPage onBack={handleBackToHome} />
                    </Suspense>
                ) : selectedSubsystem ? (
                    /* Dedicated Subsystem Detail Page (Shows all team members, CAD methodology, specs) */
                    <main className="relative z-10 border-b-4 border-slate-900 bg-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.4)]">
                        <SubsystemDetail
                            subsystemId={selectedSubsystem}
                            onBack={handleBackToHome}
                            onSelectSubsystem={handleSelectSubsystem}
                        />
                    </main>
                ) : (
                    /* Main Landing Page Curtain */
                    <main className="relative z-10 border-b-4 border-slate-900 bg-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.4)]">
                        {/* 115-Frame Pre-Rendered Cinema Intro Scroll Sequence */}
                        <IntroScrollSequence />

                        {/* Hero Section with Filled & Stroke Typography, Badges and 3D Baja Inspector Option */}
                        <CyberHero onOpenModelViewer={handleOpenModelViewer} />

                        {/* Infinite Double Marquee Ribbon */}
                        <MarqueeTicker />

                        {/* "THE SQUAD" - Integrated with React Bits <CardSwap /> Component */}
                        <TheSquad onSelectSubsystem={handleSelectSubsystem} />

                        {/* "JOIN THE ALLIANCE" - Brutalist Sponsor / Newsletter Form */}
                        <CyberNewsletterCTA onOpenSponsor={handleOpenSponsor} />

                        {/* Sentinel element to detect when main page finishes scrolling and footer is reached */}
                        <div
                            id="footer-sentinel"
                            className="pointer-events-none h-2 w-full opacity-0"
                            aria-hidden="true"
                        />
                    </main>
                )}

                {/* 4-Column Cyberbites Brutalist Footer */}
                <CyberFooter
                    onOpenAdmin={handleOpenAdmin}
                    onOpenSponsor={handleOpenSponsor}
                    onOpenWorkshop={handleOpenWorkshop}
                />
            </div>

            <WorkshopLoginModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onSuccess={() => {
                    setLoginModalOpen(false);
                    closeAll();
                    setIsWorkshopPage(true);
                    window.location.hash = '#workshop';
                    scrollToTop();
                }}
            />
        </div>
    );
}

export default function App() {
    return (
        <WebsiteDataProvider>
            <CommunityAuthProvider>
                <MainApp />
                <CommunityLoginModal />
                <CommunityProfileModal />
                <CommunityMessagingDrawer />
            </CommunityAuthProvider>
        </WebsiteDataProvider>
    );
}
