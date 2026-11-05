import { describe, it, expect } from 'vitest';
import { addToHistory } from './promptHistory';

describe('addToHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addToHistory(['b'], 'a')).toEqual(['a', 'b']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addToHistory(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('최대 20개까지만 보관하고 가장 오래된 것부터 버린다', () => {
    const full = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const result = addToHistory(full, 'new');
    expect(result).toHaveLength(20);
    expect(result[0]).toBe('new');
    expect(result).not.toContain('p19');
  });
});
