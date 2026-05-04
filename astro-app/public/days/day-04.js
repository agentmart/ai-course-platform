// Day 04 — Claude's Model Family & Anthropic's Mission
// Updated: March 2026
// Review changes:
// - CRITICAL: Updated model family to Claude 4.x generation throughout
// - Removed hardcoded c

const claudeOpus4_6Pricing = {
  input: '$15/1M',
  output: '$75/1M'
};

const claudeOpus4_6CorrectedPricing = {
  input: '$5/1M',
  output: '$25/1M'
};

const pricingTable = {
  'claude-opus-4-6': claudeOpus4_6CorrectedPricing
};

function getCorrectedPricing() {
  return pricingTable;
}

export function runDay04(input) {
  const pricing = getCorrectedPricing();
  return `claude-opus-4-6: input ${pricing['claude-opus-4-6'].input}, output ${pricing['claude-opus-4-6'].output}`;
}

export default runDay04;