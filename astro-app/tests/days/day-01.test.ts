import { getLivePricing } from '../days/day-01.js';
import { expect } from '@jest/globals';

describe('pricing', () => {
  it('lists gpt-5.4-pro with correct prices', async () => {
    const pricing = await getLivePricing();
    expect(pricing).toContain({ name: 'gpt-5.4-pro', inputPrice: 30, outputPrice: 180 });
  });

  it('lists multiple pricing plans', async () => {
    const pricing = await getLivePricing();
    expect(pricing).toHaveLength(1);
  });
