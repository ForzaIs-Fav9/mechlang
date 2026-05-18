import assert from 'assert';

import {
  inferArrowsFromTransforms
} from '../src/semantic-engine.js';

function runTests() {

  // ───────────────────────────────────────────────────────────────────────
  // Test 1 — SN2 arrow inference
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

    const arrows =
      inferArrowsFromTransforms(step);

    assert.strictEqual(
      arrows.length,
      2,
      'Expected 2 inferred arrows for SN2 transform'
    );

    assert.strictEqual(
      arrows[0].from,
      'nuc.C',
      'Attack arrow should originate from nucleophile carbon'
    );

    assert.strictEqual(
      arrows[0].to,
      'sub.C-Br',
      'Attack arrow should target electrophilic bond'
    );

    assert.strictEqual(
      arrows[1].from,
      'sub.C-Br',
      'Leaving-group arrow should originate from bond midpoint'
    );

    assert.strictEqual(
      arrows[1].to,
      'sub.Br',
      'Leaving-group arrow should terminate at leaving group'
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 2 — No transforms
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {
      species: {},
      transforms: [],
      arrows: [],
      persist: []
    };

    const arrows =
      inferArrowsFromTransforms(step);

    assert.strictEqual(
      arrows.length,
      0,
      'Expected no inferred arrows when transforms are absent'
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 3 — Unsupported transform
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {

      species: {
        nuc: 'OH-'
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

    const arrows =
      inferArrowsFromTransforms(step);

    assert.strictEqual(
      arrows.length,
      0,
      'Unsupported transforms should not infer arrows'
    );
  }

  console.log(
    'All semantic-engine tests passed.'
  );
}

runTests();
