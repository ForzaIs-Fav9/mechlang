import assert from 'assert';
import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

const TEST_OUT = 'out/_test_render';

function run(args) {
  return execSync(`node src/cli.js ${args}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function renderTo(mechFile, flags = '') {
  const base = path.basename(mechFile, '.mech');
  const suffix = flags.includes('--layout=horizontal')
    ? '.horizontal.svg'
    : '.svg';
  run(`${mechFile} ${flags}`);
  return `out/${base}${suffix}`;
}

function runTests() {

  // ───────────────────────────────────────────────────────────────────────
  // Test 1 — Renderer executes without error
  // ───────────────────────────────────────────────────────────────────────

  {
    let threw = false;
    try {
      run('examples/sn2.mech');
    } catch {
      threw = true;
    }

    assert.strictEqual(threw, false, 'Renderer should not throw on valid input');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 2 — SVG output file is generated
  // ───────────────────────────────────────────────────────────────────────

  {
    const outPath = renderTo('examples/sn2.mech');

    assert.strictEqual(
      existsSync(outPath),
      true,
      `Expected output file ${outPath} to exist`
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 3 — Output is valid SVG (contains svg root element)
  // ───────────────────────────────────────────────────────────────────────

  {
    const outPath = renderTo('examples/sn2.mech');
    const svg = readFileSync(outPath, 'utf8');

    assert.ok(svg.includes('<svg'), 'Output should contain <svg element');
    assert.ok(svg.includes('</svg>'), 'Output should contain closing </svg>');
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), 'Output should have SVG namespace');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 4 — Vertical layout rendering (default)
  // ───────────────────────────────────────────────────────────────────────

  {
    const outPath = renderTo('examples/sn2_steps.mech');
    const svg = readFileSync(outPath, 'utf8');

    assert.ok(svg.includes('viewBox'), 'SVG should have a viewBox');
    assert.ok(svg.includes('<text'), 'SVG should contain atom labels');
    assert.ok(!outPath.includes('.horizontal.'), 'Default output should not be horizontal');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 5 — Horizontal layout rendering
  // ───────────────────────────────────────────────────────────────────────

  {
    const outPath = renderTo('examples/sn2_steps.mech', '--layout=horizontal');

    assert.strictEqual(
      existsSync(outPath),
      true,
      'Horizontal layout output should exist'
    );

    assert.ok(
      outPath.includes('.horizontal.svg'),
      'Horizontal output filename should contain .horizontal.svg'
    );

    const svg = readFileSync(outPath, 'utf8');
    assert.ok(svg.includes('<svg'), 'Horizontal SVG should be valid');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 6 — Deterministic output (same input → same output)
  // ───────────────────────────────────────────────────────────────────────

  {
    renderTo('examples/sn2.mech');
    const first = readFileSync('out/sn2.svg', 'utf8');

    renderTo('examples/sn2.mech');
    const second = readFileSync('out/sn2.svg', 'utf8');

    assert.strictEqual(
      first,
      second,
      'Renderer output must be deterministic — two runs should produce identical SVG'
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 7 — All canonical examples render without error
  // ───────────────────────────────────────────────────────────────────────

  {
    const examples = [
      'examples/double_bond_test.mech',
      'examples/persistence_test.mech',
      'examples/sn1_steps.mech',
      'examples/sn2.mech',
      'examples/sn2_alt.mech',
      'examples/sn2_steps.mech',
      'examples/transform_test.mech',
      'examples/transform_warning_test.mech'
    ];

    for (const file of examples) {
      let threw = false;
      try {
        run(file);
      } catch (e) {
        threw = true;
        console.error(`Failed to render ${file}: ${e.message}`);
      }

      assert.strictEqual(threw, false, `${file} should render without error`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 8 — Output contains expected molecule content
  // ───────────────────────────────────────────────────────────────────────

  {
    renderTo('examples/sn2.mech');
    const svg = readFileSync('out/sn2.svg', 'utf8');

    assert.ok(/>\s*C\s*<\/text>/.test(svg), 'SN2 output should contain carbon atom label');
    assert.ok(/>\s*Br\s*<\/text>/.test(svg), 'SN2 output should contain bromine atom label');
    assert.ok(svg.includes('marker-end'), 'SN2 output should contain arrow markers');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 9 — Double bond example produces parallel lines
  // ───────────────────────────────────────────────────────────────────────

  {
    renderTo('examples/double_bond_test.mech');
    const svg = readFileSync('out/double_bond_test.svg', 'utf8');

    const lineCount = (svg.match(/<line/g) || []).length;
    assert.ok(lineCount >= 2, 'Double bond rendering should produce at least 2 line elements');
  }

  // ───────────────────────────────────────────────────────────────────────
  // Test 10 — Charges are rendered
  // ───────────────────────────────────────────────────────────────────────

  {
    renderTo('examples/sn2.mech');
    const svg = readFileSync('out/sn2.svg', 'utf8');

    const hasCharge = svg.includes('−') || svg.includes('+');
    assert.ok(hasCharge, 'SN2 output should render charge annotations');
  }

  console.log('All render tests passed.');
}

runTests();
