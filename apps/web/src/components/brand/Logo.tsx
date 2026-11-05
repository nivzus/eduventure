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
  /** Accessible name. Pass `null` to mark the logo decorative. */
  title?: string | null;
}

/**
 * Needle colour: headlamp lime on night ink, map-red ember on paper.
 * Hoisted + de-duplicated by React 19 (`href` + `precedence`).
 */
const LOGO_CSS =
  ".eduv-logo{--eduv-accent:var(--logo-accent,var(--signal,#E8FF59))}" +
  "[data-theme='light'] .eduv-logo{--eduv-accent:var(--logo-accent,var(--ember,#E8542A))}";

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
  const viewBox = isMark ? VIEWBOX_MARK : VIEWBOX_FULL;

  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const drawIn = (i: number) =>
    draw
      ? {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: {
            pathLength: { duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.08 + i * 0.06 },
            opacity: { duration: 0.01, delay: 0.08 + i * 0.06 },
          },
        }
      : {};

  const needleDelay = isMark ? 0.45 : 0.35;

  return (
    <>
      <style href="eduv-logo" precedence="low">
        {LOGO_CSS}
      </style>
      <svg
      viewBox={viewBox}
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

      <motion.path d={E_BODY} {...strokeProps} {...drawIn(0)} />
      {!isMark &&
        WORD_GLYPHS.map((d, i) => <motion.path key={i} d={d} {...strokeProps} {...drawIn(i + 1)} />)}

      <motion.g
        style={{ originX: 0, originY: 0.5 }}
        {...(draw
          ? {
              initial: { rotate: -96, opacity: 0 },
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
        <path d={NEEDLE_LOWER} fill="#000" fillOpacity={0.2} />
      </motion.g>
      </svg>
    </>
  );
}

export default Logo;
