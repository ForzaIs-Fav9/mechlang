import assert from 'assert';
import { parseMechlang } from '../src/parse.js';

function runTests() {

  // ───────────────────────────────────────────────────────────────────────
  // Test 1 — Basic species parsing
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    sub = CH3-Br
}
    `);

    assert.strictEqual(ast.steps.length, 1);
    assert.strictEqual(ast.steps[0].species.nuc, 'CN-');
    assert.strictEqual(ast.steps[0].species.sub, 'CH3-Br');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 2 — Species persistence resolves from previous step
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    sub = CH3-Br
}
step {
  persist: nuc
  species:
    product = CH3-CN
}
    `);

    assert.strictEqual(ast.steps.length, 2);
    assert.strictEqual(ast.steps[1].species.nuc, 'CN-');
    assert.strictEqual(ast.steps[1].species.product, 'CH3-CN');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 3 — Multiple persist aliases
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    sub = CH3-Br
}
step {
  persist: nuc, sub
  species:
    product = CH3-CN
}
    `);

    assert.strictEqual(ast.steps[1].species.nuc, 'CN-');
    assert.strictEqual(ast.steps[1].species.sub, 'CH3-Br');
    assert.strictEqual(ast.steps[1].species.product, 'CH3-CN');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 4 — Persist alias not found in previous step (skipped gracefully)
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
}
step {
  persist: nonexistent
  species:
    product = CH3-CN
}
    `);

    assert.strictEqual(ast.steps[1].species.nonexistent, undefined);
    assert.strictEqual(ast.steps[1].species.product, 'CH3-CN');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 5 — Duplicate alias: persist skipped when already in species
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
}
step {
  persist: nuc
  species:
    nuc = OH-
}
    `);

    assert.strictEqual(ast.steps[1].species.nuc, 'OH-');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 6 — Transform parsing: form and break
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    sub = CH3-Br
  transform {
    form C-CN
    break C-Br
  }
}
    `);

    assert.strictEqual(ast.steps[0].transforms.length, 2);
    assert.deepStrictEqual(ast.steps[0].transforms[0], {
      type: 'form',
      bond: ['C', 'CN']
    });
    assert.deepStrictEqual(ast.steps[0].transforms[1], {
      type: 'break',
      bond: ['C', 'Br']
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 7 — Malformed input: empty string returns empty steps
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang('');

    assert.deepStrictEqual(ast, { steps: [] });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 8 — Malformed input: garbage text does not throw
  // ───────────────────────────────────────────────────────────────────────

  {
    let threw = false;
    try {
      parseMechlang('this is not valid mechlang at all!!!');
    } catch {
      threw = true;
    }

    assert.strictEqual(threw, false, 'Parser must never throw');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 9 — Malformed species line (no equals sign) is skipped
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    this has no equals
    sub = CH3-Br
}
    `);

    assert.strictEqual(ast.steps[0].species.nuc, 'CN-');
    assert.strictEqual(ast.steps[0].species.sub, 'CH3-Br');
    assert.strictEqual(Object.keys(ast.steps[0].species).length, 2);
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 10 — Malformed transform (unknown type) is skipped
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
  transform {
    form C-CN
    destroy C-Br
    break C-Br
  }
}
    `);

    assert.strictEqual(ast.steps[0].transforms.length, 2);
    assert.strictEqual(ast.steps[0].transforms[0].type, 'form');
    assert.strictEqual(ast.steps[0].transforms[1].type, 'break');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 11 — Malformed transform (missing dash in bond) is skipped
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
  transform {
    form CCN
    break C-Br
  }
}
    `);

    assert.strictEqual(ast.steps[0].transforms.length, 1);
    assert.strictEqual(ast.steps[0].transforms[0].type, 'break');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 12 — Lines outside step blocks are ignored without throwing
  // ───────────────────────────────────────────────────────────────────────

  {
    let threw = false;
    let ast;
    try {
      ast = parseMechlang(`
orphan line
step {
  species:
    nuc = CN-
}
another orphan
      `);
    } catch {
      threw = true;
    }

    assert.strictEqual(threw, false);
    assert.strictEqual(ast.steps.length, 1);
    assert.strictEqual(ast.steps[0].species.nuc, 'CN-');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 13 — Arrow parsing
  // ───────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    sub = CH3-Br
  arrow(
    curved,
    from = nuc.C,
    to   = sub.C-Br
  )
}
    `);

    assert.strictEqual(ast.steps[0].arrows.length, 1);
    assert.strictEqual(ast.steps[0].arrows[0].curved, true);
    assert.strictEqual(ast.steps[0].arrows[0].from, 'nuc.C');
    assert.strictEqual(ast.steps[0].arrows[0].to, 'sub.C-Br');
  }

  console.log('All parse tests passed.');
}

runTests();
