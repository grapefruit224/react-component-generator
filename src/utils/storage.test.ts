import { describe, it, expect, vi } from 'vitest';
import { loadJSON, saveJSON } from './storage';

describe('loadJSON', () => {
  it('저장된 값이 없으면 fallback을 반환한다', () => {
    expect(loadJSON('missing', 'fallback')).toBe('fallback');
  });

  it('저장된 JSON을 파싱해 반환한다', () => {
    localStorage.setItem('k', JSON.stringify({ a: 1 }));
    expect(loadJSON('k', null)).toEqual({ a: 1 });
  });

  it('저장된 값이 손상된 JSON이면 fallback을 반환한다', () => {
    localStorage.setItem('k', '{broken');
    expect(loadJSON('k', 'fallback')).toBe('fallback');
  });

  it('localStorage 접근이 막혀 있으면 fallback을 반환한다', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(loadJSON('k', 'fallback')).toBe('fallback');
    spy.mockRestore();
  });
});

describe('saveJSON', () => {
  it('값을 JSON으로 저장한다', () => {
    saveJSON('k', { a: 1 });
    expect(localStorage.getItem('k')).toBe('{"a":1}');
  });

  it('저장 공간 초과 등으로 setItem이 실패해도 예외를 던지지 않는다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveJSON('k', 'v')).not.toThrow();
    spy.mockRestore();
  });
});