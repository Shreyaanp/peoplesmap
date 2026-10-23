import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { mapPalette, type ThemeName } from '../../tokens';

/** The Hyderabad extract made by `npm run tiles`. Later: Cloudflare R2. */
export const tilesUrl = '/tiles/hyderabad.pmtiles';
const source = 'protomaps';

/** Protomaps' glyphs for now; self-hosted with the tiles when hosting is decided. */
const glyphs = 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';

/** Places and businesses compete with people for attention: the Grey World keeps only roads and areas. */
const droppedLayers = new Set(['pois', 'roads_shields', 'roads_oneway', 'address_label']);

function flavor(theme: ThemeName): Flavor {
  const p = mapPalette[theme];
  const base = namedFlavor(theme === 'dark' ? 'dark' : 'light');
  return {
    ...base,
    background: p.earth,
    earth: p.earth,
    water: p.water,
    park_a: p.park,
    park_b: p.park,
    wood_a: p.park,
    wood_b: p.park,
    scrub_a: p.park,
    scrub_b: p.park,
    hospital: p.landuse,
    industrial: p.landuse,
    school: p.landuse,
    pedestrian: p.landuse,
    aerodrome: p.landuse,
    zoo: p.park,
    military: p.landuse,
    beach: p.landuse,
    sand: p.landuse,
    buildings: p.buildings,
    other: p.roadMinor,
    minor_service: p.roadMinor,
    minor_a: p.roadMinor,
    minor_b: p.roadMinor,
    link: p.roadMajor,
    major: p.roadMajor,
    highway: p.roadHighway,
    minor_service_casing: p.roadCasing,
    minor_casing: p.roadCasing,
    link_casing: p.roadCasing,
    major_casing_early: p.roadCasing,
    major_casing_late: p.roadCasing,
    highway_casing_early: p.roadCasing,
    highway_casing_late: p.roadCasing,
    bridges_other: p.roadMinor,
    bridges_minor: p.roadMinor,
    bridges_link: p.roadMajor,
    bridges_major: p.roadMajor,
    bridges_highway: p.roadHighway,
    tunnel_other: p.roadMinor,
    tunnel_minor: p.roadMinor,
    tunnel_link: p.roadMajor,
    tunnel_major: p.roadMajor,
    tunnel_highway: p.roadHighway,
    railway: p.rail,
    boundaries: p.boundary,
    roads_label_minor: p.label,
    roads_label_minor_halo: p.labelHalo,
    roads_label_major: p.label,
    roads_label_major_halo: p.labelHalo,
    subplace_label: p.label,
    subplace_label_halo: p.labelHalo,
    city_label: p.labelStrong,
    city_label_halo: p.labelHalo,
    state_label: p.label,
    state_label_halo: p.labelHalo,
    country_label: p.label,
    ocean_label: p.label,
    address_label: p.label,
    address_label_halo: p.labelHalo,
  };
}

function quiet(layer: LayerSpecification): LayerSpecification {
  // The locality dot is an icon from Protomaps' sprite, which we do not load.
  if (layer.id === 'places_locality' && layer.layout) {
    const layout: Record<string, unknown> = { ...layer.layout };
    delete layout['icon-image'];
    return { ...layer, layout } as LayerSpecification;
  }
  return layer;
}

export function buildStyle(theme: ThemeName, origin = window.location.origin): StyleSpecification {
  return {
    version: 8,
    glyphs,
    sources: {
      [source]: {
        type: 'vector',
        url: `pmtiles://${origin}${tilesUrl}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: layers(source, flavor(theme), { lang: 'en' })
      .filter((layer) => !droppedLayers.has(layer.id))
      .map(quiet),
  };
}

/** The first label layer: glows draw beneath it, so street and area names stay readable. */
export function firstLabelLayerId(style: StyleSpecification): string | undefined {
  return style.layers.find((layer) => layer.type === 'symbol')?.id;
}
