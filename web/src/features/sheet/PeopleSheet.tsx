import { domMax, LazyMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useOpenPerson } from '../../app/urlState';
import { useSheetActions } from '../../state/sheet';
import { ProfileBody, ProfileHeader } from '../profile/Profile';
import { DiscoverHeader, DiscoverList } from '../search/Discover';
import { Sheet } from './Sheet';

/**
 * The one sheet over the map. It shows the discovery peek by default and a profile when one is open
 * (`?person=` in the URL). Lazy-loaded with Motion's drag features, after the map.
 */
export default function PeopleSheet() {
  const personId = useOpenPerson();
  const { setSnap } = useSheetActions();

  // Opening a profile lifts the sheet to half; closing it drops back to the peek.
  const previous = useRef(personId);
  useEffect(() => {
    if (previous.current === personId) return;
    previous.current = personId;
    setSnap(personId ? 'half' : 'peek');
  }, [personId, setSnap]);

  return (
    <LazyMotion features={domMax} strict>
      <Sheet
        label={personId ? 'Profile' : 'People around you'}
        header={personId ? <ProfileHeader /> : <DiscoverHeader />}
      >
        {personId ? <ProfileBody key={personId} id={personId} /> : <DiscoverList />}
      </Sheet>
    </LazyMotion>
  );
}
