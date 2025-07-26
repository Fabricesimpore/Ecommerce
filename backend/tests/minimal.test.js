// Minimal test to verify basic Jest functionality
describe('Minimal Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should have test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});