import { Show } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { IconEdit, IconTrash, IconSettings } from '../../components/Icons';
import { Sidebar } from './Sidebar';
import { Thread } from './Thread';
import { Composer } from './Composer';
import { AssistantSettings } from './AssistantSettings';
import {
  activeConversation,
  renaming,
  setRenaming,
  renameDraft,
  setRenameDraft,
  renameConversation,
  confirmDelete,
  setConfirmDelete,
  deleteConversation,
  setShowSettings,
  showSettings,
} from './useAssistant';
import './assistant.css';

export function AssistantPage() {
  const t = useLocale();
  const conv = activeConversation;

  function startRename() {
    const c = conv();
    if (!c) return;
    setRenameDraft(c.title);
    setRenaming(true);
  }

  function commitRename() {
    const c = conv();
    if (!c) return;
    renameConversation(c.id, renameDraft());
  }

  function handleRenameKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setRenaming(false); }
  }

  return (
    <section class="ntm-assistant">
      <Sidebar />

      <div class="ntm-assistant__main">
        {/* Header */}
        <header class="ntm-assistant__header">
          <div class="ntm-assistant__title">
            <Show
              when={!renaming()}
              fallback={
                <div style={{ display: 'flex', gap: '0.4rem', 'align-items': 'center' }}>
                  <input
                    class="ntm-input"
                    type="text"
                    value={renameDraft()}
                    onInput={(e) => setRenameDraft(e.currentTarget.value)}
                    onKeyDown={handleRenameKeyDown}
                    placeholder={t().assistant.renamePlaceholder}
                    style={{ width: '200px', 'font-size': '0.85rem' }}
                  />
                  <button class="ntm-pill" onClick={commitRename}>{t().assistant.renameConfirm}</button>
                  <button class="ntm-pill" onClick={() => setRenaming(false)}>{t().assistant.renameCancel}</button>
                </div>
              }
            >
              <h2>{conv()?.title || t().assistant.title}</h2>
            </Show>
          </div>

          <div class="ntm-assistant__header-actions">
            <Show when={conv()}>
              <button class="ntm-pill" onClick={startRename} title={t().assistant.renameToggle}>
                <IconEdit />
              </button>

              <Show
                when={!confirmDelete()}
                fallback={
                  <>
                    <button class="ntm-pill" onClick={() => deleteConversation(conv()!.id)}>
                      {t().assistant.deleteConfirmYes}
                    </button>
                    <button class="ntm-pill" onClick={() => setConfirmDelete(false)}>
                      {t().assistant.deleteConfirmNo}
                    </button>
                  </>
                }
              >
                <button class="ntm-pill" onClick={() => setConfirmDelete(true)} title={t().assistant.deleteToggle}>
                  <IconTrash />
                </button>
              </Show>
            </Show>

            <button class="ntm-pill" onClick={() => setShowSettings(true)} title={t().assistant.settingsToggle}>
              <IconSettings />
            </button>
          </div>
        </header>

        {/* Thread */}
        <Thread />

        {/* Composer */}
        <Composer />

        {/* Settings modal */}
        <AssistantSettings />
      </div>
    </section>
  );
}
