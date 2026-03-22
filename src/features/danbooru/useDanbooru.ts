import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { gmRequest, gmGetBlob } from '../../lib/gm';
import { addToast, t } from '../../stores/ui';
import { loadDanbooruCredentials } from '../../stores/persistence';
import { copyToClipboard } from '../../lib/clipboard';
import { lookupTagTranslation } from '../../lib/translation';
import { DANBOORU_API_BASE, DANBOORU_PAGE_LIMIT, DANBOORU_NON_IMAGE_EXTS } from '../../constants';
import type { DanbooruCredentials } from '../../types';

// ─── Types ──────────────────────────────────────────────────────

export interface DanbooruPost {
  id: number;
  preview_file_url?: string;
  large_file_url?: string;
  file_url?: string;
  file_ext?: string;
  tag_string_general?: string;
  tag_string_character?: string;
  tag_string_artist?: string;
  tag_string_copyright?: string;
  tag_string_meta?: string;
  rating?: string;
  score?: number;
  fav_count?: number;
  is_favorited?: boolean;
  source?: string;
}

export interface GalleryState {
  tags: string;
  rating: string;
  order: string;
  favoritesOnly: boolean;
  page: number;
  posts: DanbooruPost[];
  loading: boolean;
  error: string;
  hasNext: boolean;
}

export interface ViewerState {
  active: boolean;
  post: DanbooruPost | null;
  imageUrl: string;
  imageObjectUrl: string;
  imageLoading: boolean;
  imageError: string;
  transferCategoryId: string | null;
}

// ─── State ──────────────────────────────────────────────────────

const [gallery, setGallery] = createStore<GalleryState>({
  tags: '',
  rating: 's',
  order: 'rank',
  favoritesOnly: false,
  page: 1,
  posts: [],
  loading: false,
  error: '',
  hasNext: false,
});

const [viewer, setViewer] = createStore<ViewerState>({
  active: false,
  post: null,
  imageUrl: '',
  imageObjectUrl: '',
  imageLoading: false,
  imageError: '',
  transferCategoryId: null,
});

const [credentials, setCredentials] = createSignal<DanbooruCredentials>(loadDanbooruCredentials());

export { gallery, setGallery, viewer, setViewer, credentials, setCredentials };

// ─── Auth ───────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const creds = credentials();
  if (!creds.username || !creds.apiKey) return {};
  return { Authorization: `Basic ${btoa(`${creds.username}:${creds.apiKey}`)}` };
}

// ─── Gallery fetch ──────────────────────────────────────────────

function buildQuery(): string {
  const params = new URLSearchParams();
  const tags: string[] = [];

  if (gallery.tags.trim()) {
    tags.push(
      ...gallery.tags
        .split(/[,\s]+/)
        .map((t) => t.trim().replace(/\s+/g, '_'))
        .filter(Boolean),
    );
  }

  if (gallery.rating !== 'all') tags.push(`rating:${gallery.rating}`);

  switch (gallery.order) {
    case 'score': tags.push('order:score'); break;
    case 'new': tags.push('order:id_desc'); break;
    case 'random': tags.push('order:random'); break;
    default: tags.push('order:rank');
  }

  if (gallery.favoritesOnly && credentials().username) {
    tags.push(`fav:${credentials().username}`);
  }

  params.set('tags', tags.join(' '));
  params.set('limit', String(DANBOORU_PAGE_LIMIT));
  params.set('page', String(gallery.page));
  return params.toString();
}

let fetchRequestId = 0;

export async function fetchPosts() {
  const thisRequest = ++fetchRequestId;
  setGallery('loading', true);
  setGallery('error', '');

  try {
    const query = buildQuery();
    const url = `${DANBOORU_API_BASE}/posts.json?${query}`;
    const { promise } = gmRequest({
      method: 'GET',
      url,
      headers: { Accept: 'application/json', ...getAuthHeaders() },
      timeout: 15000,
    });
    const resp = await promise;

    if (thisRequest !== fetchRequestId) return; // stale request

    if (resp.status >= 400 || resp.status === 0) {
      let msg = `Danbooru API error: HTTP ${resp.status}`;
      try { const e = JSON.parse(resp.text || '{}'); msg = e?.message || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }

    const parsed = JSON.parse(resp.text || '[]');
    const posts = Array.isArray(parsed) ? (parsed as DanbooruPost[]) : [];
    setGallery('posts', posts);
    setGallery('hasNext', posts.length === DANBOORU_PAGE_LIMIT);
  } catch (err) {
    if (thisRequest !== fetchRequestId) return;
    setGallery('error', String(err));
  } finally {
    if (thisRequest === fetchRequestId) setGallery('loading', false);
  }
}

export function searchGallery() {
  setGallery('page', 1);
  fetchPosts();
}

export function nextPage() {
  setGallery('page', (p) => p + 1);
  fetchPosts();
}

export function prevPage() {
  setGallery('page', (p) => Math.max(1, p - 1));
  fetchPosts();
}

// ─── Viewer ─────────────────────────────────────────────────────

let imageRequestToken = 0;

function getDisplayUrl(post: DanbooruPost): string {
  const ext = (post.file_ext || '').toLowerCase();
  if (DANBOORU_NON_IMAGE_EXTS.has(ext)) return post.preview_file_url || '';
  return post.large_file_url || post.file_url || post.preview_file_url || '';
}

export async function openViewer(post: DanbooruPost) {
  // Revoke previous object URL to prevent memory leak
  if (viewer.imageObjectUrl) {
    URL.revokeObjectURL(viewer.imageObjectUrl);
  }

  const imageUrl = getDisplayUrl(post);
  setViewer({
    active: true,
    post,
    imageUrl,
    imageObjectUrl: '',
    imageLoading: !!imageUrl,
    imageError: '',
    transferCategoryId: null,
  });

  if (!imageUrl) return;

  const token = ++imageRequestToken;
  try {
    const { promise } = gmGetBlob(imageUrl, {
      Referer: `${DANBOORU_API_BASE}/`,
      ...getAuthHeaders(),
    }, 20000);
    const resp = await promise;

    if (token !== imageRequestToken) return;
    if (resp.status >= 400 || resp.status === 0) {
      throw new Error(`Image load failed: HTTP ${resp.status}`);
    }
    const blob = resp.response as Blob;
    const objectUrl = URL.createObjectURL(blob);
    setViewer('imageObjectUrl', objectUrl);
  } catch (err) {
    if (token !== imageRequestToken) return;
    setViewer('imageError', String(err));
  } finally {
    if (token === imageRequestToken) {
      setViewer('imageLoading', false);
    }
  }
}

export function navigateViewer(direction: 1 | -1) {
  const post = viewer.post;
  if (!post) return;
  const idx = gallery.posts.findIndex((p) => p.id === post.id);
  if (idx < 0) return;
  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= gallery.posts.length) return;
  openViewer(gallery.posts[nextIdx]);
}

export function closeViewer() {
  if (viewer.imageObjectUrl) {
    URL.revokeObjectURL(viewer.imageObjectUrl);
  }
  imageRequestToken++;
  setViewer({
    active: false,
    post: null,
    imageUrl: '',
    imageObjectUrl: '',
    imageLoading: false,
    imageError: '',
    transferCategoryId: null,
  });
}

// ─── Tag helpers ────────────────────────────────────────────────

export function collectTags(post: DanbooruPost, limit = 25): string[] {
  const parts = [
    post.tag_string_general,
    post.tag_string_character,
    post.tag_string_artist,
  ];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    for (const tag of part.split(/\s+/)) {
      const lower = tag.toLowerCase();
      if (!lower || seen.has(lower)) continue;
      seen.add(lower);
      result.push(tag);
      if (result.length >= limit) return result;
    }
  }
  return result;
}

export function getTagTranslation(tag: string): string | null {
  return lookupTagTranslation(tag);
}

export async function copyAllTags(post: DanbooruPost) {
  const tags = collectTags(post);
  const ok = await copyToClipboard(tags.join(', '));
  if (ok) addToast(t().common.copiedTags, 'success');
}

// ─── Favorites ──────────────────────────────────────────────────

let favoriteInFlight = false;

export async function toggleFavorite(postId: number, isFavorited: boolean) {
  if (favoriteInFlight) return; // prevent double-click

  const creds = credentials();
  if (!creds.username || !creds.apiKey) {
    addToast(t().common.favoriteSignIn, 'error');
    return;
  }

  favoriteInFlight = true;
  try {
    const resp = isFavorited
      ? await gmRequest({
          method: 'DELETE',
          url: `${DANBOORU_API_BASE}/favorites/${postId}.json`,
          headers: { ...getAuthHeaders() },
          timeout: 10000,
        }).promise
      : await gmRequest({
          method: 'POST',
          url: `${DANBOORU_API_BASE}/favorites.json`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...getAuthHeaders(),
          },
          data: `post_id=${postId}`,
          timeout: 10000,
        }).promise;

    if (resp.status >= 400 && resp.status !== 422) {
      throw new Error(`HTTP ${resp.status}`);
    }

    // Update post in gallery
    const idx = gallery.posts.findIndex((p) => p.id === postId);
    if (idx >= 0) {
      setGallery('posts', idx, 'is_favorited', !isFavorited);
    }
    // Update viewer
    if (viewer.post?.id === postId) {
      setViewer('post', 'is_favorited' as keyof DanbooruPost, !isFavorited as never);
    }
  } catch (err) {
    addToast(t().common.favoriteFailed(String(err)), 'error');
  } finally {
    favoriteInFlight = false;
  }
}
