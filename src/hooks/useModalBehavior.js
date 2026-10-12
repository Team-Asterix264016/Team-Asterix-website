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
/* `document.body.style.overflow = 'hidden'` does not stop touch scrolling on
   iOS, and `lenis.stop()` only stops Lenis -- Lenis runs with smoothTouch off,
   so touch scrolling here is native. The `.modal-open` rule in index.css adds
   `touch-action: none`, which does stop it; a sheet that scrolls internally
   opts its own axis back in with `data-modal-scroll`.

   Depth-counted because two overlays can be open at once (a lightbox over a
   page modal), and the inner one closing used to release the lock for both. */
let lockDepth = 0;

function lockScroll() {
    if (lockDepth++ === 0) {
        document.documentElement.classList.add('modal-open');
        window.lenis?.stop();
    }
}

function unlockScroll() {
    if (lockDepth > 0 && --lockDepth === 0) {
        document.documentElement.classList.remove('modal-open');
        window.lenis?.start();
    }
}

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
        lockScroll();
        /* A stopped Lenis cancels every wheel and touchmove outside a
           `data-lenis-prevent` subtree, which froze the dialog's own scrolling
           on phones along with the page behind it. */
        containerRef.current?.setAttribute('data-lenis-prevent', '');

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
            unlockScroll();
            /* Send focus back where it came from, so keyboard users are not
               dumped at the top of the document on close. */
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
        };
    }, [isOpen]);

    return containerRef;
}
