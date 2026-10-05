import React, { Children, cloneElement, forwardRef, isValidElement, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';

export const Card = forwardRef(({ customClass, ...rest }, ref) => (
  <div
    ref={ref}
    {...rest}
    className={`absolute top-1/2 left-1/2 rounded-2xl border-3 border-slate-900 bg-white [transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden] shadow-brutal-8 ${customClass ?? ''} ${rest.className ?? ''}`.trim()}
  />
));
Card.displayName = 'Card';

const makeSlot = (i, distX, distY, total) => {
  const mid = (total - 1) / 2;
  return {
    x: (i - mid) * distX,
    y: -(i - mid) * distY,
    z: -i * distX * 1.5,
    zIndex: total - i
  };
};

const placeNow = (el, slot, skew) => {
  if (!el) return;
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true
  });
};

const CardSwap = ({
  width = 500,
  height = 400,
  cardDistance = 50,
  verticalDistance = 55,
  delay = 4500,
  pauseOnHover = true,
  onCardClick,
  skewAmount = 4,
  easing = 'elastic',
  children
}) => {
  const config =
    easing === 'elastic'
      ? {
          ease: 'elastic.out(0.6,0.9)',
          durDrop: 1.8,
          durMove: 1.8,
          durReturn: 1.8,
          promoteOverlap: 0.85,
          returnDelay: 0.05
        }
      : {
          ease: 'power1.inOut',
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2
        };

  const childArr = useMemo(() => Children.toArray(children), [children]);
  
  const refsDict = useRef({});
  const refs = useMemo(() => {
    const nextRefs = [];
    childArr.forEach((child) => {
      const k = child.key;
      if (!refsDict.current[k]) refsDict.current[k] = React.createRef();
      nextRefs.push(refsDict.current[k]);
    });
    const currentKeys = new Set(childArr.map(c => c.key));
    Object.keys(refsDict.current).forEach(k => {
      if (!currentKeys.has(k)) delete refsDict.current[k];
    });
    return nextRefs;
  }, [childArr]);

  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));

  const tlRef = useRef(null);
  const intervalRef = useRef();
  const container = useRef(null);

  const total = refs.length;

  useEffect(() => {
    // Re-seed the rotation order whenever the deck size changes, otherwise it
    // still references indices from the previous deck.
    order.current = Array.from({ length: total }, (_, i) => i);

    refs.forEach((r, i) => {
      if (r.current) {
        placeNow(r.current, makeSlot(i, cardDistance, verticalDistance, total), skewAmount);
      }
    });

    const swap = () => {
      if (order.current.length < 2) return;

      const [front, ...rest] = order.current;
      const elFront = refs[front]?.current;
      if (!elFront) return;

      const tl = gsap.timeline();
      tlRef.current = tl;

      // Drop far enough to clear the deck but not so far that the card leaves
      // its (overflow-hidden) section and gets clipped mid-animation.
      const dropDistance = Math.min(320, (container.current?.offsetHeight ?? 400) * 0.8);

      tl.to(elFront, {
        y: `+=${dropDistance}`,
        duration: config.durDrop,
        ease: config.ease
      });

      tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);
      rest.forEach((idx, i) => {
        const el = refs[idx]?.current;
        if (!el) return;
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(
          el,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            xPercent: -50,
            yPercent: -50,
            duration: config.durMove,
            ease: config.ease
          },
          `promote+=${i * 0.15}`
        );
      });

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
      tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
      tl.call(
        () => {
          if (elFront) gsap.set(elFront, { zIndex: backSlot.zIndex, xPercent: -50, yPercent: -50 });
        },
        undefined,
        'return'
      );
      tl.to(
        elFront,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          xPercent: -50,
          yPercent: -50,
          duration: config.durReturn,
          ease: config.ease
        },
        'return'
      );

      tl.call(() => {
        order.current = [...rest, front];
      });
    };

    // An unprompted card rotation every few seconds is exactly the kind of
    // motion prefers-reduced-motion is asking us to stop.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    intervalRef.current = window.setInterval(swap, delay);

    if (pauseOnHover && container.current) {
      const node = container.current;
      const pause = () => {
        tlRef.current?.pause();
        clearInterval(intervalRef.current);
      };
      const resume = () => {
        tlRef.current?.play();
        intervalRef.current = window.setInterval(swap, delay);
      };
      node.addEventListener('mouseenter', pause);
      node.addEventListener('mouseleave', resume);
      return () => {
        node.removeEventListener('mouseenter', pause);
        node.removeEventListener('mouseleave', resume);
        clearInterval(intervalRef.current);
        // The pauseOnHover branch used to return without killing the running
        // timeline, so GSAP kept animating detached nodes after unmount.
        tlRef.current?.kill();
        tlRef.current = null;
      };
    }
    return () => {
      clearInterval(intervalRef.current);
      tlRef.current?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing, total, refs]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: child.key,
          ref: refs[i],
          style: { width, height, ...child.props.style },
          onClick: e => {
            child.props.onClick?.(e);
            onCardClick?.(i);
          }
        })
      : child
  );

  return (
    <div
      ref={container}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 perspective-[1000px] overflow-visible select-none max-w-full"
      style={{ width, height }}
    >
      {rendered}
    </div>
  );
};

export default CardSwap;
