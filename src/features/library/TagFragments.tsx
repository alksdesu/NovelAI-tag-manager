import { createMemo, For, Show } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { copyToClipboard } from '../../lib/clipboard';
import { splitTagFragments } from '../../lib/escape';
import { addToast } from '../../stores/ui';
import { lookupTagTranslation } from '../../lib/translation';
import type { Tag } from '../../types';

interface TagFragmentsProps {
  tag: Tag;
  fragmentsOverride?: string[];
  showTranslations?: boolean;
}

export function TagFragments(props: TagFragmentsProps) {
  const t = useLocale();

  const fragments = createMemo(() => {
    if (props.fragmentsOverride) return props.fragmentsOverride;
    return splitTagFragments(props.tag.tag);
  });

  async function copyFragment(frag: string) {
    const ok = await copyToClipboard(frag);
    if (ok) {
      addToast(t().common.copied, 'success', 1500);
    }
  }

  return (
    <Show
      when={fragments().length > 0}
      fallback={
        <span class="ntm-tag-fragments__empty">{t().tagForm.fragmentsEmpty}</span>
      }
    >
      <div class="ntm-tag-chip-list">
        <For each={fragments()}>
          {(frag) => {
            const zh = () => props.showTranslations !== false ? lookupTagTranslation(frag) : null;
            return (
              <div
                class="ntm-tag-chip"
                onClick={() => copyFragment(frag)}
                title={zh() ? `${frag} — ${zh()}` : `Click to copy: ${frag}`}
              >
                <div class="ntm-tag-chip__text">
                  <span class="ntm-tag-chip__english">{frag}</span>
                  <Show when={zh()}>
                    <span class="ntm-tag-chip__translation">{zh()}</span>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
