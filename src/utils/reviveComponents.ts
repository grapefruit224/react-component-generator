import type { GeneratedComponent } from '../types';

function isStoredComponent(value: unknown): value is Record<keyof GeneratedComponent, string> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.prompt === 'string' &&
    typeof v.code === 'string' &&
    typeof v.createdAt === 'string'
  );
}

// localStorage에서 읽은 값은 사용자가 수정했거나 이전 버전 형식일 수 있으므로, 형태가 맞는 항목만 살린다.
export function reviveComponents(raw: unknown): GeneratedComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isStoredComponent)
    .map((c) => ({ ...c, createdAt: new Date(c.createdAt) }))
    .filter((c) => !Number.isNaN(c.createdAt.getTime()));
}
