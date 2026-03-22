import { data, setData } from '../stores/data';
import { setIsMinimized } from '../stores/ui';
import { useLocale } from '../i18n/useLocale';
import { IconMinimize, IconPalette } from './Icons';
import type { Language } from '../types';

interface HeaderProps {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
}

export function Header(props: HeaderProps) {
  const t = useLocale();

  function setLanguage(lang: Language) {
    setData('settings', 'language', lang);
  }

  return (
    <header
      class="ntm-header"
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
    >
      <div class="ntm-title">
        <span class="ntm-title__logo"><IconPalette /></span>
        <h1>Tag Maestro</h1>
      </div>

      <div class="ntm-header-actions">
        {/* Language toggle group */}
        <div class="ntm-lang-group">
          <button
            class={`ntm-pill ${data.settings.language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
          <button
            class={`ntm-pill ${data.settings.language === 'zh' ? 'active' : ''}`}
            onClick={() => setLanguage('zh')}
          >
            ZH
          </button>
        </div>

        {/* Divider */}
        <span class="ntm-header-divider" />

        {/* Minimize */}
        <button
          class="ntm-icon-btn"
          title={t().minimize}
          aria-label={t().minimize}
          onClick={() => setIsMinimized(true)}
        >
          <IconMinimize />
        </button>
      </div>
    </header>
  );
}
