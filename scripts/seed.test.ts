import assert from 'node:assert/strict';
import test from 'node:test';
import { SYNTHETIC_SEED_POTS, runSeed } from './seed';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

test('SYNTHETIC_SEED_POTS covers all three core states (Open, Invested, Matured)', () => {
  const states = SYNTHETIC_SEED_POTS.map((p) => p.state);
  assert.ok(states.includes('Open'), 'Must contain an Open pot');
  assert.ok(states.includes('Invested'), 'Must contain an Invested pot');
  assert.ok(states.includes('Matured'), 'Must contain a Matured pot');
  assert.equal(SYNTHETIC_SEED_POTS.length, 3);
});

test('runSeed executes cleanly, generates local state and supports reset', async () => {
  await runSeed(true);

  const seedFile = path.resolve(process.cwd(), '.local', 'seed-pots.json');
  assert.ok(existsSync(seedFile), 'seed-pots.json should exist');

  const content = JSON.parse(readFileSync(seedFile, 'utf-8'));
  assert.equal(content.length, 3);
  assert.equal(content[0].state, 'Open');
  assert.equal(content[1].state, 'Invested');
  assert.equal(content[2].state, 'Matured');
});
