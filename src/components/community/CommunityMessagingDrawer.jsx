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
        { name: 'Ratheeswar S', role: 'Perception Lead', rollNo: '23SE001', skills: ['ROS2', 'LiDAR', 'CUDA'] },
        { name: 'Kavya V', role: 'Software Specialist', rollNo: '24SE012', skills: ['Python', 'YOLOv8', 'OpenCV'] },
        { name: 'Dharun M', role: 'Chassis Lead', rollNo: '23ME005', skills: ['SolidWorks', 'ANSYS', 'TIG'] },
        { name: 'Priya Sharma', role: 'Embedded Developer', rollNo: '24EE018', skills: ['STM32', 'CAN Bus', 'C++'] },
        { name: 'Arun Kumar', role: 'Workshop Alumnus', rollNo: '23ME044', skills: ['Suspension', 'Machining'] },
    ];

    const filteredMembers = directoryMembers.filter(m =>
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSend = (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChatMember) return;
        sendDirectMessage(activeChatMember.name, chatInput);
        setChatInput('');
    };

    const chatMessages = messages.filter(
        m => m.recipientName === activeChatMember?.name || (currentMember && m.recipientName === currentMember.name && m.senderName === activeChatMember?.name)
    );

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex justify-end"
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
        >
            <div className="bg-white border-l-4 border-slate-900 w-full max-w-lg h-full flex flex-col shadow-[-10px_0_0_#0f172a] overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-slate-900 text-white border-b-4 border-slate-900 flex items-center justify-between flex-shrink-0 z-10">
                    <div>
                        <span className="px-2 py-0.5 bg-sky-400 text-slate-900 font-mono text-[9px] font-black uppercase">
                            MEMBER DIRECTORY & DMs
                        </span>
                        <h3 className="text-lg font-black uppercase text-white leading-none mt-1">
                            Peer Collaboration Drawer
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsMessagingDrawerOpen(false)}
                        className="press text-white hover:text-amber-300 font-mono font-black text-lg cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden custom-scrollbar">
                    {/* Active Chat Bar or Member Search */}
                    {!activeChatMember ? (
                        <div className="p-4 flex-1 flex flex-col overflow-y-auto space-y-4 custom-scrollbar">
                            <div className="space-y-2">
                                <label className="block font-mono text-xs font-black uppercase text-slate-900">
                                    Search Community Members & Workshop Peers
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search by name, roll no, or skill..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-900 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2 flex-1">
                                <span className="font-mono text-[10px] text-slate-500 font-black uppercase">
                                    DIRECT MESSAGES & PEER DIRECTORY ({filteredMembers.length})
                                </span>
                                {filteredMembers.map(m => (
                                    <div
                                        key={m.rollNo}
                                        onClick={() => setActiveChatMember(m)}
                                        className="p-3 bg-white hover:bg-sky-50 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-between cursor-pointer transition-transform hover:translate-x-1"
                                    >
                                        <div className="space-y-0.5">
                                            <div className="font-black text-xs uppercase text-slate-900 flex items-center gap-2">
                                                <span>{m.name}</span>
                                                <span className="text-[9px] font-mono font-normal text-slate-500">({m.rollNo})</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-sky-700 font-bold block">{m.role}</span>
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {m.skills.map(s => (
                                                    <span key={s} className="px-1.5 py-0.2 bg-slate-100 border border-slate-300 font-mono text-[8px] font-bold">
                                                        #{s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button className="press px-2.5 py-1 bg-sky-500 text-white font-mono text-[10px] font-black uppercase border border-slate-900">
                                            Chat →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Active Chat Interface */
                        <div className="flex-1 flex flex-col justify-between overflow-hidden">
                            {/* Chat Header */}
                            <div className="p-3 bg-slate-100 border-b-2 border-slate-900 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setActiveChatMember(null)}
                                        className="press px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-black uppercase cursor-pointer"
                                    >
                                        ← Back to Directory
                                    </button>
                                    <span className="font-mono text-xs font-black text-slate-900 uppercase">
                                        Chatting with <strong>{activeChatMember.name}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                {chatMessages.length === 0 ? (
                                    <div className="p-6 text-center font-mono text-xs text-slate-500 font-bold">
                                        No messages yet. Send a message to start collaborating!
                                    </div>
                                ) : (
                                    chatMessages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`p-3 border-2 border-slate-900 font-mono text-xs space-y-1 max-w-[85%] ${
                                                msg.senderId === currentMember?.id
                                                    ? 'ml-auto bg-sky-100 text-slate-900 border-slate-900'
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
                            <form onSubmit={handleSend} className="p-3 bg-slate-100 border-t-2 border-slate-900 flex gap-2 flex-shrink-0">
                                <input
                                    type="text"
                                    placeholder={`Message ${activeChatMember.name}...`}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="flex-1 p-2 bg-white border-2 border-slate-900 font-mono text-xs focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="press px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-mono font-black text-xs uppercase border-2 border-slate-900 cursor-pointer"
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
