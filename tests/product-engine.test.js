import assert from 'assert';

import {
  inferProducts
} from '../src/product-engine.js';

function runTests() {

  // ───────────────────────────────────────────────────────────────────────
  // Test 1 — Empty inference fallback
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {
      species: {},
      transforms: [],
      arrows: [],
      persist: []
    };

    const products =
      inferProducts(step);

    assert.deepStrictEqual(
      products,
      [],
      'Expected empty product inference fallback'
    );
  }

  console.log(
    'All product-engine tests passed.'
  );
}

runTests();
