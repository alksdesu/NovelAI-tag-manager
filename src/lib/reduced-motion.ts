import { createSignal, createEffect } from 'solid-js';
import { data } from '../stores/data';
import { MOTION_REDUCTION_TAG_THRESHOLD } from '../constants';

const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(false);

// Listen to OS preference
if (typeof window !== 'undefined') {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (mq) {
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
    }
  }
}

/**
 * Returns true if motion should be reduced.
 * Based on OS preference OR tag count threshold.
 */
export function shouldReduceMotion(): boolean {
  if (prefersReducedMotion()) return true;
  const tagCount = data.categories.reduce((sum, c) => sum + c.tags.length, 0);
  return tagCount > MOTION_REDUCTION_TAG_THRESHOLD;
}

export { prefersReducedMotion };
