import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEngagement, sendReaction, sendVote, countShare } from '../../lib/blogEngagement';

/* One post's live counters and what this browser already did to it.
   Reactions update at once and are corrected by the server's recount. */
export function useEngagement(slug, initialReactions) {
    const [state, setState] = useState(() => ({
        reactions: initialReactions || {},
        mine: [],
        polls: {},
        myPolls: {},
        votingKey: null,
        pollError: null
    }));
    const pending = useRef(new Set());

    useEffect(() => {
        let cancelled = false;
        fetchEngagement(slug)
            .then((data) => {
                if (cancelled) return;
                setState((s) => ({
                    ...s,
                    reactions: data.reactions || {},
                    mine: data.myReactions || [],
                    polls: data.polls || {},
                    myPolls: data.myPolls || {}
                }));
            })
            .catch(() => {
                /* Counters stay at what the post came with. */
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const toggleReaction = useCallback(
        async (type) => {
            if (pending.current.has(type)) return;
            pending.current.add(type);
            const on = !state.mine.includes(type);
            const shift = (s, delta, add) => ({
                ...s,
                reactions: { ...s.reactions, [type]: Math.max(0, (s.reactions[type] || 0) + delta) },
                mine: add ? [...s.mine, type] : s.mine.filter((t) => t !== type)
            });
            setState((s) => shift(s, on ? 1 : -1, on));
            try {
                const data = await sendReaction(slug, type, on);
                setState((s) => ({ ...s, reactions: data.reactions }));
            } catch {
                setState((s) => shift(s, on ? -1 : 1, !on));
            } finally {
                pending.current.delete(type);
            }
        },
        [slug, state.mine]
    );

    const vote = useCallback(
        async (key, option) => {
            setState((s) => ({ ...s, votingKey: key, pollError: null }));
            try {
                const data = await sendVote(slug, key, option);
                setState((s) => ({
                    ...s,
                    votingKey: null,
                    polls: { ...s.polls, [key]: { counts: data.counts, total: data.total } },
                    myPolls: { ...s.myPolls, [key]: data.mine }
                }));
            } catch (err) {
                setState((s) => ({ ...s, votingKey: null, pollError: { key, message: err.message } }));
            }
        },
        [slug]
    );

    const share = useCallback((channel) => countShare(slug, channel), [slug]);

    return { ...state, toggleReaction, vote, share };
}
