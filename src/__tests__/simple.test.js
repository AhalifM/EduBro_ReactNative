// Simple test to verify Jest setup
describe('Basic Tests', () => {
  test('Basic equality test', () => {
    expect(2 + 2).toBe(4);
  });

  test('True is true', () => {
    expect(true).toBe(true);
  });

  test('False is false', () => {
    expect(false).toBe(false);
  });

  test('String comparison', () => {
    expect('hello').toBe('hello');
  });

  test('Array equality', () => {
    expect([1, 2, 3]).toEqual([1, 2, 3]);
  });

  test('Object equality', () => {
    expect({ name: 'Test', value: 123 }).toEqual({ name: 'Test', value: 123 });
  });
}); 