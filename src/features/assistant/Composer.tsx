import { Show, For } from 'solid-js';
import { IconClose, IconClip } from '../../components/Icons';
import { useLocale } from '../../i18n/useLocale';
import {
  compose,
  setCompose,
  attachments,
  sending,
  dropActive,
  setDropActive,
  sendMessage,
  stopGeneration,
  addAttachments,
  removeAttachment,
  activeConfig,
  setShowSettings,
} from './useAssistant';
import { cleanApiKey } from './normalizers';

export function Composer() {
  const t = useLocale();
  let fileInputRef: HTMLInputElement | undefined;

  const hasApiKey = () => {
    const config = activeConfig();
    return !!cleanApiKey(config.apiKey || '');
  };

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleDragOver(e: DragEvent) { e.preventDefault(); setDropActive(true); }
  function handleDragLeave(e: DragEvent) { e.preventDefault(); setDropActive(false); }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer?.files?.length) addAttachments(e.dataTransfer.files);
  }
  function handleFileSelect(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.length) { addAttachments(input.files); input.value = ''; }
  }

  return (
    <footer
      class="ntm-assistant__composer"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-drop-target="1"
    >
      {/* Missing API key warning */}
      <Show when={!hasApiKey()}>
        <div
          class="ntm-assistant__composer-warning"
          onClick={() => setShowSettings(true)}
          style={{ cursor: 'pointer' }}
        >
          {t().assistant.missingKey}
        </div>
      </Show>

      {/* Attachment chips */}
      <Show when={attachments().length > 0}>
        <div class="ntm-assistant__composer-attachments">
          <For each={attachments()}>
            {(att) => (
              <div class="ntm-assistant__attachment">
                <Show when={att.previewUrl}>
                  <div class="ntm-assistant__attachment-preview">
                    <img src={att.previewUrl} alt={att.name} />
                  </div>
                </Show>
                <div class="ntm-assistant__attachment-meta">
                  <span class="ntm-assistant__attachment-name">{att.name}</span>
                </div>
                <button class="ntm-icon-btn" onClick={() => removeAttachment(att.id)} title={t().assistant.attachmentRemove}>
                  <IconClose />
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Drop hint */}
      <Show when={dropActive()}>
        <div class="ntm-assistant__drop-hint">
          {t().assistant.dropHint}
        </div>
      </Show>

      {/* Textarea */}
      <div class="ntm-assistant__composer-input">
        <textarea
          class="ntm-input ntm-input--textarea"
          placeholder={t().assistant.composerPlaceholder}
          value={compose()}
          onInput={(e) => {
            setCompose(e.currentTarget.value);
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
          }}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={sending()}
          style={{ resize: 'none', overflow: 'auto' }}
        />
      </div>

      {/* Toolbar */}
      <div class="ntm-assistant__composer-toolbar">
        <div class="ntm-assistant__composer-left">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            class="ntm-sr-only"
            onChange={handleFileSelect}
          />
          <button class="ntm-icon-btn" onClick={() => fileInputRef?.click()} title={t().assistant.attachmentAdd}>
            <IconClip />
          </button>
        </div>
        <div class="ntm-assistant__composer-right">
          <Show
            when={!sending()}
            fallback={
              <button class="ntm-btn" onClick={stopGeneration}>
                {t().assistant.stop}
              </button>
            }
          >
            <button
              class="ntm-btn"
              onClick={sendMessage}
              disabled={!compose().trim() && !attachments().length}
            >
              {t().assistant.send}
            </button>
          </Show>
        </div>
      </div>
    </footer>
  );
}
