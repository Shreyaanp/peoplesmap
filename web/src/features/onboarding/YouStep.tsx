import { useId, useState } from 'react';
import { problemCode } from '../../api/core';
import { useSaveLocation, useSaveProfile } from '../../api/onboarding';
import type { LatLng, LocationMode, MyLocation } from '../../api/types';
import { Aura } from '../../ui/Aura';
import { areas } from './areas';
import type { TagDraft } from './draft';
import screen from './Screen.module.css';
import { StepHeading } from './StepHeading';
import styles from './Steps.module.css';

interface YouStepProps {
  id: string;
  name: string;
  onNameChange: (name: string) => void;
  location: MyLocation | null;
  onLocation: (location: MyLocation) => void;
  sentence: string;
  tags: readonly TagDraft[];
}

type Problem = 'outside' | 'denied' | 'failed' | null;

const problemText: Record<Exclude<Problem, null>, string> = {
  outside: 'peoplemap is only in Hyderabad for now. Pick a neighbourhood instead.',
  denied: 'Location is off for this site. Pick a neighbourhood instead.',
  failed: "Couldn't set that just now. Try again.",
};

/**
 * Onboarding step 4: your name, your aura (no photo needed) and roughly where you are. People see
 * your neighbourhood or a spot within about 100m, never your address. Saving puts you on the map.
 */
export function YouStep({ id, name, onNameChange, location, onLocation, sentence, tags }: YouStepProps) {
  const saveLocation = useSaveLocation();
  const saveProfile = useSaveProfile();
  const [mode, setMode] = useState<LocationMode>(location?.mode ?? 'neighbourhood');
  const [gpsPoint, setGpsPoint] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const nameId = useId();
  const areaId = useId();

  const place = (point: LatLng, nextMode: LocationMode) => {
    setProblem(null);
    saveLocation.mutate(
      { point, mode: nextMode },
      {
        onSuccess: onLocation,
        onError: (error) => setProblem(problemCode(error) === 'outside-launch-area' ? 'outside' : 'failed'),
      },
    );
  };

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      setProblem('denied');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const point = { lat: coords.latitude, lng: coords.longitude };
        setGpsPoint(point);
        place(point, mode);
      },
      () => {
        setLocating(false);
        setProblem('denied');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const changeMode = (next: LocationMode) => {
    setMode(next);
    if (gpsPoint) place(gpsPoint, next);
  };

  const ready = name.trim() !== '' && location !== null && !saveLocation.isPending;

  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        saveProfile.mutate({
          displayName: name.trim(),
          ...(sentence.trim() ? { sentence: sentence.trim() } : {}),
          tags: tags.map(({ display, level }) => ({ display, level })),
        });
      }}
    >
      <StepHeading>Put yourself on the map</StepHeading>

      <div className={styles.identity}>
        <Aura seed={id} className={styles.aura} />
        <p className={styles.auraNote}>No photo needed: this glow is yours. You can add a photo later.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor={nameId} className={styles.label}>
          Your name
        </label>
        <input
          id={nameId}
          className={styles.input}
          autoComplete="name"
          maxLength={40}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Where are you?</legend>
        <button
          type="button"
          className={styles.secondary}
          onClick={locateMe}
          disabled={locating || saveLocation.isPending}
          aria-busy={locating}
        >
          {locating ? 'Finding you…' : 'Use my location'}
        </button>
        {gpsPoint && (
          <div className={styles.modes} role="radiogroup" aria-label="How precisely to show you">
            {(
              [
                ['neighbourhood', 'My neighbourhood', 'about 500 m'],
                ['exact', 'My exact spot', 'about 100 m'],
              ] as const
            ).map(([value, label, detail]) => (
              <label key={value} className={styles.mode}>
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => changeMode(value)}
                />
                <span>{label}</span>
                <span className={styles.modeDetail}>{detail}</span>
              </label>
            ))}
          </div>
        )}
        <label htmlFor={areaId} className={styles.or}>
          or pick a neighbourhood
        </label>
        <select
          id={areaId}
          className={styles.select}
          value={location && !gpsPoint ? location.locality : ''}
          onChange={(e) => {
            const area = areas.find((a) => a.name === e.target.value);
            if (!area) return;
            setGpsPoint(null);
            setMode('neighbourhood');
            place(area.center, 'neighbourhood');
          }}
        >
          <option value="" disabled>
            Choose an area
          </option>
          {areas.map((area) => (
            <option key={area.name} value={area.name}>
              {area.name}
            </option>
          ))}
        </select>
        <p className={styles.status} role="status">
          {saveLocation.isPending
            ? 'Placing you…'
            : problem
              ? problemText[problem]
              : location
                ? `You'll show up around ${location.locality}. Never your exact address.`
                : ''}
        </p>
      </fieldset>

      {saveProfile.isError && (
        <p className={screen.alert} role="alert">
          Couldn't save your profile. Try again.
        </p>
      )}
      <button
        type="submit"
        className={screen.primary}
        disabled={!ready || saveProfile.isPending}
        aria-busy={saveProfile.isPending}
      >
        {saveProfile.isPending ? 'Putting you on the map…' : 'Put me on the map'}
      </button>
    </form>
  );
}
