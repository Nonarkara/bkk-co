import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const { dist, stationEligible, riverSegments, crossesSegments } = createRequire(import.meta.url)('../public/journey-model.js');
const read = file => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url)));
const world = read('street-world');
const geography = read('journey-geo');
const evidence = read('journey-evidence');
const work = new Map(read('places-work').rows.map(([id, , , y, x]) => [id, { x, y }]));
const laptopPlaces = Object.entries(evidence.places)
  .filter(([, place]) => place.facts.wifi?.value === true && place.facts.power?.value === true)
  .map(([id]) => work.get(id));
const stations = geography.stations.filter(stationEligible);
const river = riverSegments(read('barriers').lines);
assert(stations.length && world.areas.length && river.length, 'Missing stations, area anchors or river geometry');
const areas = world.areas.map(area => {
  const { x, y, sourceID } = area.anchor;
  assert(/^[nwor][a-f0-9]+$/.test(sourceID) && Number.isFinite(dist(area.anchor, area.anchor)), `Invalid area anchor: ${area.id}`);
  const nearest = stations.reduce((best, station) => {
    const metres = dist(area.anchor, station);
    return metres < best.metres && !crossesSegments(area.anchor, station, river) ? { station, metres } : best;
  }, { metres: Infinity });
  assert(nearest.station, `No same-bank station for ${area.id}`);
  const { id, name, nameTh, systems } = nearest.station;
  return {
    id: area.id, name: area.name, nameTh: area.nameTh, anchor: { x, y, id: sourceID },
    radius: area.radiusM, mix: area.mix,
    laptopDocumented: laptopPlaces.filter(place => dist(area.anchor, place) <= area.radiusM).length,
    heightVolumes: area.heightVolumes,
    rail: { id, name, nameTh, systems, metres: nearest.metres < 1 ? 0 : Math.max(10, Math.round(nearest.metres / 10) * 10) }
  };
});
writeFileSync(new URL('../public/data/day-areas.json', import.meta.url), `${JSON.stringify({
  source: { areas: 'street-world.json', rail: 'journey-geo.json', railDate: geography.manifest.asOf.slice(0, 10), workplaceEvidenceDate: evidence.checked_at }, areas
})}\n`);
console.log(`Day planner: ${areas.length} pinned area anchors and nearest eligible mapped stations.`);
