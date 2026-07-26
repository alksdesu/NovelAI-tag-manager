import { Show, For, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IconClose, IconRefresh } from '../../components/Icons';
import { data, setData } from '../../stores/data';
import { useLocale } from '../../i18n/useLocale';
import {
  showSettings,
  setShowSettings,
  activeProvider,
  activeConfig,
  modelsLoading,
  refreshModels,
} from './useAssistant';
import { saveApiKey } from '../../lib/secure-store';
import type { AssistantProvider } from '../../types';

function formatTimestamp(ts: number): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function AssistantSettings() {
  const t = useLocale();

  function setProvider(provider: AssistantProvider) {
    setData('assistant', 'provider', provider);
  }
  function setBaseUrl(value: string) {
    const provider = activeProvider();
    setData('assistant', provider, 'baseUrl', value);
  }
  function setApiKey(value: string) {
    const provider = activeProvider();
    setData('assistant', provider, 'apiKey', value);
    saveApiKey(provider, value);
  }
  function setModel(value: string) {
    const provider = activeProvider();
    setData('assistant', provider, 'model', value);
  }

  const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSettings(false); };

  return (
    <Show when={showSettings()}>
      <Portal>
      {(() => {
        onMount(() => document.addEventListener('keydown', handleEsc));
        onCleanup(() => document.removeEventListener('keydown', handleEsc));
        return null;
      })()}
      <div class="ntm-assistant-settings">
        <div class="ntm-assistant-settings__backdrop" onClick={() => setShowSettings(false)} />
        <div class="ntm-assistant-settings__panel">
          <header class="ntm-assistant-settings__header">
            <h2 class="ntm-assistant-settings__title">{t().assistant.settingsTitle}</h2>
            <button class="ntm-icon-btn" onClick={() => setShowSettings(false)} title={t().assistant.closeSettings}>
              <IconClose />
            </button>
          </header>

          {/* Provider toggle */}
          <div class="ntm-assistant-settings__section">
            <label class="ntm-assistant-settings__label">{t().assistant.providerLabel}</label>
            <div class="ntm-assistant-settings__toggle">
              <button
                class={`ntm-assistant-settings__toggle-btn ${activeProvider() === 'openai' ? 'ntm-assistant-settings__toggle-btn--active' : ''}`}
                onClick={() => setProvider('openai')}
              >
                {t().assistant.providerOpenAI}
              </button>
              <button
                class={`ntm-assistant-settings__toggle-btn ${activeProvider() === 'google' ? 'ntm-assistant-settings__toggle-btn--active' : ''}`}
                onClick={() => setProvider('google')}
              >
                {t().assistant.providerGoogle}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div class="ntm-assistant-settings__section">
            <label class="ntm-assistant-settings__label">Base URL</label>
            <input
              class="ntm-input"
              type="text"
              value={activeConfig().baseUrl || ''}
              onInput={(e) => setBaseUrl(e.currentTarget.value)}
              placeholder={activeProvider() === 'google'
                ? 'https://generativelanguage.googleapis.com'
                : 'https://api.openai.com/v1'
              }
            />
            <p class="ntm-assistant-settings__hint">
              {activeProvider() === 'google'
                ? '留空使用官方地址，填写自定义反代地址可绕过区域限制'
                : '留空使用官方地址，支持兼容 OpenAI 格式的第三方服务'
              }
            </p>
          </div>

          {/* Thinking Level (Google only) */}
          <Show when={activeProvider() === 'google'}>
            <div class="ntm-assistant-settings__section">
              <label class="ntm-assistant-settings__label">Thinking Level</label>
              <div class="ntm-assistant-settings__segmented">
                {(['', 'low', 'medium', 'high'] as const).map((level) => {
                  const labels: Record<string, string> = { '': 'Auto', low: 'Low', medium: 'Medium', high: 'High' };
                  return (
                    <button
                      class={`ntm-assistant-settings__seg-btn ${(data.assistant.google.thinkingLevel || '') === level ? 'ntm-assistant-settings__seg-btn--active' : ''}`}
                      onClick={() => setData('assistant', 'google', 'thinkingLevel', level)}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
              <p class="ntm-assistant-settings__hint">
                Gemini 3.x → thinkingLevel, 2.5 → thinkingBudget
              </p>
            </div>
          </Show>

          {/* API Key */}
          <div class="ntm-assistant-settings__section">
            <label class="ntm-assistant-settings__label">{t().assistant.apiKeyLabel}</label>
            <input
              class="ntm-input"
              type="password"
              value={activeConfig().apiKey || ''}
              onInput={(e) => setApiKey(e.currentTarget.value)}
              placeholder={activeProvider() === 'google' ? 'AIza...' : 'sk-...'}
            />
          </div>

          {/* Model */}
          <div class="ntm-assistant-settings__section">
            <label class="ntm-assistant-settings__label">{t().assistant.modelLabel}</label>
            <div class="ntm-assistant-settings__model-row">
              <input
                class="ntm-input"
                type="text"
                list="ntm-model-list"
                value={activeConfig().model || ''}
                onInput={(e) => setModel(e.currentTarget.value)}
                placeholder={t().assistant.modelPlaceholder}
              />
              <datalist id="ntm-model-list">
                <For each={activeConfig().models ?? []}>
                  {(m) => <option value={m.id}>{m.label}</option>}
                </For>
              </datalist>
              <button
                class="ntm-assistant-settings__refresh-btn"
                onClick={refreshModels}
                disabled={modelsLoading()}
                title={t().assistant.refreshModels}
              >
                <Show when={!modelsLoading()} fallback={<div class="ntm-loader" style={{ width: '14px', height: '14px' }} />}>
                  <IconRefresh />
                </Show>
              </button>
            </div>
            <Show when={modelsLoading()}>
              <p class="ntm-assistant-settings__hint">{t().assistant.modelsLoading}</p>
            </Show>
            <Show when={!modelsLoading() && activeConfig().modelsFetchedAt > 0}>
              <p class="ntm-assistant-settings__hint">
                {t().assistant.modelsUpdated(formatTimestamp(activeConfig().modelsFetchedAt))}
              </p>
            </Show>
          </div>

          <div class="ntm-assistant-settings__footer">
            <button class="ntm-btn" onClick={() => setShowSettings(false)}>
              {t().assistant.closeSettings}
            </button>
          </div>
        </div>
      </div>
      </Portal>
    </Show>
  );
}
