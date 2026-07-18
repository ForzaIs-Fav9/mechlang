import { MoleculeGraph } from '../src/molecule-graph.js';

export function buildGraphMap(species) {
  const graphMap = new Map();
  for (const molKey of Object.values(species)) {
    if (!graphMap.has(molKey)) {
      try {
        graphMap.set(molKey, MoleculeGraph.fromRegistry(molKey));
      } catch {
        // test may use unknown species
      }
    }
  }
  return graphMap;
}
