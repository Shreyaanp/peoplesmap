/**
 * The mock tag vocabulary. Each canonical tag has spellings people actually use; matching is on the
 * slug, display keeps the person's spelling (#photo / #photography / #photographer count as one).
 */

export interface VocabularyTag {
  slug: string;
  /** Spellings people use. The first is the default display. */
  spellings: readonly string[];
  category: Category;
  /** Relative popularity (people who have it). */
  popularity: number;
}

export type Category =
  'sport' | 'outdoors' | 'music' | 'art' | 'tech' | 'food' | 'learning' | 'games' | 'wellness' | 'social';

const t = (slug: string, category: Category, popularity: number, ...extra: string[]): VocabularyTag => ({
  slug,
  spellings: [slug, ...extra],
  category,
  popularity,
});

export const vocabulary: readonly VocabularyTag[] = [
  t('badminton', 'sport', 10),
  t('cricket', 'sport', 10),
  t('football', 'sport', 6, 'soccer'),
  t('running', 'sport', 8, 'runner', 'jogging'),
  t('cycling', 'sport', 6, 'cyclist', 'biking'),
  t('swimming', 'sport', 4),
  t('tennis', 'sport', 3),
  t('table-tennis', 'sport', 4, 'pingpong'),
  t('pickleball', 'sport', 4),
  t('gym', 'sport', 7, 'weightlifting', 'lifting'),
  t('boxing', 'sport', 2),
  t('climbing', 'sport', 3, 'bouldering'),
  t('volleyball', 'sport', 2),
  t('basketball', 'sport', 2),
  t('trekking', 'outdoors', 7, 'trek', 'hiking'),
  t('camping', 'outdoors', 3),
  t('birdwatching', 'outdoors', 2, 'birding'),
  t('road-trips', 'outdoors', 4, 'roadtrip'),
  t('gardening', 'outdoors', 3, 'plants'),
  t('guitar', 'music', 6, 'guitarist'),
  t('singing', 'music', 5, 'singer', 'vocals'),
  t('carnatic', 'music', 2, 'carnatic-music'),
  t('hindustani', 'music', 1, 'hindustani-classical'),
  t('drums', 'music', 2, 'drummer'),
  t('piano', 'music', 3, 'keyboard'),
  t('music-production', 'music', 2, 'producer', 'beats'),
  t('indie-music', 'music', 3, 'indie'),
  t('photography', 'art', 8, 'photo', 'photographer'),
  t('sketching', 'art', 3, 'drawing'),
  t('painting', 'art', 3, 'watercolour'),
  t('pottery', 'art', 2, 'ceramics'),
  t('writing', 'art', 4, 'writer', 'poetry'),
  t('filmmaking', 'art', 2, 'films'),
  t('dance', 'art', 4, 'dancing'),
  t('bharatanatyam', 'art', 2),
  t('theatre', 'art', 2, 'acting'),
  t('standup', 'art', 2, 'stand-up', 'comedy'),
  t('design', 'tech', 5, 'ui-design', 'ux'),
  t('react', 'tech', 4, 'reactjs'),
  t('java', 'tech', 4),
  t('python', 'tech', 5),
  t('machine-learning', 'tech', 4, 'ml', 'ai'),
  t('startups', 'tech', 5, 'founder', 'startup'),
  t('product-management', 'tech', 3, 'product'),
  t('android', 'tech', 2),
  t('open-source', 'tech', 2, 'oss'),
  t('hackathons', 'tech', 2, 'hackathon'),
  t('biryani', 'food', 6, 'biryani-hunting'),
  t('cooking', 'food', 6, 'home-cooking'),
  t('baking', 'food', 4, 'baker'),
  t('filter-coffee', 'food', 4, 'coffee'),
  t('street-food', 'food', 5, 'chaat'),
  t('irani-chai', 'food', 3, 'chai'),
  t('veganism', 'food', 1, 'vegan'),
  t('telugu', 'learning', 4, 'learning-telugu'),
  t('urdu', 'learning', 2),
  t('japanese', 'learning', 2),
  t('german', 'learning', 2),
  t('reading', 'learning', 6, 'books', 'bookclub'),
  t('upsc', 'learning', 3, 'civil-services'),
  t('chess', 'games', 6),
  t('board-games', 'games', 5, 'boardgames'),
  t('gaming', 'games', 5, 'gamer'),
  t('valorant', 'games', 2),
  t('quizzing', 'games', 3, 'quiz'),
  t('dungeons-and-dragons', 'games', 1, 'dnd'),
  t('yoga', 'wellness', 6),
  t('meditation', 'wellness', 3),
  t('pilates', 'wellness', 2),
  t('volunteering', 'social', 3, 'volunteer'),
  t('animal-rescue', 'social', 2, 'dogs', 'stray-dogs'),
  t('heritage-walks', 'social', 2, 'heritage'),
  t('language-exchange', 'social', 2),
  t('salsa', 'social', 2, 'social-dancing'),
];

const bySlug = new Map(vocabulary.map((tag) => [tag.slug, tag]));
const bySpelling = new Map(vocabulary.flatMap((tag) => tag.spellings.map((s) => [s, tag] as const)));

export function tagBySlug(slug: string): VocabularyTag | undefined {
  return bySlug.get(slug);
}

/** Resolves any spelling ("photo", "#Photographer") to its canonical tag. */
export function resolveTag(text: string): VocabularyTag | undefined {
  return bySpelling.get(text.replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-'));
}

/** Related tags: same category, most popular first. Stands in for embeddings + co-occurrence. */
export function relatedTags(slug: string, limit = 6): VocabularyTag[] {
  const tag = bySlug.get(slug);
  if (!tag) return [];
  return vocabulary
    .filter((other) => other.category === tag.category && other.slug !== slug)
    .toSorted((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}
