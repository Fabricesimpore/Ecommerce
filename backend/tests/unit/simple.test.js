// Simple test to ensure Jest is working
describe('Basic functionality', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should mock functions correctly', () => {
    const mockFn = jest.fn();
    mockFn.mockReturnValue('mocked');
    
    expect(mockFn()).toBe('mocked');
    expect(mockFn).toHaveBeenCalled();
  });
});

// Test environment variables
describe('Environment setup', () => {
  it('should have test environment set', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have JWT secret configured', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});