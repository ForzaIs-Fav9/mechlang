import assert from 'assert';
import { parseMechlang } from '../src/parse.js';
import { compile } from '../src/compile.js';

function runTests() {

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1 — compile returns a CompiledMechanism with steps array
  // ─────────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    sub = CH3-Br
}
    `);

    const mechanism = compile(ast);

    assert.ok(Array.isArray(mechanism.steps), 'mechanism.steps should be an array');
    assert.strictEqual(mechanism.steps.length, 1, 'should have 1 step');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2 — each step has required fields
  // ─────────────────────────────────────────────────────────────────────────

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

    const mechanism = compile(ast);
    const step = mechanism.steps[0];

    assert.ok('species' in step, 'step should have species');
    assert.ok('originalSpecies' in step, 'step should have originalSpecies');
    assert.ok('arrows' in step, 'step should have arrows');
    assert.ok('transforms' in step, 'step should have transforms');
    assert.ok('mechanism' in step, 'step should have mechanism');
    assert.ok('diagnostics' in step, 'step should have diagnostics');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3 — product inference populates species with inferred products
  // ─────────────────────────────────────────────────────────────────────────

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

    const mechanism = compile(ast);
    const step = mechanism.steps[0];

    assert.strictEqual(step.mechanism, 'SN2', 'should identify SN2 mechanism');
    assert.ok('inferred_0' in step.species, 'should have inferred_0 product');
    assert.ok('inferred_1' in step.species, 'should have inferred_1 product');
    assert.strictEqual(step.species.inferred_0, 'CH3-CN');
    assert.strictEqual(step.species.inferred_1, 'Br-');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4 — originalSpecies does not contain inferred products
  // ─────────────────────────────────────────────────────────────────────────

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

    const mechanism = compile(ast);
    const step = mechanism.steps[0];

    assert.ok(!('inferred_0' in step.originalSpecies), 'originalSpecies should not have inferred products');
    assert.deepStrictEqual(step.originalSpecies, { nuc: 'CN-', sub: 'CH3-Br' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5 — arrow inference from transforms
  // ─────────────────────────────────────────────────────────────────────────

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

    const mechanism = compile(ast);
    const step = mechanism.steps[0];

    assert.ok(step.arrows.length > 0, 'should have inferred arrows');

    const attack = step.arrows.find(a => a.inferenceType === 'attack');
    assert.ok(attack, 'should have an attack arrow');
    assert.strictEqual(attack.from, 'nuc.C');
    assert.strictEqual(attack.to, 'sub.C-Br');

    const leaving = step.arrows.find(a => a.inferenceType === 'leaving');
    assert.ok(leaving, 'should have a leaving arrow');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6 — explicit arrows are preserved unchanged
  // ─────────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    nuc = CN-
    sub = CH3-Br
  arrow(
    curved,
    from = nuc.C,
    to = sub.C-Br,
  )
}
    `);

    const mechanism = compile(ast);
    const step = mechanism.steps[0];

    assert.strictEqual(step.arrows.length, 1);
    assert.strictEqual(step.arrows[0].from, 'nuc.C');
    assert.strictEqual(step.arrows[0].to, 'sub.C-Br');
    assert.strictEqual(step.arrows[0].curved, true);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7 — step without transforms has empty arrows and no inference
  // ─────────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    mol = CH3-Br
}
    `);

    const mechanism = compile(ast);
    const step = mechanism.steps[0];

    assert.strictEqual(step.arrows.length, 0);
    assert.strictEqual(step.mechanism, null);
    assert.ok(!('inferred_0' in step.species));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8 — multi-step mechanisms compile correctly
  // ─────────────────────────────────────────────────────────────────────────

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

step {
  species:
    nuc = OH-
    sub = CH3-Cl
  persist: nuc, sub
  transform {
    form C-OH
    break C-Cl
  }
}
    `);

    const mechanism = compile(ast);

    assert.strictEqual(mechanism.steps.length, 2);
    assert.strictEqual(mechanism.steps[0].mechanism, 'SN2');
    assert.strictEqual(mechanism.steps[1].mechanism, 'SN2');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9 — diagnostics are populated for unsupported transforms
  // ─────────────────────────────────────────────────────────────────────────

  {
    const ast = parseMechlang(`
step {
  species:
    mol = CH3-Br
  transform {
    form C-N
  }
}
    `);

    const mechanism = compile(ast);
    const step = mechanism.steps[0];

    assert.ok(step.diagnostics.length > 0, 'should have diagnostics');
    assert.strictEqual(step.diagnostics[0].type, 'unsupported-transform');
  }

  console.log('All compile tests passed.');
}

runTests();
