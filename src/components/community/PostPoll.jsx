// A poll inside a post. Readers vote once per browser and can change their vote.
export default function PostPoll({ poll, engagement }) {
    const result = engagement.polls[poll.key];
    const mine = engagement.myPolls[poll.key];
    const voted = mine !== undefined;
    const busy = engagement.votingKey === poll.key;
    const error = engagement.pollError?.key === poll.key ? engagement.pollError.message : '';
    const total = result?.total || 0;

    return (
        <section
            aria-label={`Poll: ${poll.question}`}
            className="shadow-brutal-4 my-8 border-2 border-slate-900 bg-white p-5 not-italic"
        >
            <p className="font-mono text-[10px] font-black text-violet-700 uppercase">📊 Quick poll</p>
            <p className="font-display mt-1 text-lg leading-snug font-bold text-slate-900">{poll.question}</p>
            <ul className="mt-4 space-y-2">
                {poll.options.map((option, n) => {
                    const count = result?.counts?.[n] || 0;
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    const chosen = mine === n;
                    return (
                        <li key={n}>
                            <button
                                type="button"
                                disabled={busy}
                                aria-pressed={chosen}
                                onClick={() => !chosen && engagement.vote(poll.key, n)}
                                className={`relative flex w-full cursor-pointer items-center justify-between gap-3 overflow-hidden border-2 px-3 py-2.5 text-left text-base disabled:cursor-wait ${
                                    chosen
                                        ? 'border-slate-900 font-bold'
                                        : 'border-slate-300 hover:border-slate-900'
                                }`}
                            >
                                {voted && (
                                    <span
                                        aria-hidden="true"
                                        className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
                                            chosen ? 'bg-amber-300' : 'bg-slate-100'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                )}
                                <span className="relative text-slate-900">
                                    {chosen && <span aria-hidden="true">✓ </span>}
                                    {option}
                                </span>
                                {voted && (
                                    <span className="relative font-mono text-xs font-black text-slate-700 tabular-nums">
                                        {pct}%
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <p className="mt-3 font-mono text-[11px] text-slate-500" aria-live="polite">
                {error ||
                    (busy
                        ? 'Saving your vote…'
                        : voted
                          ? `${total} ${total === 1 ? 'vote' : 'votes'} · tap another option to change your vote`
                          : 'Tap an option to vote and see what others think.')}
            </p>
        </section>
    );
}
