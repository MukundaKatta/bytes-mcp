import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { format, parse } from '../src/server.js';

test('format binary KiB', () => {
  assert.equal(format(1024, 'binary'), '1.00 KiB');
  assert.equal(format(1024 * 1024, 'binary'), '1.00 MiB');
});

test('format SI kB', () => {
  assert.equal(format(1000, 'si'), '1.00 kB');
  assert.equal(format(1_500_000, 'si'), '1.50 MB');
});

test('format under 1KiB stays in bytes', () => {
  assert.equal(format(512), '512 B');
});

test('format handles negative', () => {
  assert.equal(format(-2048, 'binary'), '-2.00 KiB');
});

test('precision', () => {
  assert.equal(format(1500, 'si', 0), '2 kB');
  assert.equal(format(1500, 'si', 1), '1.5 kB');
});

test('format promotes unit when rounding reaches the base', () => {
  // 1048575 / 1024 = 1023.999... which rounds to 1024.00; should read as MiB.
  assert.equal(format(1048575, 'binary'), '1.00 MiB');
  assert.equal(format(1024 * 1024 - 1, 'binary'), '1.00 MiB');
  // SI: 999999 / 1000 = 999.999 -> rounds to 1000.00; should read as MB.
  assert.equal(format(999999, 'si'), '1.00 MB');
});

test('format does not over-promote when rounding stays below the base', () => {
  assert.equal(format(1536, 'binary'), '1.50 KiB');
  assert.equal(format(1_500_000, 'si'), '1.50 MB');
});

test('parse binary units', () => {
  assert.equal(parse('1 KiB'), 1024);
  assert.equal(parse('2 MiB'), 2 * 1024 * 1024);
});

test('parse SI units', () => {
  assert.equal(parse('1 kB'), 1000);
  assert.equal(parse('1.5 MB'), 1_500_000);
});

test('parse loose "K" / "M" / "G" as binary', () => {
  assert.equal(parse('1K'), 1024);
  assert.equal(parse('1M'), 1024 * 1024);
});

test('parse unitless treats as bytes', () => {
  assert.equal(parse('512'), 512);
});

test('rejects garbage', () => {
  assert.throws(() => parse('lots'));
  assert.throws(() => parse('1 nope'));
});

test('round trip via SI', () => {
  // 1500000 → "1.50 MB" → 1500000 (within 1)
  const s = format(1_500_000, 'si');
  const back = parse(s);
  assert.equal(back, 1_500_000);
});
