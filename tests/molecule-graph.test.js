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
 feature/molecule-graph-queries
// getAtom: lookup existing atom
// ─────────────────────────────────────────────────────────────────────────────

{
  const graph = MoleculeGraph.fromRegistry('CH3-Br');
  const atom = graph.getAtom('C');
  assert.ok(atom, 'getAtom should return the atom');
  assert.strictEqual(atom.id, 'C');
  assert.strictEqual(atom.element, 'C');

  const br = graph.getAtom('Br');
  assert.ok(br, 'getAtom should return Br atom');
  assert.strictEqual(br.element, 'Br');
}

console.log('✓ getAtom returns existing atoms');

// ─────────────────────────────────────────────────────────────────────────────
// getAtom: missing atom returns null
// ─────────────────────────────────────────────────────────────────────────────

{
  const graph = MoleculeGraph.fromRegistry('CH3-Br');
  const missing = graph.getAtom('Zn');
  assert.strictEqual(missing, null, 'getAtom should return null for missing atom');
}

console.log('✓ getAtom returns null for missing atom');

// ─────────────────────────────────────────────────────────────────────────────
// neighbors: returns connected atom ids
// ─────────────────────────────────────────────────────────────────────────────

{
  const acetone = MoleculeGraph.fromRegistry('CH3COCH3');
  const neighborsOfCb = acetone.neighbors('Cb');
  assert.ok(neighborsOfCb.includes('Ca'), 'Cb should neighbor Ca');
  assert.ok(neighborsOfCb.includes('Cc'), 'Cb should neighbor Cc');
  assert.ok(neighborsOfCb.includes('O'), 'Cb should neighbor O');
  assert.strictEqual(neighborsOfCb.length, 3, 'Cb should have 3 neighbors');

  const neighborsOfO = acetone.neighbors('O');
  assert.ok(neighborsOfO.includes('Cb'), 'O should neighbor Cb');
  assert.strictEqual(neighborsOfO.length, 1, 'O should have 1 neighbor');
}

console.log('✓ neighbors returns connected atom ids');

// ─────────────────────────────────────────────────────────────────────────────
// neighbors: isolated/missing atom returns empty array
// ─────────────────────────────────────────────────────────────────────────────

{
  const graph = MoleculeGraph.fromRegistry('CH3-Br');
  const result = graph.neighbors('NONEXISTENT');
  assert.deepStrictEqual(result, [], 'neighbors of missing atom should be empty');
}

console.log('✓ neighbors returns empty array for missing atom');

// ─────────────────────────────────────────────────────────────────────────────
// hasBond: existing bond
// ─────────────────────────────────────────────────────────────────────────────

{
  const graph = MoleculeGraph.fromRegistry('CH3-Br');
  assert.strictEqual(graph.hasBond('C', 'Br'), true, 'C-Br bond should exist');
  assert.strictEqual(graph.hasBond('Br', 'C'), true, 'Br-C bond should exist (reverse)');
}

console.log('✓ hasBond returns true for existing bonds');

// ─────────────────────────────────────────────────────────────────────────────
// hasBond: missing bond
// ─────────────────────────────────────────────────────────────────────────────

{
  const acetone = MoleculeGraph.fromRegistry('CH3COCH3');
  assert.strictEqual(acetone.hasBond('Ca', 'O'), false, 'Ca-O bond should not exist');
  assert.strictEqual(acetone.hasBond('X', 'Y'), false, 'nonexistent atoms should return false');
}

console.log('✓ hasBond returns false for missing bonds');

// ─────────────────────────────────────────────────────────────────────────────
// getBond: existing bond returns bond object
// ─────────────────────────────────────────────────────────────────────────────

{
  const ethene = MoleculeGraph.fromRegistry('CH2=CH2');
  const bond = ethene.getBond('Ca', 'Cb');
  assert.ok(bond, 'getBond should return the bond');
  assert.strictEqual(bond.order, 2);

  const bondReverse = ethene.getBond('Cb', 'Ca');
  assert.ok(bondReverse, 'getBond should work in reverse direction');
  assert.strictEqual(bondReverse.order, 2);
}

console.log('✓ getBond returns bond object for existing bonds');

// ─────────────────────────────────────────────────────────────────────────────
// getBond: missing bond returns null
// ─────────────────────────────────────────────────────────────────────────────

{
  const graph = MoleculeGraph.fromRegistry('CH3-Br');
  const missing = graph.getBond('C', 'NONEXISTENT');
  assert.strictEqual(missing, null, 'getBond should return null for missing bond');
}

console.log('✓ getBond returns null for missing bond');

// ─────────────────────────────────────────────────────────────────────────────
// bondOrder: returns order for existing bond
// ─────────────────────────────────────────────────────────────────────────────

{
  const ch3br = MoleculeGraph.fromRegistry('CH3-Br');
  assert.strictEqual(ch3br.bondOrder('C', 'Br'), 1, 'C-Br should be order 1');

  const ethene = MoleculeGraph.fromRegistry('CH2=CH2');
  assert.strictEqual(ethene.bondOrder('Ca', 'Cb'), 2, 'Ca=Cb should be order 2');

  const acetone = MoleculeGraph.fromRegistry('CH3COCH3');
  assert.strictEqual(acetone.bondOrder('Cb', 'O'), 2, 'Cb=O should be order 2');
  assert.strictEqual(acetone.bondOrder('Ca', 'Cb'), 1, 'Ca-Cb should be order 1');
}

console.log('✓ bondOrder returns correct order');

// ─────────────────────────────────────────────────────────────────────────────
// bondOrder: missing bond returns null
// ─────────────────────────────────────────────────────────────────────────────

{
  const graph = MoleculeGraph.fromRegistry('CH3-Br');
  assert.strictEqual(graph.bondOrder('C', 'NONE'), null, 'bondOrder should return null for missing bond');
}

console.log('✓ bondOrder returns null for missing bond');

// ─────────────────────────────────────────────────────────────────────────────
// atomCount: returns number of atoms
// ─────────────────────────────────────────────────────────────────────────────

{
  const ch3br = MoleculeGraph.fromRegistry('CH3-Br');
  const entry = moleculeRegistry['CH3-Br'];
  assert.strictEqual(ch3br.atomCount(), Object.keys(entry.atoms).length);

  const acetone = MoleculeGraph.fromRegistry('CH3COCH3');
  const acetoneEntry = moleculeRegistry['CH3COCH3'];
  assert.strictEqual(acetone.atomCount(), Object.keys(acetoneEntry.atoms).length);
}

console.log('✓ atomCount returns correct count');

// ─────────────────────────────────────────────────────────────────────────────
// bondCount: returns number of bonds
// ─────────────────────────────────────────────────────────────────────────────

{
  const ch3br = MoleculeGraph.fromRegistry('CH3-Br');
  const entry = moleculeRegistry['CH3-Br'];
  assert.strictEqual(ch3br.bondCount(), (entry.bonds || []).length);

  const acetone = MoleculeGraph.fromRegistry('CH3COCH3');
  const acetoneEntry = moleculeRegistry['CH3COCH3'];
  assert.strictEqual(acetone.bondCount(), (acetoneEntry.bonds || []).length);
}

console.log('✓ bondCount returns correct count');

// ─────────────────────────────────────────────────────────────────────────────
 main
// Error case: unknown registry key
// ─────────────────────────────────────────────────────────────────────────────

assert.throws(
  () => MoleculeGraph.fromRegistry('NONEXISTENT'),
  /Unknown registry key/
);

console.log('✓ Unknown registry key throws');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nAll molecule-graph tests passed.');
