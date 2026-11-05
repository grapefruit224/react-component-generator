import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  partNumber: number;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';

const TABS: { id: Tab; label: string }[] = [
  { id: 'preview', label: '미리보기' },
  { id: 'code', label: '코드' },
];

export function ComponentCard({
  component,
  partNumber,
  onRemove,
  onRegenerate,
  isLoading,
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const partId = `RC-${String(partNumber).padStart(3, '0')}`;

  return (
    <article className="part" aria-label={`부품 ${partId}`}>
      <header className="part-header">
        <div className="part-tag">
          <strong>{partId}</strong>
          <time>{createdAt}</time>
        </div>
        <p className="part-prompt">{component.prompt}</p>
        <div className="part-actions">
          <button
            className="btn btn--ghost btn--icon"
            onClick={() => setPreviewKey((k) => k + 1)}
            title="미리보기 다시 실행"
            aria-label="미리보기 다시 실행"
          >
            ↻
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '재생성'}
          </button>
          <button className="btn btn--ghost btn--danger" onClick={() => onRemove(component.id)}>
            삭제
          </button>
        </div>
      </header>

      <div className="part-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`part-tab ${activeTab === tab.id ? 'part-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="part-body" role="tabpanel">
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView code={component.code} />
        )}
      </div>
    </article>
  );
}
