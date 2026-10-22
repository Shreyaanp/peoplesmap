import styles from './Icon.module.css';

export type IconWeight = 'light' | 'regular' | 'duotone';
export type IconSize = 'sm' | 'md' | 'lg';

export interface IconPath {
  readonly d: string;
  /** The duotone fill layer, coloured by `--icon-duotone-fill` (amber for active states). */
  readonly duotone?: boolean;
}

export type IconPaths = Readonly<Record<IconWeight, readonly IconPath[]>>;

export interface IconProps {
  weight?: IconWeight;
  size?: IconSize;
  /** Only for an icon that carries meaning on its own. Icons beside text or inside a labelled button stay hidden. */
  label?: string;
  className?: string | undefined;
}

/** Renders one owned icon. Inherits the text colour; hidden from screen readers unless labelled. */
export function Icon({
  paths,
  weight = 'regular',
  size = 'md',
  label,
  className,
}: IconProps & { paths: IconPaths }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      focusable="false"
      data-size={size}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      {...a11y}
    >
      {paths[weight].map((p) => (
        <path key={p.d} d={p.d} className={p.duotone ? styles.duotone : undefined} />
      ))}
    </svg>
  );
}
