import { compareVersions } from '../src/domain/update/semver';

test('detects newer patch / minor / major', () => {
  expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  expect(compareVersions('1.1.0', '1.0.9')).toBe(1);
  expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
});

test('numeric (not lexicographic) comparison', () => {
  expect(compareVersions('1.10.0', '1.2.0')).toBe(1);
  expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
});

test('ignores v prefix, whitespace, and missing parts', () => {
  expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
  expect(compareVersions('1.0', '1.0.0')).toBe(0);
  expect(compareVersions(' v1.2 ', '1.1.9')).toBe(1);
});

test('equal and older', () => {
  expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
});

test('dirty input degrades to zero parts', () => {
  expect(compareVersions('', '0.0.0')).toBe(0);
  expect(compareVersions('abc', '0')).toBe(0);
});
