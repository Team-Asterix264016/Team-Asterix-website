import { createContext, useContext, useState, useEffect } from 'react';
import { useWebsiteData } from './WebsiteDataContext';

const CommunityAuthContext = createContext();

const COMMUNITY_AUTH_KEY = 'asterix_community_session_v2';
const COMMUNITY_MESSAGES_KEY = 'asterix_community_messages_v1';
const COMMUNITY_ENDORSEMENTS_KEY = 'asterix_community_endorsements_v1';
const COMMUNITY_PINS_KEY = 'asterix_community_pins_v1';
const COMMUNITY_PRAISE_KEY = 'asterix_community_praise_v1';

const DEFAULT_PINS = [
    {
        id: 'pin-1',
        memberId: 'mem-default',
        rollNo: '24ME042',
        title: 'ROS2 LiDAR PointCloud Cluster & Filter Node',
        category: 'code',
        url: 'https://github.com/Team-Asterix264016/',
        description: 'Real-time 3D voxel filtering & clustering algorithm processing Ouster LiDAR telemetry at 30 FPS.',
        date: 'Oct 2026',
        reactions: { torque: 18, clean: 14, brain: 10 }
    },
    {
        id: 'pin-2',
        memberId: 'mem-default',
        rollNo: '24ME042',
        title: 'Baja SAE Off-Road Gearbox Assembly CAD',
        category: 'cad',
        url: 'https://cad.onshape.com/',
        description: 'Lightweight 7075-T6 aluminum differential casing engineered for 45° incline torque delivery.',
        date: 'Sep 2026',
        reactions: { torque: 24, clean: 12, brain: 16 }
    }
];

const DEFAULT_PRAISE = [
    {
        id: 'praise-1',
        recipientId: 'mem-default',
        rollNo: '24ME042',
        authorName: 'Preethika S.',
        authorRole: 'Autonomous Perception Lead',
        authorAvatar: 'P',
        comment: 'Optimized our CUDA point cloud filter during track testing. Super quick problem solver and great team collaborator!',
        date: '5 Oct 2026'
    },
    {
        id: 'praise-2',
        recipientId: 'mem-default',
        rollNo: '24ME042',
        authorName: 'Joel R.',
        authorRole: 'Powertrain Lead',
        authorAvatar: 'J',
        comment: 'Helped inspect differential gear backlash during assembly night. Extremely thorough with torque specs!',
        date: '3 Oct 2026'
    }
];

export function CommunityAuthProvider({ children }) {
    const { siteData } = useWebsiteData();
    const registrations = siteData?.workshop?.registrations || [];

    const [currentMember, setCurrentMember] = useState(() => {
        try {
            const saved = localStorage.getItem(COMMUNITY_AUTH_KEY);
            if (saved) return JSON.parse(saved);
            // Fallback: check if workshop student session exists
            const wsStudent = localStorage.getItem('workshop_student');
            if (wsStudent) {
                const parsed = JSON.parse(wsStudent);
                if (parsed.rollNo || parsed.email || parsed.phone) {
                    return null; // Will trigger sync effect below
                }
            }
            return null;
        } catch {
            return null;
        }
    });

    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(COMMUNITY_MESSAGES_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [endorsements, setEndorsements] = useState(() => {
        try {
            const saved = localStorage.getItem(COMMUNITY_ENDORSEMENTS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [showcasePins, setShowcasePins] = useState(() => {
        try {
            const saved = localStorage.getItem(COMMUNITY_PINS_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_PINS;
        } catch {
            return DEFAULT_PINS;
        }
    });

    const [praiseList, setPraiseList] = useState(() => {
        try {
            const saved = localStorage.getItem(COMMUNITY_PRAISE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_PRAISE;
        } catch {
            return DEFAULT_PRAISE;
        }
    });

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isMessagingDrawerOpen, setIsMessagingDrawerOpen] = useState(false);
    const [activeChatMember, setActiveChatMember] = useState(null);

    useEffect(() => {
        if (currentMember) {
            try {
                localStorage.setItem(COMMUNITY_AUTH_KEY, JSON.stringify(currentMember));
            } catch {}
        } else {
            try {
                localStorage.removeItem(COMMUNITY_AUTH_KEY);
            } catch {}
        }
    }, [currentMember]);

    useEffect(() => {
        try {
            localStorage.setItem(COMMUNITY_MESSAGES_KEY, JSON.stringify(messages));
        } catch {}
    }, [messages]);

    useEffect(() => {
        try {
            localStorage.setItem(COMMUNITY_ENDORSEMENTS_KEY, JSON.stringify(endorsements));
        } catch {}
    }, [endorsements]);

    useEffect(() => {
        try {
            localStorage.setItem(COMMUNITY_PINS_KEY, JSON.stringify(showcasePins));
        } catch {}
    }, [showcasePins]);

    useEffect(() => {
        try {
            localStorage.setItem(COMMUNITY_PRAISE_KEY, JSON.stringify(praiseList));
        } catch {}
    }, [praiseList]);

    // Calculate level and rank based on XP
    const calculateRank = (xp) => {
        if (xp >= 1000) return { level: 5, rank: 'R&D Fellow', badgeBg: 'bg-rose-400 text-slate-900' };
        if (xp >= 600) return { level: 4, rank: 'Lead Engineer', badgeBg: 'bg-indigo-400 text-white' };
        if (xp >= 300) return { level: 3, rank: 'Specialist', badgeBg: 'bg-sky-400 text-slate-900' };
        if (xp >= 100) return { level: 2, rank: 'Apprentice', badgeBg: 'bg-amber-300 text-slate-900' };
        return { level: 1, rank: 'Cadet', badgeBg: 'bg-slate-200 text-slate-800' };
    };

    // Auto-login or create session matching roll number or mobile phone
    const loginWithRollOrPhone = (identifier) => {
        const query = identifier.trim().toLowerCase();
        if (!query) return { success: false, message: 'Please enter a Roll Number or Phone Number.' };

        // Search workshop registrations
        const matched = registrations.find(reg => 
            (reg.rollNo && reg.rollNo.trim().toLowerCase() === query) ||
            (reg.phone && reg.phone.trim().replaceAll(/[^0-9]/g, '') === query.replaceAll(/[^0-9]/g, '')) ||
            (reg.email && reg.email.trim().toLowerCase() === query)
        );

        let memberObj;
        if (matched) {
            memberObj = {
                id: matched._id || matched.rollNo || `mem-${Date.now()}`,
                name: matched.name,
                rollNo: matched.rollNo || 'N/A',
                phone: matched.phone || 'N/A',
                email: matched.email || 'N/A',
                college: matched.college || 'PSG iTech',
                department: matched.department || 'Engineering',
                track: matched.trackId || 'software-perception',
                packageLabel: matched.packageLabel || 'Standard Workshop Package',
                isWorkshopVerified: matched.attended || matched.paymentStatus === 'PAID',
                attendanceStatus: matched.attended ? 'PRESENT & VERIFIED' : 'REGISTERED',
                xp: 320,
                joinedDate: '2026',
                bio: 'Autonomous Mobility & Robotics Engineering student at PSG iTech.',
                skills: ['ROS2', 'SolidWorks', 'LiDAR', 'C++', 'Python'],
                mentorshipStatus: 'AVAILABLE', // 'AVAILABLE' | 'LIMITED' | 'NONE'
                mentorshipTopics: ['ROS2', 'SolidWorks CAD', 'C++'],
                avatar: matched.name ? matched.name[0].toUpperCase() : 'A'
            };
        } else {
            // Create a general student/community member profile
            memberObj = {
                id: `mem-${Date.now()}`,
                name: identifier.includes('@') ? identifier.split('@')[0] : identifier,
                rollNo: identifier.match(/^[0-9]{2}[A-Z]{2}[0-9]{2,3}$/i) ? identifier.toUpperCase() : '24ME042',
                phone: identifier.replaceAll(/[^0-9]/g, '').length >= 10 ? identifier : '+91 98765 43210',
                email: identifier.includes('@') ? identifier : `${identifier.toLowerCase()}@psgitech.ac.in`,
                college: 'PSG iTech',
                department: 'Robotics R&D',
                track: 'software-perception',
                packageLabel: 'Community Developer',
                isWorkshopVerified: false,
                attendanceStatus: 'COMMUNITY MEMBER',
                xp: 210,
                joinedDate: '2026',
                bio: 'Passionate student developer contributing to Team Asterix community.',
                skills: ['ROS2', 'Python', 'CAD', 'Embedded'],
                mentorshipStatus: 'AVAILABLE',
                mentorshipTopics: ['Python', 'CAD'],
                avatar: identifier[0].toUpperCase()
            };
        }

        const rankInfo = calculateRank(memberObj.xp);
        const finalMember = { ...memberObj, ...rankInfo };

        setCurrentMember(finalMember);

        // Sync back to Workshop Student session in localStorage
        try {
            localStorage.setItem('workshop_student', JSON.stringify({
                rollNo: finalMember.rollNo,
                name: finalMember.name,
                email: finalMember.email,
                phone: finalMember.phone,
                college: finalMember.college,
                department: finalMember.department,
                track: finalMember.track
            }));
            if (!localStorage.getItem('workshop_jwt')) {
                localStorage.setItem('workshop_jwt', 'community_synced_token');
            }
        } catch {}

        setIsLoginModalOpen(false);
        setIsProfileModalOpen(true);
        return { success: true, member: finalMember };
    };

    // Auto-sync workshop login into community profile on startup
    useEffect(() => {
        if (!currentMember) {
            try {
                const wsStudent = localStorage.getItem('workshop_student');
                if (wsStudent) {
                    const parsed = JSON.parse(wsStudent);
                    const idVal = parsed.rollNo || parsed.email || parsed.phone;
                    if (idVal) {
                        loginWithRollOrPhone(idVal);
                    }
                }
            } catch {}
        }
    }, []);

    const logout = () => {
        setCurrentMember(null);
        try {
            localStorage.removeItem(COMMUNITY_AUTH_KEY);
            localStorage.removeItem('workshop_student');
            localStorage.removeItem('workshop_jwt');
        } catch {}
        setIsProfileModalOpen(false);
        setIsMessagingDrawerOpen(false);
    };

    const addXP = (amount) => {
        if (!currentMember) return;
        setCurrentMember(prev => {
            const newXP = (prev.xp || 0) + amount;
            const rankInfo = calculateRank(newXP);
            return { ...prev, xp: newXP, ...rankInfo };
        });
    };

    const sendDirectMessage = (recipientName, text) => {
        if (!text.trim() || !currentMember) return;
        const newMsg = {
            id: `msg-${Date.now()}`,
            senderId: currentMember.id,
            senderName: currentMember.name,
            recipientName,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [newMsg, ...prev]);
        addXP(15);
    };

    const endorseMember = (memberId, skill) => {
        setEndorsements(prev => {
            const memberObj = prev[memberId] || {};
            const currentSkillCount = memberObj[skill] || 0;
            return {
                ...prev,
                [memberId]: {
                    ...memberObj,
                    [skill]: currentSkillCount + 1
                }
            };
        });
        addXP(10);
    };

    const addShowcasePin = ({ title, category, url, description }) => {
        if (!title.trim()) return;
        const newPin = {
            id: `pin-${Date.now()}`,
            memberId: currentMember?.id || 'mem-default',
            rollNo: currentMember?.rollNo || '24ME042',
            title: title.trim(),
            category: category || 'code',
            url: url.trim() || 'https://github.com/Team-Asterix264016/',
            description: description.trim() || 'Engineering project artifact pinned to community profile.',
            date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            reactions: { torque: 1, clean: 1, brain: 1 }
        };
        setShowcasePins(prev => [newPin, ...prev]);
        addXP(50); // Award 50 XP for pinning project!
    };

    const reactToPin = (pinId, reactionType) => {
        setShowcasePins(prev =>
            prev.map(pin => {
                if (pin.id === pinId) {
                    const currentCount = pin.reactions?.[reactionType] || 0;
                    return {
                        ...pin,
                        reactions: {
                            ...pin.reactions,
                            [reactionType]: currentCount + 1
                        }
                    };
                }
                return pin;
            })
        );
        addXP(5);
    };

    const updateMentorshipStatus = (status, topics) => {
        if (!currentMember) return;
        setCurrentMember(prev => ({
            ...prev,
            mentorshipStatus: status,
            mentorshipTopics: topics || prev.mentorshipTopics || []
        }));
    };

    const addCrewPraise = (recipientId, comment) => {
        if (!comment.trim() || !currentMember) return;
        const newPraise = {
            id: `praise-${Date.now()}`,
            recipientId,
            rollNo: currentMember.rollNo,
            authorName: currentMember.name,
            authorRole: `${currentMember.rank} (LVL ${currentMember.level})`,
            authorAvatar: currentMember.avatar || 'A',
            comment: comment.trim(),
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        };
        setPraiseList(prev => [newPraise, ...prev]);
        addXP(25); // Award 25 XP for recommending a peer!
    };

    return (
        <CommunityAuthContext.Provider value={{
            currentMember,
            loginWithRollOrPhone,
            logout,
            addXP,
            messages,
            sendDirectMessage,
            endorsements,
            endorseMember,
            showcasePins,
            addShowcasePin,
            reactToPin,
            mentorshipStatus: currentMember?.mentorshipStatus || 'AVAILABLE',
            mentorshipTopics: currentMember?.mentorshipTopics || ['ROS2', 'SolidWorks', 'Python'],
            updateMentorshipStatus,
            praiseList,
            addCrewPraise,
            isProfileModalOpen,
            setIsProfileModalOpen,
            isLoginModalOpen,
            setIsLoginModalOpen,
            isMessagingDrawerOpen,
            setIsMessagingDrawerOpen,
            activeChatMember,
            setActiveChatMember,
            calculateRank
        }}>
            {children}
        </CommunityAuthContext.Provider>
    );
}

export function useCommunityAuth() {
    return useContext(CommunityAuthContext);
}
