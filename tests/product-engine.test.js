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

    const result =
      inferProducts(step);

    assert.strictEqual(
      result.inferred,
      false,
      'Expected inference flag to remain false'
    );

    assert.strictEqual(
      result.mechanism,
      null,
      'Expected null mechanism for empty inference'
    );

    assert.deepStrictEqual(
      result.products,
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

    const result =
      inferProducts(step);

    assert.strictEqual(
      result.inferred,
      true,
      'Expected SN2 cyanide substitution inference'
    );

    assert.strictEqual(
      result.mechanism,
      'SN2',
      'Expected SN2 mechanism classification'
    );

    assert.deepStrictEqual(
      result.products,
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

    const result =
      inferProducts(step);

    assert.strictEqual(
      result.inferred,
      true,
      'Expected hydroxide substitution inference'
    );

    assert.strictEqual(
      result.mechanism,
      'SN2',
      'Expected SN2 mechanism classification'
    );

    assert.deepStrictEqual(
      result.products,
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

    const result =
      inferProducts(step);

    assert.strictEqual(
      result.inferred,
      false,
      'Unsupported transforms should not infer products'
    );

    assert.strictEqual(
      result.mechanism,
      null,
      'Unsupported transforms should not classify mechanisms'
    );

    assert.deepStrictEqual(
      result.products,
      [],
      'Unsupported transforms should return empty products'
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 5 — Species alone should NOT infer products
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {

      species: {
        nuc: 'CN-',
        sub: 'CH3-Br'
      },

      transforms: [],

      arrows: [],
      persist: []
    };

    const result =
      inferProducts(step);

    assert.strictEqual(
      result.inferred,
      false,
      'Species presence alone should not infer products'
    );

    assert.deepStrictEqual(
      result.products,
      [],
      'Species-only inference should produce no products'
    );
  }

  console.log(
    'All product-engine tests passed.'
  );
}

runTests();
