import { MoleculeGraph } from './molecule-graph.js';

import {
  validateTransforms,
  inferArrowsFromTransforms
} from './semantic-engine.js';

import {
  inferProducts
} from './product-engine.js';

function buildGraphMap(species) {
  const graphMap = new Map();
  for (const molKey of Object.values(species)) {
    if (!graphMap.has(molKey)) {
      try { graphMap.set(molKey, MoleculeGraph.fromRegistry(molKey)); }
      catch { /* unknown registry key — engines handle gracefully */ }
    }
  }
  return graphMap;
}

export function compile(ast) {
  const steps = ast.steps.map(step => {
    const graphMap = buildGraphMap(step.species);

    validateTransforms(step, graphMap);

    const species = { ...step.species };
    const inference = inferProducts(step, graphMap);

    if (inference.inferred) {
      inference.products.forEach((product, index) => {
        species[`inferred_${index}`] = product;
      });
    }

    const arrows = step.arrows.length > 0
      ? step.arrows
      : inferArrowsFromTransforms(step, graphMap);

    return {
      species,
      originalSpecies: step.species,
      arrows,
      transforms: step.transforms,
      mechanism: inference.mechanism,
      diagnostics: inference.diagnostics
    };
  });

  return { steps };
}
