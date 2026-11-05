import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>('google');
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];
  const isPowered = hasEnvKey || apiKey.trim().length > 0;

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
  };

  return (
    <div className="app">
      <header className="nameplate">
        <div className="chip" aria-hidden="true">
          <span className="chip-notch" />
          <span className="chip-label">RC</span>
        </div>
        <div className="nameplate-copy">
          <h1>컴포넌트 공작소</h1>
          <p>
            만들고 싶은 UI를 글로 적으면 React 컴포넌트로 조립합니다. 바로 돌려보고, 코드는
            복사해 가세요.
          </p>
        </div>
        <dl className="nameplate-meta">
          <div>
            <dt>엔진</dt>
            <dd>
              <span
                className={`led ${isPowered ? 'led--on' : ''}`}
                aria-label={isPowered ? '연결됨' : '키 없음'}
              />
              {PROVIDER_CONFIG[provider].label}
            </dd>
          </div>
          <div>
            <dt>만든 부품</dt>
            <dd className="counter">{String(components.length).padStart(3, '0')}</dd>
          </div>
        </dl>
      </header>

      <main className="bench">
        <section className="sheet sheet--order" aria-label="컴포넌트 생성">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
        </section>

        <aside className="sheet sheet--power" aria-label="실행 설정">
          <h2 className="sheet-title">전원부</h2>

          <fieldset className="switch">
            <legend>AI 엔진</legend>
            <div className="switch-track">
              {(Object.keys(PROVIDER_CONFIG) as Provider[]).map((key) => (
                <label
                  key={key}
                  className={`switch-option ${provider === key ? 'switch-option--on' : ''}`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={key}
                    checked={provider === key}
                    onChange={() => handleProviderChange(key)}
                  />
                  {PROVIDER_CONFIG[key].label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="api-key">API 키</label>
            <div className="key-field">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                placeholder={
                  hasEnvKey ? '서버 키 사용 중 · 입력하면 덮어씀' : PROVIDER_CONFIG[provider].placeholder
                }
              />
              <button className="btn btn--ghost" onClick={() => setShowKey(!showKey)} type="button">
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
              {hasEnvKey
                ? '.env의 키로 연결되어 있습니다.'
                : '키를 직접 입력하거나 서버 .env에 설정하세요.'}
            </p>
          </div>
        </aside>
      </main>

      {error && (
        <div className="error-slip" role="alert">
          <span className="led led--error" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <section className="parts" aria-label="생성된 컴포넌트">
        <div className="parts-header">
          <h2>부품 목록</h2>
          {components.length > 0 && (
            <button className="btn btn--ghost btn--danger" onClick={clearAll}>
              전체 삭제
            </button>
          )}
        </div>

        {isLoading && (
          <div className="assembling" role="status">
            <span className="led led--blink" aria-hidden="true" />
            <p>부품을 조립하고 있습니다…</p>
            <div className="assembling-bar" aria-hidden="true" />
          </div>
        )}

        {components.length === 0 && !isLoading && (
          <div className="empty-bin">
            <div className="empty-drawing" aria-hidden="true">
              <div className="empty-chip">
                <span className="chip-notch" />
              </div>
            </div>
            <div className="empty-copy">
              <h3>아직 만든 부품이 없습니다</h3>
              <p>위 입력란에 원하는 UI를 적거나, 예시 하나를 골라 생성해보세요.</p>
            </div>
          </div>
        )}

        <div className="parts-list">
          {components.map((component, index) => (
            <ComponentCard
              key={component.id}
              component={component}
              partNumber={components.length - index}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
