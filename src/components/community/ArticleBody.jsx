import { renderMarkdown } from '../../lib/renderMarkdown';

/* The reading column for a post body. Shared by the public article and the
   admin editor's preview, so what an editor previews is what readers get. */
export default function ArticleBody({ markdown, className = '' }) {
    return (
        <div
            className={`mx-auto max-w-[38rem] text-[17px] leading-[1.75] break-words text-slate-800 sm:text-[18px] ${className}`}
        >
            {renderMarkdown(markdown)}
        </div>
    );
}
