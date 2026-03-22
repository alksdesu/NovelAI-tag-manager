// Page type
export type Page = 'library' | 'safebooru' | 'danbooru' | 'assistant';
export type Language = 'en' | 'zh';
export type SearchMode = 'label' | 'tag';
export type AssistantProvider = 'openai' | 'google';
export type MessageRole = 'user' | 'assistant' | 'system' | 'model';

// Settings
export interface Settings {
  language: Language;
  minimized: boolean;
  searchMode: SearchMode;
  lastActivePage: Page;
  lastCategoryId?: string;
}

// Bilingual name
export interface BilingualName {
  en: string;
  zh: string;
}

// Category
export interface Category {
  id: string;
  accent: string;
  name: BilingualName;
  description?: string;
  tags: Tag[];
}

// Tag
export interface Tag {
  id: string;
  tag: string;
  label: BilingualName;
  notes: string;
  pinned?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// Assistant model
export interface AssistantModel {
  id: string;
  label: string;
  description?: string;
  family?: string;
}

// Assistant attachment
export interface AssistantAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  previewable: boolean;
  providerData: Record<string, unknown>;
  ephemeral: boolean;
}

// Assistant message
export interface AssistantMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  updatedAt: number;
  attachments: AssistantAttachment[];
  metadata: Record<string, unknown>;
}

// Assistant conversation
export interface AssistantConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AssistantMessage[];
}

// Provider config
export interface ProviderConfig {
  baseUrl?: string;
  apiKey: string;
  model: string;
  models: AssistantModel[];
  modelsFetchedAt: number;
  thinkingLevel?: string; // 'low' | 'medium' | 'high' | '' (auto/default)
}

// Assistant data (persisted)
export interface AssistantData {
  provider: AssistantProvider;
  openai: ProviderConfig;
  google: ProviderConfig;
  conversations: AssistantConversation[];
  activeConversationId: string | null;
}

// Main persisted data
export interface AppData {
  settings: Settings;
  assistant: AssistantData;
  categories: Category[];
}

// Panel/form size
export interface PanelSize {
  width: number | null;
  height: number | null;
}

// Danbooru credentials
export interface DanbooruCredentials {
  username: string;
  apiKey: string;
}

// Translation cache entry
export interface TranslationEntry {
  [targetLang: string]: string;
}

// Translation cache
export interface TranslationCache {
  [sourceText: string]: TranslationEntry;
}

// Toast
export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Context menu item
export interface ContextMenuItem {
  label: string;
  action: string;
  danger?: boolean;
  data?: Record<string, unknown>;
}

// Context menu state
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}
