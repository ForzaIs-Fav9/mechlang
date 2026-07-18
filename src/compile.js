import {
  validateTransforms,
  inferArrowsFromTransforms
} from './semantic-engine.js';

import {
  inferProducts
} from './product-engine.js';

import { MoleculeGraph } from './molecule-graph.js';

export function compile(ast) {
  const steps = ast.steps.map(step => {

    const graphMap = new Map();
    for (const molKey of Object.values(step.species)) {
      if (!graphMap.has(molKey)) {
        try {
          graphMap.set(molKey, MoleculeGraph.fromRegistry(molKey));
        } catch {
          // Unknown molecules are skipped — renderer handles them as [alias?] fallback
        }
      }
    }

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
