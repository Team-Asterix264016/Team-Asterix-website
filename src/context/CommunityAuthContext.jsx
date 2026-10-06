import { createContext, useContext, useState, useEffect } from 'react';
import { useWebsiteData } from './WebsiteDataContext';

const CommunityAuthContext = createContext();

const COMMUNITY_AUTH_KEY = 'asterix_community_session_v2';
const COMMUNITY_MESSAGES_KEY = 'asterix_community_messages_v1';
const COMMUNITY_ENDORSEMENTS_KEY = 'asterix_community_endorsements_v1';

export function CommunityAuthProvider({ children }) {
    const { siteData } = useWebsiteData();
    const registrations = siteData?.workshop?.registrations || [];

    const [currentMember, setCurrentMember] = useState(() => {
        try {
            const saved = localStorage.getItem(COMMUNITY_AUTH_KEY);
            return saved ? JSON.parse(saved) : null;
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
                xp: 280,
                joinedDate: '2026',
                bio: 'Autonomous Mobility & Robotics Engineering student at PSG iTech.',
                skills: ['ROS2', 'SolidWorks', 'LiDAR', 'C++', 'Python'],
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
                xp: 150,
                joinedDate: '2026',
                bio: 'Passionate student developer contributing to Team Asterix community.',
                skills: ['ROS2', 'Python', 'CAD', 'Embedded'],
                avatar: identifier[0].toUpperCase()
            };
        }

        const rankInfo = calculateRank(memberObj.xp);
        const finalMember = { ...memberObj, ...rankInfo };

        setCurrentMember(finalMember);
        setIsLoginModalOpen(false);
        setIsProfileModalOpen(true);
        return { success: true, member: finalMember };
    };

    const logout = () => {
        setCurrentMember(null);
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
        addXP(15); // Reward 15 XP for peer messaging & collaboration
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
        addXP(10); // Reward 10 XP for endorsing peers
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
