import {
  validateTransforms,
  inferArrowsFromTransforms
} from './semantic-engine.js';

import {
  inferProducts
} from './product-engine.js';

export function compile(ast) {
  const steps = ast.steps.map(step => {
    validateTransforms(step);

    const species = { ...step.species };
    const inference = inferProducts(step);

    if (inference.inferred) {
      inference.products.forEach((product, index) => {
        species[`inferred_${index}`] = product;
      });
    }

    const arrows = step.arrows.length > 0
      ? step.arrows
      : inferArrowsFromTransforms(step);

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
