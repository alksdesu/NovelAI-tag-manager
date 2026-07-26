// Storage namespace and keys
export const STORAGE_NAMESPACE = 'novelai-tag-maestro';
export const STORAGE_VERSION = '1.0.0';
export const STORAGE_KEY = `${STORAGE_NAMESPACE}::state::${STORAGE_VERSION}`;
export const STORAGE_SAVE_DEBOUNCE_MS = 120;
export const TRANSLATION_CACHE_KEY = `${STORAGE_NAMESPACE}::translations`;
export const POSITION_KEY = `${STORAGE_NAMESPACE}::position`;

// Autocomplete
export const AUTOCOMPLETE_MAX_RESULTS = 12;
export const AUTOCOMPLETE_REMOTE_LIMIT = 8;
export const AUTOCOMPLETE_PREFIX_LENGTH = 3;
export const AUTOCOMPLETE_MIN_REMOTE_CHARS = 2;

// Safebooru
export const SAFEBOORU_RESULT_LIMIT = 30;

// Translation dictionary
export const TRANSLATION_DICT_URL =
  'https://raw.githubusercontent.com/Aaalice233/ComfyUI-Danbooru-Gallery/main/danbooru_gallery/zh_cn/all_tags_cn.json';
export const TRANSLATION_DICT_KEY = `${STORAGE_NAMESPACE}::zhDictionary::v1`;
export const TRANSLATION_DICT_AT_KEY = `${STORAGE_NAMESPACE}::zhDictionaryFetchedAt`;
export const TRANSLATION_DICT_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

// Danbooru
export const DANBOORU_API_BASE = 'https://danbooru.donmai.us';
export const DANBOORU_PAGE_LIMIT = 24;
export const DANBOORU_CREDENTIAL_KEY = `${STORAGE_NAMESPACE}::danbooruCredentials`;
export const DANBOORU_NON_IMAGE_EXTS = new Set(['zip', 'mp4', 'webm', 'swf']);

// Library
export const TAGS_PER_PAGE = 10;

// Panel sizing
export const PANEL_SIZE_KEY = `${STORAGE_NAMESPACE}::panelSize`;
export const PANEL_MIN_WIDTH = 200;
export const PANEL_MIN_HEIGHT = 220;
export const PANEL_MARGIN_X = 24;
export const PANEL_MARGIN_Y = 48;
export const PANEL_RESPONSIVE_COMPACT = 760;
export const PANEL_RESPONSIVE_NARROW = 560;
export const PANEL_RESPONSIVE_TINY = 420;
export const PANEL_RESPONSIVE_MOBILE_VP = 480;

// Tag form sizing
export const TAG_FORM_SIZE_KEY = `${STORAGE_NAMESPACE}::tagFormSize`;
export const TAG_FORM_MIN_WIDTH = 360;
export const TAG_FORM_MAX_WIDTH = 720;
export const TAG_FORM_MIN_HEIGHT = 320;
export const TAG_FORM_MAX_HEIGHT = 860;

// Performance
export const MOTION_REDUCTION_TAG_THRESHOLD = 240;

// AI Assistant
export const ASSISTANT_MAX_ATTACHMENTS = 6;
export const ASSISTANT_MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB
export const ASSISTANT_CONVERSATION_LIMIT = 64;
export const ASSISTANT_MESSAGE_LIMIT = 512;
export const ASSISTANT_DEFAULT_TITLE = 'New Chat';
export const ASSISTANT_DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';
export const ASSISTANT_HISTORY_PLACEHOLDER = '{{history}}';
export const ASSISTANT_LIBRARY_PLACEHOLDER = '{{library_tag}}';
export const ASSISTANT_USER_PLACEHOLDER = '{{user_input}}';
export const ASSISTANT_HISTORY_TURNS_LIMIT = 20;
