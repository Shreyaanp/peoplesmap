import { animate, m, useDragControls, useMotionValue, type PanInfo } from 'motion/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { desktopQuery, useMediaQuery } from '../../app/useMediaQuery';
import { fade, spring, useReducedMotionPreference } from '../../motion';
import { useSheet, useSheetActions, type SheetSnap } from '../../state/sheet';
import styles from './Sheet.module.css';

interface SheetProps {
  /** Accessible name of the sheet region. */
  label: string;
  /** Always visible next to the handle, even when peeking. */
  header: ReactNode;
  children: ReactNode;
}

const order: SheetSnap[] = ['peek', 'half', 'full'];
const nextSnap: Record<SheetSnap, SheetSnap> = { peek: 'half', half: 'full', full: 'peek' };
/** How far a fling carries when choosing the snap (seconds of velocity). */
const flingProjection = 0.2;
/** Resistance past the top and bottom snaps (the stretch that springs back). */
const rubberBand = 0.3;

function cssPixels(name: string): number {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}

/**
 * The bottom sheet: peek, half and full snap points, rubber-band past its limits and a spring to
 * settle, interruptible at any moment. On desktop it becomes a side panel and does not move.
 */
export function Sheet({ label, header, children }: SheetProps) {
  const snap = useSheet((s) => s.snap);
  const moving = useSheet((s) => s.moving);
  const { setSnap, setMoving } = useSheetActions();
  const desktop = useMediaQuery(desktopQuery);
  const reducedMotion = useReducedMotionPreference();
  const containerRef = useRef<HTMLElement>(null);
  const controls = useDragControls();
  const y = useMotionValue(0);
  const [height, setHeight] = useState(0);

  // Track the space the sheet lives in (the viewport minus nothing; orientation and keyboards change it).
  useLayoutEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry?.contentRect.height ?? 0));
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  /** Each snap as a y offset from the top of the space the sheet lives in. */
  const offsets = useMemo<Record<SheetSnap, number>>(
    () => ({
      full: 0,
      half: Math.round(height * 0.5) - cssPixels('--sheet-top-gap'),
      peek: Math.max(0, height - cssPixels('--sheet-peek') - cssPixels('--sheet-top-gap')),
    }),
    [height],
  );

  const settle = useCallback(
    (target: number) => {
      setMoving(true);
      const anim = animate(y, target, reducedMotion ? fade : spring.sheet);
      void anim.then(() => setMoving(false));
      return anim;
    },
    [y, reducedMotion, setMoving],
  );

  // Move to the snap whenever it (or the available height) changes. A new move interrupts the old
  // one and inherits its velocity, because both drive the same motion value.
  useEffect(() => {
    if (desktop || height === 0) return;
    const anim = settle(offsets[snap]);
    return () => anim.stop();
  }, [snap, offsets, desktop, height, settle]);

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const projected = y.get() + info.velocity.y * flingProjection;
    const nearest = order.reduce((best, s) =>
      Math.abs(offsets[s] - projected) < Math.abs(offsets[best] - projected) ? s : best,
    );
    if (nearest === snap) settle(offsets[nearest]);
    else setSnap(nearest);
  };

  const startDrag = (event: PointerEvent) => {
    if (!desktop) controls.start(event);
  };

  return (
    <m.section
      ref={containerRef}
      className={styles.sheet}
      aria-label={label}
      data-moving={moving}
      data-snap={snap}
      style={desktop ? {} : { y }}
      drag={desktop ? false : 'y'}
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: offsets.full, bottom: offsets.peek }}
      dragElastic={rubberBand}
      dragMomentum={false}
      onDragStart={() => setMoving(true)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.top} onPointerDown={startDrag}>
        {!desktop && (
          <button
            type="button"
            className={styles.handle}
            aria-label={snap === 'full' ? 'Collapse' : 'Expand'}
            onClick={() => setSnap(nextSnap[snap])}
          >
            <span className={styles.grip} aria-hidden="true" />
          </button>
        )}
        {header}
      </div>
      <div
        className={styles.body}
        data-scroll={desktop || snap === 'full'}
        onPointerDown={snap === 'full' ? undefined : startDrag}
      >
        {children}
      </div>
    </m.section>
  );
}
