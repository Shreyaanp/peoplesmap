import type { Preview } from '@storybook/react-vite';
import '../src/tokens/tokens.css';
import '../src/tokens/motion.css';
import '../src/app/global.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
  },
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { title: 'Theme', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme as string;
      return Story();
    },
  ],
};

export default preview;
