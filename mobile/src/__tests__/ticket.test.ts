import { describe, expect, it } from 'vitest';
import { shortTicket } from '../lib/ticket';

describe('shortTicket', () => {
  it('writes a range the way the design does', () => {
    expect(shortTicket(1_000_000, 5_000_000)).toBe('KES 1–5M');
    expect(shortTicket(500_000, 2_000_000)).toBe('KES 0.5–2M');
    expect(shortTicket(300_000, 1_000_000)).toBe('KES 0.3–1M');
    expect(shortTicket(100_000, 500_000)).toBe('KES 100K–500K');
  });
  it('handles an open end, and nothing', () => {
    expect(shortTicket(20_000_000, null)).toBe('KES 20M+');
    expect(shortTicket(null, 1_000_000)).toBe('Up to KES 1M');
    expect(shortTicket(null, null)).toBeUndefined();
  });
});
