import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fragment } from 'react';
import type { IconWeight } from '../ui/icons/Icon';
import * as Icons from '../ui/icons/generated';
import { MiniScreen } from './MiniScreen';
import { fontStyle, type Typeface, typefaces } from './typefaces';
import styles from './Specimen.module.css';

const weights: IconWeight[] = ['light', 'regular', 'duotone'];
const faces = Object.keys(typefaces) as Typeface[];
const iconComponents = Object.entries(Icons).filter(
  (entry): entry is [string, (typeof Icons)['SearchIcon']] => typeof entry[1] === 'function',
);

const meta = {
  title: 'Specimen/Typeface and icons',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

/** Every typeface × every Phosphor weight, on the same slice of real UI. Use the toolbar for dark mode. */
export const Grid: StoryObj = {
  render: () => (
    <div className={styles.grid}>
      <span />
      {weights.map((w) => (
        <p key={w} className={styles.colHead}>
          Phosphor {w}
        </p>
      ))}
      {faces.map((face) => (
        <Fragment key={face}>
          <p className={styles.rowHead}>{face}</p>
          {weights.map((w) => (
            <MiniScreen key={w} typeface={face} weight={w} />
          ))}
        </Fragment>
      ))}
    </div>
  ),
};

interface SingleArgs {
  typeface: Typeface;
  weight: IconWeight;
}

/** One pairing at full size, with the type scale and every owned icon. */
export const Single: StoryObj<SingleArgs> = {
  args: { typeface: 'General Sans', weight: 'regular' },
  argTypes: {
    typeface: { control: 'select', options: faces },
    weight: { control: 'inline-radio', options: weights },
  },
  render: ({ typeface, weight }) => (
    <div className={styles.single} style={fontStyle(typeface)}>
      <MiniScreen typeface={typeface} weight={weight} />
      <div className={styles.scale}>
        <p className={styles.xl}>Find your people.</p>
        <p className={styles.lg}>340 people into #badminton near Gachibowli</p>
        <p className={styles.md}>
          I play badminton most evenings and I&apos;m learning to trek. Looking for doubles partners in
          Kondapur.
        </p>
        <p className={styles.sm}>Banjara Hills · live for 3 more hours · Teaching</p>
        <p className={styles.xs}>0123456789 · #photo #photography #photographer</p>
        <ul className={styles.allIcons}>
          {iconComponents.map(([name, Icon]) => (
            <li key={name}>
              <Icon weight={weight} size="lg" />
              {name.replace(/Icon$/, '')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  ),
};
