import { runDay04 } from '../day-04.js';

describe('Day 04', () => {
  it('should return the correct pricing for claude-opus-4-6', () => {
    const input = 'claude-opus-4-6';
    const expectedOutput = JSON.stringify({ claudeOpus4_6CorrectedPricing: { input: '$5/1M', output: '$25/1M' } });
    expect(runDay04(input)).toBe(expectedOutput);
  });

  it('should return an empty object for an unknown model', () => {
    const input = 'unknown-model';
    const expectedOutput = '{}';
    expect(runDay04(input)).toBe(expectedOutput);
  });
}
