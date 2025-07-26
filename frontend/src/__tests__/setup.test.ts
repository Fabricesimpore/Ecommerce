/**
 * Basic test to ensure Jest is working correctly
 */
describe('Test Environment Setup', () => {
  it('should run basic test', () => {
    expect(true).toBe(true)
  })

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4)
  })

  it('should handle string operations', () => {
    expect('hello world').toContain('world')
  })
})