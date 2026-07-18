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
// getAtom
// ─────────────────────────────────────────────────────────────────────────────

const ch3brG = MoleculeGraph.fromRegistry('CH3-Br');

assert.deepStrictEqual(
  ch3brG.getAtom('C'),
  { id: 'C', element: 'C' }
);

assert.deepStrictEqual(
  ch3brG.getAtom('Br'),
  { id: 'Br', element: 'Br' }
);

assert.strictEqual(
  ch3brG.getAtom('O'),
  null
);

const acetoneG = MoleculeGraph.fromRegistry('CH3COCH3');
assert.deepStrictEqual(
  acetoneG.getAtom('Ca'),
  { id: 'Ca', element: 'C' }
);

console.log('✓ getAtom works correctly');

// ─────────────────────────────────────────────────────────────────────────────
// neighbors
// ─────────────────────────────────────────────────────────────────────────────

const neighborsC = ch3brG.neighbors('C');
assert.deepStrictEqual(neighborsC, ['Br']);

const neighborsBr = ch3brG.neighbors('Br');
assert.deepStrictEqual(neighborsBr, ['C']);

const neighborsNone = ch3brG.neighbors('O');
assert.deepStrictEqual(neighborsNone, []);

const acetoneCb = acetoneG.neighbors('Cb');
assert.ok(acetoneCb.includes('Ca'));
assert.ok(acetoneCb.includes('O'));
assert.ok(acetoneCb.includes('Cc'));
assert.strictEqual(acetoneCb.length, 3);

console.log('✓ neighbors works correctly');

// ─────────────────────────────────────────────────────────────────────────────
// hasBond
// ─────────────────────────────────────────────────────────────────────────────

assert.strictEqual(ch3brG.hasBond('C', 'Br'), true);
assert.strictEqual(ch3brG.hasBond('Br', 'C'), true);
assert.strictEqual(ch3brG.hasBond('C', 'O'), false);
assert.strictEqual(ch3brG.hasBond('N', 'C'), false);

const cnG = MoleculeGraph.fromRegistry('CN-');
assert.strictEqual(cnG.hasBond('N', 'C'), true);
assert.strictEqual(cnG.hasBond('C', 'N'), true);

console.log('✓ hasBond works correctly');

// ─────────────────────────────────────────────────────────────────────────────
// getBond
// ─────────────────────────────────────────────────────────────────────────────

const cbr = ch3brG.getBond('C', 'Br');
assert.deepStrictEqual(cbr, { from: 'C', to: 'Br', order: 1 });

const brc = ch3brG.getBond('Br', 'C');
assert.deepStrictEqual(brc, { from: 'C', to: 'Br', order: 1 });

assert.strictEqual(ch3brG.getBond('C', 'O'), null);

const etheneG = MoleculeGraph.fromRegistry('CH2=CH2');
const doubleBond = etheneG.getBond('Ca', 'Cb');
assert.deepStrictEqual(doubleBond, { from: 'Ca', to: 'Cb', order: 2 });

console.log('✓ getBond works correctly');

// ─────────────────────────────────────────────────────────────────────────────
// bondOrder
// ─────────────────────────────────────────────────────────────────────────────

assert.strictEqual(ch3brG.bondOrder('C', 'Br'), 1);
assert.strictEqual(ch3brG.bondOrder('Br', 'C'), 1);
assert.strictEqual(ch3brG.bondOrder('C', 'O'), null);

assert.strictEqual(etheneG.bondOrder('Ca', 'Cb'), 2);
assert.strictEqual(etheneG.bondOrder('Cb', 'Ca'), 2);

const acetaldehyde = MoleculeGraph.fromRegistry('CH3CHO');
assert.strictEqual(acetaldehyde.bondOrder('Cb', 'O'), 2);
assert.strictEqual(acetaldehyde.bondOrder('Ca', 'Cb'), 1);

console.log('✓ bondOrder works correctly');

// ─────────────────────────────────────────────────────────────────────────────
// atomCount and bondCount
// ─────────────────────────────────────────────────────────────────────────────

assert.strictEqual(ch3brG.atomCount(), 2);
assert.strictEqual(ch3brG.bondCount(), 1);

assert.strictEqual(acetoneG.atomCount(), 4);
assert.strictEqual(acetoneG.bondCount(), 3);

const ohG = MoleculeGraph.fromRegistry('OH-');
assert.strictEqual(ohG.atomCount(), 1);
assert.strictEqual(ohG.bondCount(), 0);

const propene = MoleculeGraph.fromRegistry('CH3-CH=CH2');
assert.strictEqual(propene.atomCount(), 3);
assert.strictEqual(propene.bondCount(), 2);

console.log('✓ atomCount and bondCount work correctly');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nAll molecule-graph tests passed.');
