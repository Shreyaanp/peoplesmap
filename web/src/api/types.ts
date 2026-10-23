import type { components } from './schema';

/** Short names for the contract's schemas. Generated from api/openapi.yaml; never hand-written. */
type Schemas = components['schemas'];

export type Problem = Schemas['Problem'];
export type LatLng = Schemas['LatLng'];
export type Distance = Schemas['Distance'];
export type TagRef = Schemas['TagRef'];
export type TagLevel = Schemas['TagLevel'];
export type PersonTag = Schemas['PersonTag'];
export type ProfileTag = Schemas['ProfileTag'];
export type TagSuggestion = Schemas['TagSuggestion'];
export type RelatedTag = Schemas['RelatedTag'];
export type LiveTag = Schemas['LiveTag'];
export type Photo = Schemas['Photo'];
export type PersonMini = Schemas['PersonMini'];
export type PersonPin = Schemas['PersonPin'];
export type PersonCard = Schemas['PersonCard'];
export type PersonCardPage = Schemas['PersonCardPage'];
export type Profile = Schemas['Profile'];
export type Me = Schemas['Me'];
export type GlowCell = Schemas['GlowCell'];
export type GlowTile = Schemas['GlowTile'];
export type PeopleTile = Schemas['PeopleTile'];
export type ParsedQuery = Schemas['ParsedQuery'];
export type SearchResult = Schemas['SearchResult'];
export type NearestCluster = Schemas['NearestCluster'];
export type ConnectionState = Schemas['ConnectionState'];
export type TagInput = Schemas['TagInput'];
export type ExtractedTag = Schemas['ExtractedTag'];
export type LocationMode = Schemas['LocationMode'];
export type MyLocation = Schemas['MyLocation'];
