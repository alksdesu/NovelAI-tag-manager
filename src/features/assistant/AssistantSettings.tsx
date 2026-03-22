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
    setData('assistant', 'openai', 'baseUrl', value);
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
        <div class="ntm-assistant-settings__panel ntm-assistant-settings__panel--animate">
          <header style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
            <h2>{t().assistant.settingsTitle}</h2>
            <button class="ntm-icon-btn" onClick={() => setShowSettings(false)} title={t().assistant.closeSettings}>
              <IconClose />
            </button>
          </header>

          {/* Provider */}
          <div class="ntm-assistant-settings__section">
            <h4>{t().assistant.providerLabel}</h4>
            <div class="ntm-assistant-settings__provider">
              <label>
                <input type="radio" name="ntm-provider" value="openai" checked={activeProvider() === 'openai'} onChange={() => setProvider('openai')} />
                {' '}{t().assistant.providerOpenAI}
              </label>
              <label>
                <input type="radio" name="ntm-provider" value="google" checked={activeProvider() === 'google'} onChange={() => setProvider('google')} />
                {' '}{t().assistant.providerGoogle}
              </label>
            </div>
          </div>

          {/* Base URL (OpenAI only) */}
          <Show when={activeProvider() === 'openai'}>
            <div class="ntm-assistant-settings__section">
              <h4>{t().assistant.baseUrlLabel}</h4>
              <input
                class="ntm-input"
                type="text"
                value={data.assistant.openai.baseUrl || ''}
                onInput={(e) => setBaseUrl(e.currentTarget.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
          </Show>

          {/* Google hint */}
          <Show when={activeProvider() === 'google'}>
            <p class="ntm-assistant-settings__status">{t().assistant.googleKeyHint}</p>
          </Show>

          {/* Thinking Level (Google only) */}
          <Show when={activeProvider() === 'google'}>
            <div class="ntm-assistant-settings__section">
              <h4>Thinking Level</h4>
              <select
                class="ntm-input ntm-input--select"
                value={data.assistant.google.thinkingLevel || ''}
                onChange={(e) => setData('assistant', 'google', 'thinkingLevel', e.currentTarget.value)}
              >
                <option value="">Auto (Default)</option>
                <option value="low">Low — 快速回复</option>
                <option value="medium">Medium — 平衡</option>
                <option value="high">High — 深度推理</option>
              </select>
              <p class="ntm-assistant-settings__status">
                Gemini 3.x 使用 thinkingLevel, 2.5 自动切换为 thinkingBudget
              </p>
            </div>
          </Show>

          {/* API Key */}
          <div class="ntm-assistant-settings__section">
            <h4>{t().assistant.apiKeyLabel}</h4>
            <input
              class="ntm-input"
              type="password"
              value={activeConfig().apiKey || ''}
              onInput={(e) => setApiKey(e.currentTarget.value)}
              placeholder="sk-..."
            />
          </div>

          {/* Model */}
          <div class="ntm-assistant-settings__section">
            <h4>{t().assistant.modelLabel}</h4>
            <div class="ntm-assistant-settings__section--two">
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
              <div class="ntm-assistant-settings__actions">
                <button
                  class="ntm-mini-btn"
                  onClick={refreshModels}
                  disabled={modelsLoading()}
                  title={t().assistant.refreshModels}
                >
                  <Show when={!modelsLoading()} fallback={<div class="ntm-loader" style={{ width: '14px', height: '14px' }} />}>
                    <IconRefresh />
                  </Show>
                </button>
              </div>
            </div>
            <Show when={modelsLoading()}>
              <p class="ntm-assistant-settings__status">{t().assistant.modelsLoading}</p>
            </Show>
            <Show when={!modelsLoading() && activeConfig().modelsFetchedAt > 0}>
              <p class="ntm-assistant-settings__status">
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
