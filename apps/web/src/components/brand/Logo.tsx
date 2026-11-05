'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  E_BODY,
  NEEDLE_LOWER,
  NEEDLE_UPPER,
  STROKE,
  VIEWBOX_FULL,
  VIEWBOX_MARK,
  WORD_GLYPHS,
} from './logo-geometry';
import { EASE_OUT_EXPO } from './tokens';

export interface LogoProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'children'> {
  /** `full` = "Eduventure" wordmark (Compass-E + trail letters) · `mark` = Compass-E monogram */
  variant?: 'full' | 'mark';
  className?: string;
  /** Draw the letters in like a trail and swing the needle to East on mount. */
  animate?: boolean;
  /** Override the needle colour (any CSS colour). Defaults to signal (dark) / ember (light). */
  accent?: string;
  /** Accessible name. Pass `null` to make the logo decorative (e.g. next to visible text). */
  title?: string | null;
}

/**
 * Needle colour: headlamp lime on night ink, map-red ember on paper.
 * Hoisted into <head> and de-duplicated by React 19 (`href` + `precedence`).
 * Override per instance with the `accent` prop or `--logo-accent`.
 */
const LOGO_CSS =
  '.eduv-logo{--eduv-accent:var(--logo-accent,var(--signal,#E8FF59))}' +
  "[data-theme='light'] .eduv-logo{--eduv-accent:var(--logo-accent,var(--ember,#E8542A))}";

/**
 * Eduventure logo. Inherits `currentColor` for the letters; size it with height
 * (`className="h-7"`) — width follows the viewBox ratio.
 */
export function Logo({
  variant = 'full',
  className,
  animate = false,
  accent,
  title = 'Eduventure',
  style,
  ...rest
}: LogoProps) {
  const reduce = useReducedMotion();
  const draw = animate && !reduce;
  const isMark = variant === 'mark';

  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
  };

  const drawIn = (i: number) =>
    draw
      ? {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: {
            pathLength: { duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.06 + i * 0.055 },
            opacity: { duration: 0.01, delay: 0.06 + i * 0.055 },
          },
        }
      : {};

  const needleDelay = isMark ? 0.4 : 0.3;

  return (
    <>
      <style href="eduv-logo" precedence="low">
        {LOGO_CSS}
      </style>
      <svg
        viewBox={isMark ? VIEWBOX_MARK : VIEWBOX_FULL}
        height={isMark ? 32 : 28}
        className={className ? `eduv-logo ${className}` : 'eduv-logo'}
        style={{ ...(accent ? ({ '--logo-accent': accent } as React.CSSProperties) : null), ...style }}
        role={title ? 'img' : undefined}
        aria-label={title ?? undefined}
        aria-hidden={title ? undefined : true}
        focusable="false"
        {...rest}
      >
        {title ? <title>{title}</title> : null}

        <motion.path d={E_BODY} {...stroke} strokeLinejoin="round" {...drawIn(0)} />
        {!isMark &&
          WORD_GLYPHS.map((g, i) => (
            <motion.path
              key={i}
              d={g.d}
              {...stroke}
              strokeLinejoin={g.sharp ? 'miter' : 'round'}
              {...drawIn(i + 1)}
            />
          ))}

        {/* Compass needle — swings and settles East on mount */}
        <motion.g
          style={{ originX: 0, originY: 0.5 }}
          {...(draw
            ? {
                initial: { rotate: -100, opacity: 0 },
                animate: { rotate: 0, opacity: 1 },
                transition: {
                  rotate: { type: 'spring', stiffness: 120, damping: 7, delay: needleDelay },
                  opacity: { duration: 0.2, delay: needleDelay },
                },
              }
            : {})}
        >
          <path d={NEEDLE_UPPER} fill="var(--eduv-accent)" />
          <path d={NEEDLE_LOWER} fill="var(--eduv-accent)" />
          <path d={NEEDLE_LOWER} fill="#000" fillOpacity={0.22} />
        </motion.g>
      </svg>
    </>
  );
}

export default Logo;
