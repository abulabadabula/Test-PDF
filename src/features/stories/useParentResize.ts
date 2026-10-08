import { useEffect, useState, type RefObject } from 'react';

/** Bumps a counter whenever the canvas' parent changes size (PDF re-render / zoom). */
export function useParentResize(ref: RefObject<HTMLCanvasElement>): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVersion((v) => v + 1));
    });
    observer.observe(parent);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [ref]);
  return version;
}
