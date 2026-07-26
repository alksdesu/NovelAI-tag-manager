import { Show } from 'solid-js';
import { IconStar, IconHeart, IconHeartFilled } from '../../components/Icons';
import { useLocale } from '../../i18n/useLocale';
import { openViewer, toggleFavorite, type DanbooruPost } from './useDanbooru';
import { DANBOORU_NON_IMAGE_EXTS } from '../../constants';

interface DanbooruCardProps {
  post: DanbooruPost;
}

export function DanbooruCard(props: DanbooruCardProps) {
  const t = useLocale();
  // Grid thumbnails use preview_file_url — 24 full-size hotlinks per page
  // is wasteful; the Viewer fetches the large image through the GM proxy
  const ext = () => (props.post.file_ext || '').toLowerCase();
  const imageUrl = () => {
    if (props.post.preview_file_url) return props.post.preview_file_url;
    if (DANBOORU_NON_IMAGE_EXTS.has(ext())) return '';
    return props.post.large_file_url || props.post.file_url || '';
  };

  return (
    <article class="ntm-danbooru-card" data-post-id={props.post.id}>
      <div class="ntm-danbooru-thumb" onClick={() => openViewer(props.post)}>
        <Show
          when={imageUrl()}
          fallback={
            <div class="ntm-danbooru-thumb__placeholder">{t().danbooru.previewUnavailable}</div>
          }
        >
          <img
            class="ntm-danbooru-thumb__image"
            src={imageUrl()}
            alt={`Post #${props.post.id}`}
            loading="lazy"
          />
        </Show>
        <button class="ntm-danbooru-view" onClick={(e) => { e.stopPropagation(); openViewer(props.post); }}>
          {t().danbooru.view}
        </button>
      </div>
      <div class="ntm-danbooru-content">
        <div class="ntm-danbooru-title">
          <span>#{props.post.id}</span>
        </div>
        <div class="ntm-danbooru-meta">
          <span><IconStar /> {props.post.score ?? 0}</span>
          <span><IconHeart /> {props.post.fav_count ?? 0}</span>
          <span>{props.post.file_ext ?? ''}</span>
        </div>
        <footer class="ntm-danbooru-actions">
          <a
            class="ntm-mini-btn"
            href={`https://danbooru.donmai.us/posts/${props.post.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Danbooru
          </a>
          <button
            class={`ntm-mini-btn ${props.post.is_favorited ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(props.post.id, !!props.post.is_favorited);
            }}
            title={props.post.is_favorited ? t().danbooru.favoriteActive : t().danbooru.favorite}
          >
            {props.post.is_favorited ? <IconHeartFilled /> : <IconHeart />}
          </button>
        </footer>
      </div>
    </article>
  );
}
