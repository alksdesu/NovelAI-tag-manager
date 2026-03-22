import { Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  suggestions,
  highlighted,
  setHighlighted,
  visible,
  position,
  applyCompletion,
} from './useAutocomplete';

export function AutocompleteDropdown() {
  return (
    <Portal mount={document.body}>
      <Show when={visible() && suggestions().length > 0}>
        <div
          class="ntm-ac-dropdown"
          style={{
            position: 'absolute',
            top: `${position().top}px`,
            left: `${position().left}px`,
            width: `${Math.min(position().width, 400)}px`,
            'z-index': '1000003',
          }}
        >
          <For each={suggestions()}>
            {(entry, idx) => (
              <div
                class={`ntm-ac-item ${idx() === highlighted() ? 'is-active' : ''}`}
                onMouseEnter={() => setHighlighted(idx())}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyCompletion(entry.value);
                }}
              >
                <div class="ntm-ac-line">
                  <span class="ntm-ac-text">{entry.value}</span>
                  <span class="ntm-ac-src">{entry.src}</span>
                </div>
                <Show when={entry.translation}>
                  <span class="ntm-ac-translation">{entry.translation}</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </Portal>
  );
}
