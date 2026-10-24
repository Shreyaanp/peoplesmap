import { domMax, LazyMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useOpenPerson, useSearchQuery } from '../../app/urlState';
import { useSheetActions } from '../../state/sheet';
import { ProfileBody, ProfileHeader } from '../profile/Profile';
import { DiscoverHeader, DiscoverList } from '../search/Discover';
import { ResultsHeader, ResultsList } from '../search/Results';
import { Sheet } from './Sheet';

/**
 * The one sheet over the map: the discovery peek by default, search results during a search (`?q=`),
 * and a profile when one is open (`?person=`). Lazy-loaded with Motion's drag features, after the map.
 */
export default function PeopleSheet() {
  const personId = useOpenPerson();
  const query = useSearchQuery();
  const { setSnap } = useSheetActions();

  // Opening a profile lifts the sheet to half (a shared link too); closing it drops back to the peek.
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === personId) return;
    previous.current = personId;
    setSnap(personId ? 'half' : 'peek');
  }, [personId, setSnap]);

  const header = personId ? <ProfileHeader id={personId} /> : query ? <ResultsHeader /> : <DiscoverHeader />;

  return (
    <LazyMotion features={domMax} strict>
      <Sheet label={personId ? 'Profile' : query ? 'Search results' : 'People around you'} header={header}>
        {personId ? <ProfileBody key={personId} id={personId} /> : query ? <ResultsList /> : <DiscoverList />}
      </Sheet>
    </LazyMotion>
  );
}
