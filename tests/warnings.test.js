import assert from 'assert';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { parseMechlang } from '../src/parse.js';
import { validateTransforms } from '../src/semantic-engine.js';
import { MoleculeGraph } from '../src/molecule-graph.js';

function buildGraphMap(species) {
  const graphMap = new Map();
  for (const molKey of Object.values(species)) {
    if (!graphMap.has(molKey)) {
      try { graphMap.set(molKey, MoleculeGraph.fromRegistry(molKey)); }
      catch { /* skip */ }
    }
  }
  return graphMap;
}

function captureWarns(fn) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return warnings;
}

function runTests() {

  // ═══════════════════════════════════════════════════════════════════════
  // PARSER WARNINGS
  // ═══════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────────
  // Test 1 — persist alias not found in previous step
  // ───────────────────────────────────────────────────────────────────────

  {
    const warnings = captureWarns(() => {
      parseMechlang(`
step {
  species:
    nuc = CN-
}
step {
  persist: ghost
  species:
    product = CH3-CN
}
      `);
    });

    const match = warnings.find(w => w.includes('ghost') && w.includes('not found'));
    assert.ok(match, 'Should warn when persist alias is not in previous step');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 2 — persist alias already declared in species block
  // ───────────────────────────────────────────────────────────────────────

  {
    const warnings = captureWarns(() => {
      parseMechlang(`
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
    });

    const match = warnings.find(w => w.includes('nuc') && w.includes('already declared'));
    assert.ok(match, 'Should warn when persist alias conflicts with species declaration');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 3 — malformed input produces warnings instead of throwing
  // ───────────────────────────────────────────────────────────────────────

  {
    let threw = false;
    const warnings = captureWarns(() => {
      try {
        parseMechlang(`
not a step
garbage = true
step {
  species:
    bad line no equals
}
        `);
      } catch {
        threw = true;
      }
    });

    assert.strictEqual(threw, false, 'Parser must never throw on malformed input');
    assert.ok(warnings.length > 0, 'Malformed input should produce at least one warning');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 4 — empty input returns { steps: [] } with warning
  // ───────────────────────────────────────────────────────────────────────

  {
    const warnings = captureWarns(() => {
      const ast = parseMechlang('');
      assert.deepStrictEqual(ast, { steps: [] });
    });

    const match = warnings.find(w => w.includes('No step blocks'));
    assert.ok(match, 'Empty input should warn about missing step blocks');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 5 — invalid input (no steps) returns { steps: [] }
  // ───────────────────────────────────────────────────────────────────────

  {
    let ast;
    const warnings = captureWarns(() => {
      ast = parseMechlang('just random text here');
    });

    assert.deepStrictEqual(ast, { steps: [] });
    assert.ok(warnings.length > 0, 'Invalid input should produce warnings');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDERER WARNINGS
  // ═══════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────────
  // Test 6 — unknown molecule key renders fallback label
  // ───────────────────────────────────────────────────────────────────────

  {
    const tempMech = '/tmp/_test_unknown_mol.mech';
    writeFileSync(tempMech, `
step {
  species:
    x = UNKNOWN_MOLECULE
}
    `);

    try {
      execSync(`node src/cli.js ${tempMech}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const svg = readFileSync('out/_test_unknown_mol.svg', 'utf8');
      assert.ok(
        svg.includes('[x?]'),
        'Unknown molecule should render red fallback label [alias?]'
      );
    } finally {
      unlinkSync(tempMech);
      try { unlinkSync('out/_test_unknown_mol.svg'); } catch {}
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 7 — missing arrow endpoints skip arrow with warning
  // ───────────────────────────────────────────────────────────────────────

  {
    const tempMech = '/tmp/_test_bad_arrow.mech';
    writeFileSync(tempMech, `
step {
  species:
    nuc = CN-
    sub = CH3-Br
  arrow(
    curved,
    from = nuc.C
  )
}
    `);

    try {
      const result = execSync(`node src/cli.js ${tempMech} 2>&1`, {
        encoding: 'utf8'
      });

      assert.ok(
        result.includes('missing') || result.includes('skipping'),
        'Missing arrow endpoint should produce a warning'
      );

      assert.ok(
        existsSync('out/_test_bad_arrow.svg'),
        'Renderer should still produce output despite malformed arrow'
      );
    } finally {
      unlinkSync(tempMech);
      try { unlinkSync('out/_test_bad_arrow.svg'); } catch {}
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 8 — unknown atom labels fall back to first atom
  // ───────────────────────────────────────────────────────────────────────

  {
    const tempMech = '/tmp/_test_unknown_atom.mech';
    writeFileSync(tempMech, `
step {
  species:
    nuc = CN-
    sub = CH3-Br
  arrow(
    curved,
    from = nuc.NONEXISTENT,
    to   = sub.C
  )
}
    `);

    try {
      execSync(`node src/cli.js ${tempMech}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const svg = readFileSync('out/_test_unknown_atom.svg', 'utf8');
      assert.ok(svg.includes('<svg'), 'Should produce valid SVG despite unknown atom');
      assert.ok(svg.includes('marker-end'), 'Arrow should still render using fallback atom');
    } finally {
      unlinkSync(tempMech);
      try { unlinkSync('out/_test_unknown_atom.svg'); } catch {}
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SEMANTIC ENGINE WARNINGS
  // ═══════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────────
  // Test 9 — invalid transform operations do not throw
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {
      species: { nuc: 'CN-', sub: 'CH3-Br' },
      transforms: [
        { type: 'form', bond: ['X', 'Y'] }
      ],
      arrows: [],
      persist: []
    };

    let threw = false;
    captureWarns(() => {
      try {
        validateTransforms(step, buildGraphMap(step.species));
      } catch {
        threw = true;
      }
    });

    assert.strictEqual(threw, false, 'validateTransforms must never throw');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 10 — impossible bond references warn
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {
      species: { sub: 'CH3-Br' },
      transforms: [
        { type: 'break', bond: ['X', 'Z'] }
      ],
      arrows: [],
      persist: []
    };

    const warnings = captureWarns(() => {
      validateTransforms(step, buildGraphMap(step.species));
    });

    const match = warnings.find(w => w.includes('missing bond') && w.includes('X-Z'));
    assert.ok(match, 'Should warn about break transform referencing nonexistent bond');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 11 — missing nucleophile detection
  // ───────────────────────────────────────────────────────────────────────

  {
    const step = {
      species: { sub: 'CH3-Br' },
      transforms: [
        { type: 'form', bond: ['C', 'CN'] }
      ],
      arrows: [],
      persist: []
    };

    const warnings = captureWarns(() => {
      validateTransforms(step, buildGraphMap(step.species));
    });

    const match = warnings.find(w => w.includes('CN-') && w.includes('nucleophile'));
    assert.ok(match, 'Should warn when form transform requires nucleophile not present in species');
  }

  console.log('All warning tests passed.');
}

runTests();
