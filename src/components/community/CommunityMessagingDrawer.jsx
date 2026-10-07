import { useState } from 'react';
import { useCommunityAuth } from '../../context/CommunityAuthContext';

export default function CommunityMessagingDrawer() {
    const {
        isMessagingDrawerOpen,
        setIsMessagingDrawerOpen,
        currentMember,
        messages,
        sendDirectMessage,
        activeChatMember,
        setActiveChatMember
    } = useCommunityAuth();

    const [chatInput, setChatInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isMessagingDrawerOpen) return null;

    // Sample community member directory
    const directoryMembers = [
        {
            name: 'Ratheeswar S',
            role: 'Perception Lead',
            rollNo: '23SE001',
            skills: ['ROS2', 'LiDAR', 'CUDA']
        },
        {
            name: 'Kavya V',
            role: 'Software Specialist',
            rollNo: '24SE012',
            skills: ['Python', 'YOLOv8', 'OpenCV']
        },
        { name: 'Dharun M', role: 'Chassis Lead', rollNo: '23ME005', skills: ['SolidWorks', 'ANSYS', 'TIG'] },
        {
            name: 'Priya Sharma',
            role: 'Embedded Developer',
            rollNo: '24EE018',
            skills: ['STM32', 'CAN Bus', 'C++']
        },
        {
            name: 'Arun Kumar',
            role: 'Workshop Alumnus',
            rollNo: '23ME044',
            skills: ['Suspension', 'Machining']
        }
    ];

    const filteredMembers = directoryMembers.filter(
        (m) =>
            !searchQuery ||
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSend = (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChatMember) return;
        sendDirectMessage(activeChatMember.name, chatInput);
        setChatInput('');
    };

    const chatMessages = messages.filter(
        (m) =>
            m.recipientName === activeChatMember?.name ||
            (currentMember &&
                m.recipientName === currentMember.name &&
                m.senderName === activeChatMember?.name)
    );

    return (
        <div
            className="fixed inset-0 z-50 flex h-[100dvh] justify-end bg-slate-900/80 backdrop-blur-sm"
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
        >
            <div className="flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden border-l-4 border-slate-900 bg-white shadow-[-10px_0_0_#0f172a] sm:h-full">
                {/* Header */}
                <div className="z-10 flex flex-shrink-0 items-center justify-between border-b-4 border-slate-900 bg-slate-900 p-4 text-white">
                    <div>
                        <span className="bg-sky-400 px-2 py-0.5 font-mono text-[9px] font-black text-slate-900 uppercase">
                            MEMBER DIRECTORY & DMs
                        </span>
                        <h3 className="mt-1 text-lg leading-none font-black text-white uppercase">
                            Peer Collaboration Drawer
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsMessagingDrawerOpen(false)}
                        className="press cursor-pointer font-mono text-lg font-black text-white hover:text-amber-300"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="custom-scrollbar flex flex-1 flex-col overflow-hidden">
                    {/* Active Chat Bar or Member Search */}
                    {!activeChatMember ? (
                        <div
                            data-modal-scroll
                            className="custom-scrollbar flex flex-1 flex-col space-y-4 overflow-y-auto p-4"
                        >
                            <div className="space-y-2">
                                <label className="block font-mono text-xs font-black text-slate-900 uppercase">
                                    Search Community Members & Workshop Peers
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search by name, roll no, or skill..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border-2 border-slate-900 bg-slate-50 p-2.5 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="flex-1 space-y-2">
                                <span className="font-mono text-[10px] font-black text-slate-500 uppercase">
                                    DIRECT MESSAGES & PEER DIRECTORY ({filteredMembers.length})
                                </span>
                                {filteredMembers.map((m) => (
                                    <div
                                        key={m.rollNo}
                                        onClick={() => setActiveChatMember(m)}
                                        className="flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-white p-3 shadow-[3px_3px_0px_#0f172a] transition-transform hover:translate-x-1 hover:bg-sky-50"
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase">
                                                <span>{m.name}</span>
                                                <span className="font-mono text-[9px] font-normal text-slate-500">
                                                    ({m.rollNo})
                                                </span>
                                            </div>
                                            <span className="block font-mono text-[10px] font-bold text-sky-700">
                                                {m.role}
                                            </span>
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {m.skills.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="py-0.2 border border-slate-300 bg-slate-100 px-1.5 font-mono text-[8px] font-bold"
                                                    >
                                                        #{s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button className="press border border-slate-900 bg-sky-500 px-2.5 py-1 font-mono text-[10px] font-black text-white uppercase">
                                            Chat →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Active Chat Interface */
                        <div className="flex flex-1 flex-col justify-between overflow-hidden">
                            {/* Chat Header */}
                            <div className="flex flex-shrink-0 items-center justify-between border-b-2 border-slate-900 bg-slate-100 p-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setActiveChatMember(null)}
                                        className="press cursor-pointer bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-white uppercase"
                                    >
                                        ← Back to Directory
                                    </button>
                                    <span className="font-mono text-xs font-black text-slate-900 uppercase">
                                        Chatting with <strong>{activeChatMember.name}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div
                                data-modal-scroll
                                className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4"
                            >
                                {chatMessages.length === 0 ? (
                                    <div className="p-6 text-center font-mono text-xs font-bold text-slate-500">
                                        No messages yet. Send a message to start collaborating!
                                    </div>
                                ) : (
                                    chatMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`max-w-[85%] space-y-1 border-2 border-slate-900 p-3 font-mono text-xs ${
                                                msg.senderId === currentMember?.id
                                                    ? 'ml-auto border-slate-900 bg-sky-100 text-slate-900'
                                                    : 'bg-white text-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                                                <span>{msg.senderName}</span>
                                                <span>{msg.timestamp}</span>
                                            </div>
                                            <p className="font-medium text-slate-900">{msg.text}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Send Input */}
                            <form
                                onSubmit={handleSend}
                                className="flex flex-shrink-0 gap-2 border-t-2 border-slate-900 bg-slate-100 p-3"
                            >
                                <input
                                    type="text"
                                    placeholder={`Message ${activeChatMember.name}...`}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="flex-1 border-2 border-slate-900 bg-white p-2 font-mono text-xs focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="press cursor-pointer border-2 border-slate-900 bg-sky-500 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-sky-400"
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
