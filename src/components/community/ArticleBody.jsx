import { useMemo } from 'react';
import { parseBlocks } from '../../lib/markdownBlocks';
import { renderBlocks } from '../../lib/renderMarkdown';

/* The reading column for a post body. Shared by the public article and the
   admin editor's preview, so what an editor previews is what readers get.
   Pass `blocks` when the caller already parsed the post (for its outline). */
export default function ArticleBody({ markdown, blocks, renderPoll, showProblems = false, className = '' }) {
    const parsed = useMemo(() => blocks || parseBlocks(markdown), [blocks, markdown]);
    return (
        <div
            className={`mx-auto max-w-[38rem] text-[17px] leading-[1.75] break-words text-slate-800 sm:text-[18px] ${className}`}
        >
            {renderBlocks(parsed, { renderPoll, showProblems })}
        </div>
    );
}
