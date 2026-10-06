import { describe, expect, it } from 'vitest';
import { TokenBudget } from './admission.js';
describe('bounded abuse budgets', () => {
  it('limits bursts, refills on time, and isolates keys', () => {
    let now=0; const budget=new TokenBudget(2,60,2,()=>now);
    expect(budget.claim('a')).toBe(0); expect(budget.claim('a')).toBe(0);
    expect(budget.claim('a')).toBe(1); expect(budget.claim('b')).toBe(0);
    now=1000; expect(budget.claim('a')).toBe(0);
  });
  it('does not let high-cardinality churn reset active limits', () => {
    let now=0; const budget=new TokenBudget(1,60,1,()=>now);
    expect(budget.claim('a')).toBe(0); expect(budget.claim('b')).toBe(60);
    expect(budget.claim('a')).toBe(1);
    now=2000; expect(budget.claim('b')).toBe(0);
  });
});
