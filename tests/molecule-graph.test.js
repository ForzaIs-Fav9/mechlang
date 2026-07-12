import assert from 'node:assert';
import { moleculeRegistry } from '../src/molecules.js';
import { MoleculeGraph } from '../src/molecule-graph.js';

// ─────────────────────────────────────────────────────────────────────────────
// Construction: every registry entry builds without error
// ─────────────────────────────────────────────────────────────────────────────

const registryKeys = Object.keys(moleculeRegistry);

for (const key of registryKeys) {
  const graph = MoleculeGraph.fromRegistry(key);

  assert.strictEqual(
    graph.name,
    key,
    `graph.name should be "${key}"`
  );
}

console.log(`✓ All ${registryKeys.length} registry entries construct successfully`);

// ─────────────────────────────────────────────────────────────────────────────
// Atom count matches registry
// ─────────────────────────────────────────────────────────────────────────────

for (const key of registryKeys) {
  const entry = moleculeRegistry[key];
  const graph = MoleculeGraph.fromRegistry(key);
  const expected = Object.keys(entry.atoms).length;

  assert.strictEqual(
    graph.atoms.length,
    expected,
    `${key}: expected ${expected} atoms, got ${graph.atoms.length}`
  );
}

console.log('✓ Atom counts match for all registry entries');

// ─────────────────────────────────────────────────────────────────────────────
// Bond count matches registry
// ─────────────────────────────────────────────────────────────────────────────

for (const key of registryKeys) {
  const entry = moleculeRegistry[key];
  const graph = MoleculeGraph.fromRegistry(key);
  const expected = (entry.bonds || []).length;

  assert.strictEqual(
    graph.bonds.length,
    expected,
    `${key}: expected ${expected} bonds, got ${graph.bonds.length}`
  );
}

console.log('✓ Bond counts match for all registry entries');

// ─────────────────────────────────────────────────────────────────────────────
// Charge matches registry
// ─────────────────────────────────────────────────────────────────────────────

for (const key of registryKeys) {
  const entry = moleculeRegistry[key];
  const graph = MoleculeGraph.fromRegistry(key);
  const expected = entry.charge ?? 0;

  assert.strictEqual(
    graph.charge,
    expected,
    `${key}: expected charge ${expected}, got ${graph.charge}`
  );
}

console.log('✓ Charges match for all registry entries');

// ─────────────────────────────────────────────────────────────────────────────
// Element extraction
// ─────────────────────────────────────────────────────────────────────────────

const elementCases = [
  { key: 'CH3-Br', atomId: 'C', expectedElement: 'C' },
  { key: 'CH3-Br', atomId: 'Br', expectedElement: 'Br' },
  { key: 'CN-', atomId: 'N', expectedElement: 'N' },
  { key: 'CN-', atomId: 'C', expectedElement: 'C' },
  { key: 'OH-', atomId: 'O', expectedElement: 'O' },
  { key: 'CH2=CH2', atomId: 'Ca', expectedElement: 'C' },
  { key: 'CH2=CH2', atomId: 'Cb', expectedElement: 'C' },
  { key: 'CH3COCH3', atomId: 'Ca', expectedElement: 'C' },
  { key: 'CH3COCH3', atomId: 'Cb', expectedElement: 'C' },
  { key: 'CH3COCH3', atomId: 'Cc', expectedElement: 'C' },
  { key: 'CH3COCH3', atomId: 'O', expectedElement: 'O' },
  { key: 'CH3-Cl', atomId: 'Cl', expectedElement: 'Cl' },
  { key: 'CH3-I', atomId: 'I', expectedElement: 'I' },
  { key: 'CH3-F', atomId: 'F', expectedElement: 'F' },
  { key: 'HS-', atomId: 'S', expectedElement: 'S' },
  { key: 'HBr', atomId: 'H', expectedElement: 'H' }
];

for (const { key, atomId, expectedElement } of elementCases) {
  const graph = MoleculeGraph.fromRegistry(key);
  const atom = graph.atoms.find(a => a.id === atomId);

  assert.ok(
    atom,
    `${key}: atom "${atomId}" not found`
  );

  assert.strictEqual(
    atom.element,
    expectedElement,
    `${key}: atom "${atomId}" should have element "${expectedElement}", got "${atom.element}"`
  );
}

console.log('✓ Element extraction correct for all test cases');

// ─────────────────────────────────────────────────────────────────────────────
// Bond structure
// ─────────────────────────────────────────────────────────────────────────────

const ch3br = MoleculeGraph.fromRegistry('CH3-Br');
assert.strictEqual(ch3br.bonds[0].from, 'C');
assert.strictEqual(ch3br.bonds[0].to, 'Br');
assert.strictEqual(ch3br.bonds[0].order, 1);

const ethene = MoleculeGraph.fromRegistry('CH2=CH2');
assert.strictEqual(ethene.bonds[0].from, 'Ca');
assert.strictEqual(ethene.bonds[0].to, 'Cb');
assert.strictEqual(ethene.bonds[0].order, 2);

const acetone = MoleculeGraph.fromRegistry('CH3COCH3');
const carbonylBond = acetone.bonds.find(b =>
  (b.from === 'Cb' && b.to === 'O') || (b.from === 'O' && b.to === 'Cb')
);
assert.ok(carbonylBond, 'CH3COCH3: carbonyl bond Cb-O should exist');
assert.strictEqual(carbonylBond.order, 2);

console.log('✓ Bond from/to/order structure correct');

// ─────────────────────────────────────────────────────────────────────────────
// Error case: unknown registry key
// ─────────────────────────────────────────────────────────────────────────────

assert.throws(
  () => MoleculeGraph.fromRegistry('NONEXISTENT'),
  /Unknown registry key/
);

console.log('✓ Unknown registry key throws');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nAll molecule-graph tests passed.');
