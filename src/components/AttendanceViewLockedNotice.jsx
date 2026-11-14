/* Temporary notice shown while the server's attendance view lock is on
   (server/src/middleware/attendanceViewLock.js). The text comes from the
   server, so lifting the lock there removes this everywhere at once. */
export default function AttendanceViewLockedNotice({ lock, compact = false }) {
    if (!lock) return null;

    if (compact) {
        return (
            <div className="flex items-start gap-3 border-2 border-amber-500 bg-amber-50 p-3 text-amber-950">
                <span className="text-xl">🔒</span>
                <div className="font-mono text-xs font-bold">
                    <div>{lock.message}</div>
                    <div className="mt-1 text-amber-800">{lock.note}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="shadow-brutal-4 border-4 border-slate-900 bg-amber-50 p-4 sm:p-6">
            <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                    <h3 className="font-mono text-sm font-black tracking-wider text-slate-950 uppercase">
                        {lock.title}
                    </h3>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-800">{lock.message}</p>
                    <p className="mt-1 font-mono text-xs font-bold text-amber-800">{lock.note}</p>
                </div>
            </div>
        </div>
    );
}
