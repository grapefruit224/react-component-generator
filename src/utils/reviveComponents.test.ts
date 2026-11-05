import { describe, it, expect } from 'vitest';
import { reviveComponents } from './reviveComponents';

describe('reviveComponents', () => {
  it('저장된 createdAt 문자열을 Date로 복원한다', () => {
    const iso = '2026-11-05T04:00:00.000Z';
    const [component] = reviveComponents([{ id: '1', prompt: 'p', code: 'c', createdAt: iso }]);
    expect(component.createdAt).toBeInstanceOf(Date);
    expect(component.createdAt.toISOString()).toBe(iso);
  });

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(reviveComponents({ not: 'array' })).toEqual([]);
  });

  it('필드가 빠지거나 날짜가 잘못된 항목은 버린다', () => {
    const valid = { id: '1', prompt: 'p', code: 'c', createdAt: '2026-11-05T04:00:00.000Z' };
    const result = reviveComponents([
      valid,
      null,
      { id: '2', prompt: 'p' },
      { ...valid, id: '3', createdAt: 'not-a-date' },
    ]);
    expect(result.map((c) => c.id)).toEqual(['1']);
  });
});
