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

  // ───────────────────────────────────────────────────────────────────────
  // Test 2 — SN2 cyanide substitution
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {

      species: {
        nuc: 'CN-',
        sub: 'CH3-Br'
      },

      transforms: [
        {
          type: 'form',
          bond: ['C', 'CN']
        },
        {
          type: 'break',
          bond: ['C', 'Br']
        }
      ],

      arrows: [],
      persist: []
    };

    const products =
      inferProducts(step);

    assert.deepStrictEqual(
      products,
      [
        'CH3-CN',
        'Br-'
      ],
      'Expected cyanide substitution products'
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 3 — SN2 hydroxide substitution
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {

      species: {
        nuc: 'OH-',
        sub: 'CH3-Br'
      },

      transforms: [
        {
          type: 'form',
          bond: ['C', 'OH']
        },
        {
          type: 'break',
          bond: ['C', 'Br']
        }
      ],

      arrows: [],
      persist: []
    };

    const products =
      inferProducts(step);

    assert.deepStrictEqual(
      products,
      [
        'CH3-OH',
        'Br-'
      ],
      'Expected hydroxide substitution products'
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 4 — Unsupported transform fallback
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {

      species: {
        nuc: 'OH-',
        sub: 'CH3-Cl'
      },

      transforms: [
        {
          type: 'form',
          bond: ['X', 'Y']
        }
      ],

      arrows: [],
      persist: []
    };

    const products =
      inferProducts(step);

    assert.deepStrictEqual(
      products,
      [],
      'Unsupported transforms should not infer products'
    );
  }

  console.log(
    'All product-engine tests passed.'
  );
}

runTests();
