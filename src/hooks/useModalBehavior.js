import { useEffect, useRef } from 'react';

/* The dialog behaviour every overlay in this app needs, in one place.
   `SubsystemDetail`, `TeamGallery` and `WorkshopPage` each grew their own copy
   of the scroll-lock + Escape pair; the Community, Quiz and Registrations
   overlays were copied from markup that never had it, so they trapped nothing
   and swallowed no keys. This is that pattern plus the two pieces none of the
   hand-rolled copies had: a focus trap and focus restoration.

   Returns a ref to put on the dialog container. Pair it with
   `role="dialog" aria-modal="true"` and an `aria-labelledby` pointing at the
   overlay's own heading. */
export function useModalBehavior(isOpen, onClose) {
    const containerRef = useRef(null);
    /* Held in a ref so a re-render with a new inline `onClose` does not tear
       down and rebuild the listener (which would drop the scroll lock). */
    const closeRef = useRef(onClose);
    /* Written in an effect, not during render: mutating a ref while rendering
       is a correctness violation React's lint rules reject outright. */
    useEffect(() => {
        closeRef.current = onClose;
    });

    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        /* Lenis keeps driving the page behind the overlay otherwise. */
        window.lenis?.stop();

        const focusables = () => {
            const root = containerRef.current;
            if (!root) return [];
            return [
                ...root.querySelectorAll(
                    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ].filter((el) => el.offsetParent !== null || el === document.activeElement);
        };

        /* Move focus in, so the next Tab lands inside the dialog rather than
           somewhere down the page behind it. */
        const first = focusables()[0];
        (first || containerRef.current)?.focus?.();

        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeRef.current?.();
                return;
            }
            if (e.key !== 'Tab') return;
            const items = focusables();
            if (items.length === 0) return;
            const firstEl = items[0];
            const lastEl = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        };

        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            window.lenis?.start();
            /* Send focus back where it came from, so keyboard users are not
               dumped at the top of the document on close. */
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
        };
    }, [isOpen]);

    return containerRef;
}
