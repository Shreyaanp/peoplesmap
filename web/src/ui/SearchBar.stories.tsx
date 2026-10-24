import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchBar } from './SearchBar';
import { useSearchText } from './searchShared';
import type { TagSuggestion } from '../api/types';

const suggestions: TagSuggestion[] = [
  { slug: 'badminton', display: 'badminton', countNearby: 340, nearLabel: 'Gachibowli' },
  { slug: 'baking', display: 'baking', countNearby: 42, nearLabel: 'Madhapur' },
  { slug: 'bass-guitar', display: 'bass-guitar', countNearby: 0 },
];

function Bar() {
  const [text, setText] = useSearchText(null);
  return (
    <SearchBar
      query={null}
      text={text}
      onTextChange={setText}
      onSubmit={(q) => console.info('search', q)}
      suggestions={suggestions}
    />
  );
}

const meta = {
  title: 'UI/SearchBar',
  component: Bar,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Bar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type "#ba" to see the suggestions drop. */
export const Default: Story = {};
