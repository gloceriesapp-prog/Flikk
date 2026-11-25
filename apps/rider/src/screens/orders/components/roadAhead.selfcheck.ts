import assert from 'node:assert/strict';
import { roadAhead } from './roadAhead';

const road = [
  { latitude: 13.34, longitude: 74.74 },
  { latitude: 13.34, longitude: 74.745 },
  { latitude: 13.345, longitude: 74.745 },
  { latitude: 13.35, longitude: 74.745 },
];

// Halfway along the third stretch: the line starts at the rider and skips
// the road already ridden.
const rider = { latitude: 13.3425, longitude: 74.7451 };
assert.deepEqual(roadAhead(road, rider), [rider, road[2], road[3]]);

// Just before a corner (closer to the corner point than to where the
// stretch began): the corner stays in the line, never cut.
const nearCorner = { latitude: 13.3449, longitude: 74.7451 };
assert.deepEqual(roadAhead(road, nearCorner), [nearCorner, road[2], road[3]]);

// Before the first point: the whole road ahead.
const start = { latitude: 13.3399, longitude: 74.7399 };
assert.deepEqual(roadAhead(road, start), [start, ...road.slice(1)]);

// At the end: the rider and the last point.
assert.deepEqual(roadAhead(road, road[3]!), [road[3], road[3]]);
console.log('roadAhead selfcheck ok');
