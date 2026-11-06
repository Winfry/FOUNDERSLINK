import { describe, expect, it } from 'vitest';
import { answerKind, checkedOn } from '../lib/compliance-answer';

const source = { title: 'Kenya Revenue Authority', url: 'https://www.kra.go.ke', lastVerified: '2026-10-04' };

describe('Ask Compliance answers', () => {
  it('a written, cited answer is shown as an answer', () => {
    expect(answerKind({ body: 'Yes [1].', citations: [source] })).toBe('answered');
  });

  it('a quote from an official source is never labelled "no official source"', () => {
    expect(answerKind({ body: 'From "KRA": ...', citations: [source], cannotConfirm: true })).toBe('quoted');
  });

  it('with nothing official to cite, it says so', () => {
    expect(answerKind({ body: 'I could not find this.', citations: [], cannotConfirm: true })).toBe('no_source');
  });

  it('shows when the source was last checked, in plain words', () => {
    expect(checkedOn('2026-10-04')).toBe('Checked 4 Oct 2026');
    expect(checkedOn('2026-10-04T08:00:00.000Z')).toBe('Checked 4 Oct 2026');
    expect(checkedOn(null)).toBeNull();
    expect(checkedOn('not a date')).toBeNull();
    expect(checkedOn('2026-13-01')).toBeNull();
  });
});
