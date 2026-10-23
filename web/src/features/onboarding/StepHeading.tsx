import { useEffect, useRef, type ReactNode } from 'react';
import screen from './Screen.module.css';

/**
 * Each step's title. It takes focus when the step appears, so keyboard and screen-reader users
 * land on the new step instead of a button that just vanished.
 */
export function StepHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={screen.title}>
      {children}
    </h1>
  );
}
