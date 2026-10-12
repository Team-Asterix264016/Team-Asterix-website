'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useRef } from 'react';

/**
 * DockTextItem
 * Renders a textual button with React Bits proximity magnification and spring physics.
 * Scales dynamically as the cursor approaches without replacing text with icons.
 */
export function DockTextItem({
    children,
    className = '',
    onClick,
    mouseX,
    spring = { mass: 0.1, stiffness: 160, damping: 14 },
    distance = 140,
    magnificationScale = 1.18
}) {
    const ref = useRef(null);

    const mouseDistance = useTransform(mouseX, (val) => {
        const rect = ref.current?.getBoundingClientRect() ?? {
            x: 0,
            width: 90
        };
        return val - rect.x - rect.width / 2;
    });

    const targetScale = useTransform(mouseDistance, [-distance, 0, distance], [1, magnificationScale, 1]);
    const scale = useSpring(targetScale, spring);

    const targetY = useTransform(mouseDistance, [-distance, 0, distance], [0, -3, 0]);
    const y = useSpring(targetY, spring);

    return (
        <motion.div
            ref={ref}
            style={{
                scale,
                y,
                transformOrigin: 'center center'
            }}
            className="relative z-10 inline-block"
        >
            <div
                onClick={onClick}
                className={`press relative inline-flex cursor-pointer items-center justify-center text-xs font-black tracking-wider uppercase select-none ${className}`}
            >
                {children}
            </div>
        </motion.div>
    );
}

/**
 * TextDock
 * Container tracking mouse X coordinate to drive proximity magnification across child textual items.
 */
export default function TextDock({ children, className = '', onMouseMove, onMouseLeave }) {
    const mouseX = useMotionValue(Infinity);

    return (
        <motion.div
            onMouseMove={(e) => {
                // getBoundingClientRect(), which DockTextItem measures against, is in
                // viewport coordinates. pageX is document coordinates, so the two
                // disagreed by the horizontal scroll offset.
                mouseX.set(e.clientX);
                onMouseMove?.(e);
            }}
            onMouseLeave={(e) => {
                mouseX.set(Infinity);
                onMouseLeave?.(e);
            }}
            className={`flex items-center gap-1.5 sm:gap-2.5 ${className}`}
        >
            {typeof children === 'function' ? children({ mouseX }) : children}
        </motion.div>
    );
}
