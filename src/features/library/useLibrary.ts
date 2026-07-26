import { createSignal, createMemo, createEffect } from 'solid-js';
import { data, setData } from '../../stores/data';
import { addToast, t } from '../../stores/ui';
import { uid } from '../../lib/uid';
import { copyToClipboard } from '../../lib/clipboard';
import { coerceToString } from '../../lib/escape';
import { normalizeCategories } from '../../stores/persistence';
import { TAGS_PER_PAGE } from '../../constants';
import type { Category, Tag, SearchMode } from '../../types';

// ─── Signals ────────────────────────────────────────────────────

const [currentCategoryId, setCurrentCategoryId] = createSignal<string | null>(
  data.settings.lastCategoryId ?? null,
);

function rememberCategory(id: string | null) {
  setCurrentCategoryId(id);
  setData('settings', 'lastCategoryId', id ?? undefined);
}
const [searchTerm, setSearchTerm] = createSignal('');
const [searchAll, setSearchAll] = createSignal(false);
const [libraryPage, setLibraryPage] = createSignal(1);

// Category form
const [showCategoryForm, setShowCategoryForm] = createSignal(false);
const [editingCategoryId, setEditingCategoryId] = createSignal<string | null>(null);

// Tag form
const [showTagForm, setShowTagForm] = createSignal(false);
const [editingTagId, setEditingTagId] = createSignal<string | null>(null);

// Batch selection
const [batchMode, setBatchMode] = createSignal(false);
const [selectedTagIds, setSelectedTagIds] = createSignal<Set<string>>(new Set());

// Translated tag IDs
const [translatedTagIds, setTranslatedTagIds] = createSignal<Set<string>>(new Set());

export function isTagTranslated(tagId: string): boolean {
  return translatedTagIds().has(tagId);
}

export function toggleTagTranslation(tagId: string) {
  setTranslatedTagIds((prev) => {
    const next = new Set(prev);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    return next;
  });
}

// ─── Derived state ──────────────────────────────────────────────

const activeCategory = createMemo<Category | undefined>(() => {
  const id = currentCategoryId();
  if (id) {
    const found = data.categories.find((c) => c.id === id);
    if (found) return found;
  }
  return data.categories[0];
});

const activeCategoryIndex = createMemo(() => {
  const cat = activeCategory();
  if (!cat) return -1;
  return data.categories.findIndex((c) => c.id === cat.id);
});

function sortPinnedFirst(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    return bp - ap;
  });
}

function matchesSearch(tag: Tag, needle: string, mode: SearchMode): boolean {
  if (mode === 'tag') {
    return coerceToString(tag.tag).toLowerCase().includes(needle);
  }
  return (
    coerceToString(tag.label.en).toLowerCase().includes(needle) ||
    coerceToString(tag.label.zh).toLowerCase().includes(needle) ||
    coerceToString(tag.notes).toLowerCase().includes(needle)
  );
}

const filteredTags = createMemo<Tag[]>(() => {
  const needle = searchTerm().trim().toLowerCase();
  const mode = data.settings.searchMode;

  // Cross-category search
  if (needle && searchAll()) {
    const results: Tag[] = [];
    for (const cat of data.categories) {
      for (const tag of cat.tags) {
        if (matchesSearch(tag, needle, mode)) results.push(tag);
      }
    }
    return sortPinnedFirst(results);
  }

  // Single category search
  const cat = activeCategory();
  if (!cat) return [];
  if (!needle) return sortPinnedFirst(cat.tags);

  const filtered = cat.tags.filter((tag) => matchesSearch(tag, needle, mode));
  return sortPinnedFirst(filtered);
});

const totalPages = createMemo(() => Math.max(1, Math.ceil(filteredTags().length / TAGS_PER_PAGE)));

const clampedPage = createMemo(() => Math.min(libraryPage(), totalPages()));

// Sync libraryPage back when it exceeds totalPages (e.g., after deleting tags)
createEffect(() => {
  const clamped = clampedPage();
  if (libraryPage() !== clamped) {
    setLibraryPage(clamped);
  }
});

const paginatedTags = createMemo<Tag[]>(() => {
  const all = filteredTags();
  const p = clampedPage();
  return all.slice((p - 1) * TAGS_PER_PAGE, p * TAGS_PER_PAGE);
});

// ─── Category actions ───────────────────────────────────────────

function switchCategory(id: string) {
  rememberCategory(id);
  setLibraryPage(1);
  setSearchTerm('');
  setSelectedTagIds(new Set<string>());
}

function openCategoryForm(editId?: string) {
  setEditingCategoryId(editId ?? null);
  setShowCategoryForm(true);
}

function closeCategoryForm() {
  setEditingCategoryId(null);
  setShowCategoryForm(false);
}

function submitCategory(formData: { nameEn: string; nameZh: string; description?: string; accent: string }) {
  const editId = editingCategoryId();
  if (editId) {
    const idx = data.categories.findIndex((c) => c.id === editId);
    if (idx >= 0) {
      setData('categories', idx, 'name', 'en', formData.nameEn);
      setData('categories', idx, 'name', 'zh', formData.nameZh);
      setData('categories', idx, 'description', formData.description || '');
      setData('categories', idx, 'accent', formData.accent);
      addToast(t().common.categoryUpdated, 'success');
    }
  } else {
    const newCat: Category = {
      id: uid('cat'),
      accent: formData.accent || '#D4956B',
      name: { en: formData.nameEn, zh: formData.nameZh },
      description: formData.description || '',
      tags: [],
    };
    setData('categories', (cats) => [...cats, newCat]);
    rememberCategory(newCat.id);
    addToast(t().common.categoryCreated, 'success');
  }
  closeCategoryForm();
}

function deleteCategory() {
  const cat = activeCategory();
  if (!cat) return;

  // Snapshot for undo
  const snapshot = JSON.parse(JSON.stringify(cat)) as Category;
  const catIndex = data.categories.findIndex((c) => c.id === cat.id);

  setData('categories', (cats) => cats.filter((c) => c.id !== cat.id));
  setTranslatedTagIds((prev) => {
    const next = new Set(prev);
    for (const tag of cat.tags) next.delete(tag.id);
    return next;
  });
  rememberCategory(null);
  closeCategoryForm();

  addToast(t().library.deleteCategoryUndo, 'info', 5000, {
    label: t().library.deleteCategoryUndoAction,
    onClick: () => {
      // Restore category at original position
      setData('categories', (cats) => {
        const next = [...cats];
        next.splice(Math.min(catIndex, next.length), 0, snapshot);
        return next;
      });
      rememberCategory(snapshot.id);
      addToast(t().common.categoryUpdated, 'success');
    },
  });
}

async function copyCategory() {
  const cat = activeCategory();
  if (!cat || cat.tags.length === 0) return;
  const text = cat.tags.map((t) => t.tag).join(', ');
  const ok = await copyToClipboard(text);
  if (ok) addToast(t().common.copiedTags, 'success');
}

// ─── Tag actions ────────────────────────────────────────────────

function openTagForm(editId?: string) {
  setEditingTagId(editId ?? null);
  setShowTagForm(true);
}

function closeTagForm() {
  setEditingTagId(null);
  setShowTagForm(false);
}

function submitTag(formData: { labelEn: string; labelZh: string; tag: string; notes: string }) {
  const catIdx = activeCategoryIndex();
  if (catIdx < 0) {
    addToast(t().common.createCategoryFirst, 'error');
    closeTagForm();
    return;
  }

  const editId = editingTagId();
  if (editId) {
    const tagIdx = data.categories[catIdx].tags.findIndex((t) => t.id === editId);
    if (tagIdx >= 0) {
      setData('categories', catIdx, 'tags', tagIdx, {
        label: { en: formData.labelEn, zh: formData.labelZh },
        tag: formData.tag,
        notes: formData.notes,
        updatedAt: Date.now(),
      });
      addToast(t().common.tagUpdated, 'success');
    }
  } else {
    const now = Date.now();
    const newTag: Tag = {
      id: uid('tag'),
      tag: formData.tag,
      label: { en: formData.labelEn, zh: formData.labelZh },
      notes: formData.notes,
      createdAt: now,
      updatedAt: now,
    };
    setData('categories', catIdx, 'tags', (tags) => [...tags, newTag]);
    addToast(t().common.tagCreated, 'success');
  }
  closeTagForm();
}

function togglePinTag(tagId: string) {
  const catIdx = activeCategoryIndex();
  if (catIdx < 0) return;
  const tagIdx = data.categories[catIdx].tags.findIndex((t) => t.id === tagId);
  if (tagIdx < 0) return;
  const current = data.categories[catIdx].tags[tagIdx].pinned ?? false;
  setData('categories', catIdx, 'tags', tagIdx, 'pinned', !current);
}

function deleteTag(tagId: string) {
  const catIdx = activeCategoryIndex();
  if (catIdx < 0) return;
  setData('categories', catIdx, 'tags', (tags) => tags.filter((t) => t.id !== tagId));
  setTranslatedTagIds((prev) => {
    const next = new Set(prev);
    next.delete(tagId);
    return next;
  });
  addToast(t().common.tagDeleted, 'info');
}

async function copyTag(tagId: string) {
  const cat = activeCategory();
  const tag = cat?.tags.find((t) => t.id === tagId);
  if (!tag) return;
  const ok = await copyToClipboard(tag.tag);
  if (ok) addToast(t().common.copiedTag, 'success');
}

// ─── Batch operations ────────────────────────────────────────

function toggleBatchMode() {
  setBatchMode(!batchMode());
  setSelectedTagIds(new Set<string>());
}

function toggleTagSelection(tagId: string) {
  setSelectedTagIds((prev) => {
    const next = new Set(prev);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    return next;
  });
}

function isTagSelected(tagId: string): boolean {
  return selectedTagIds().has(tagId);
}

function selectAllTags() {
  const all = filteredTags();
  const current = selectedTagIds();
  const allSelected = all.length > 0 && all.every((tag) => current.has(tag.id));
  if (allSelected) {
    setSelectedTagIds(new Set<string>());
  } else {
    setSelectedTagIds(new Set(all.map((tag) => tag.id)));
  }
}

// Batch ops act on selected ids across ALL categories: cross-category
// search (searchAll) lets users select tags outside the active category.

function forgetTranslations(ids: Set<string>) {
  setTranslatedTagIds((prev) => {
    const next = new Set(prev);
    for (const id of ids) next.delete(id);
    return next;
  });
}

async function batchCopy() {
  const selected = selectedTagIds();
  const tags: Tag[] = [];
  for (const cat of data.categories) {
    for (const tag of cat.tags) {
      if (selected.has(tag.id)) tags.push(tag);
    }
  }
  if (tags.length === 0) return;
  const text = tags.map((t) => t.tag).join(', ');
  const ok = await copyToClipboard(text);
  if (ok) addToast(t().common.copiedTags, 'success');
}

function batchDelete() {
  const selected = selectedTagIds();
  for (let i = 0; i < data.categories.length; i++) {
    if (data.categories[i].tags.some((t) => selected.has(t.id))) {
      setData('categories', i, 'tags', (tags) => tags.filter((t) => !selected.has(t.id)));
    }
  }
  forgetTranslations(selected);
  setSelectedTagIds(new Set<string>());
  setBatchMode(false);
  addToast(t().common.tagDeleted, 'info');
}

function batchMoveToCategory(targetCategoryId: string) {
  const dstIdx = data.categories.findIndex((c) => c.id === targetCategoryId);
  if (dstIdx < 0) return;

  const selected = selectedTagIds();
  const tagsToMove: Tag[] = [];
  for (const cat of data.categories) {
    if (cat.id === targetCategoryId) continue;
    for (const tag of cat.tags) {
      if (selected.has(tag.id)) tagsToMove.push(tag);
    }
  }
  if (tagsToMove.length === 0) return;
  const cloned = JSON.parse(JSON.stringify(tagsToMove)) as Tag[];

  for (let i = 0; i < data.categories.length; i++) {
    if (i === dstIdx) continue;
    if (data.categories[i].tags.some((t) => selected.has(t.id))) {
      setData('categories', i, 'tags', (tags) => tags.filter((t) => !selected.has(t.id)));
    }
  }
  setData('categories', dstIdx, 'tags', (tags) => [...tags, ...cloned]);
  setSelectedTagIds(new Set<string>());
  setBatchMode(false);
  addToast(t().common.tagUpdated, 'success');
}

// ─── Move to category ────────────────────────────────────────

function moveTagToCategory(tagId: string, targetCategoryId: string) {
  const srcIdx = activeCategoryIndex();
  if (srcIdx < 0) return;
  const srcCat = data.categories[srcIdx];
  const tag = srcCat.tags.find((t) => t.id === tagId);
  if (!tag) return;

  const dstIdx = data.categories.findIndex((c) => c.id === targetCategoryId);
  if (dstIdx < 0 || dstIdx === srcIdx) return;

  // Clone tag data
  const tagData = JSON.parse(JSON.stringify(tag)) as Tag;

  // Remove from source
  setData('categories', srcIdx, 'tags', (tags) => tags.filter((t) => t.id !== tagId));
  // Add to destination
  setData('categories', dstIdx, 'tags', (tags) => [...tags, tagData]);
  addToast(t().common.tagUpdated, 'success');
}

// ─── Import / Export ─────────────────────────────────────────

function exportLibrary() {
  const payload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    categories: data.categories,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tag-maestro-library-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addToast(t().library.exportSuccess, 'success');
}

function importLibrary() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        // Same field-level normalization as storage load: malformed tags
        // must not reach the render path mid-session
        const cats = normalizeCategories(raw?.categories);
        if (cats.length === 0 && !Array.isArray(raw?.categories)) throw new Error('invalid');
        // Merge: add new categories, skip duplicates by ID
        const existingIds = new Set(data.categories.map((c) => c.id));
        const newCats = cats.filter((c) => !existingIds.has(c.id));
        if (newCats.length > 0) {
          setData('categories', (prev) => [...prev, ...newCats]);
        }
        addToast(t().library.importSuccess(newCats.length), 'success');
      } catch {
        addToast(t().library.importFailed, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ─── Drag sort ──────────────────────────────────────────────────

function moveCategory(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return;
  setData('categories', (cats) => {
    const next = [...cats];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  });
}

// Id-based: display order (pinned-first sort, search filter) diverges
// from storage order, so display indexes must never touch the array.
function moveTagById(sourceTagId: string, targetTagId: string) {
  if (sourceTagId === targetTagId) return;
  const catIdx = activeCategoryIndex();
  if (catIdx < 0) return;

  setData('categories', catIdx, 'tags', (tags) => {
    const fromIndex = tags.findIndex((t) => t.id === sourceTagId);
    const toIndex = tags.findIndex((t) => t.id === targetTagId);
    if (fromIndex < 0 || toIndex < 0) return tags;
    const next = [...tags];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  });
}

// ─── Export ─────────────────────────────────────────────────────

export {
  // Signals
  currentCategoryId,
  setCurrentCategoryId,
  searchTerm,
  setSearchTerm,
  searchAll,
  setSearchAll,
  libraryPage,
  setLibraryPage,
  showCategoryForm,
  showTagForm,
  editingCategoryId,
  editingTagId,
  // Derived
  activeCategory,
  activeCategoryIndex,
  filteredTags,
  totalPages,
  clampedPage,
  paginatedTags,
  // Category actions
  switchCategory,
  openCategoryForm,
  closeCategoryForm,
  submitCategory,
  deleteCategory,
  copyCategory,
  // Tag actions
  openTagForm,
  closeTagForm,
  submitTag,
  deleteTag,
  copyTag,
  moveTagToCategory,
  togglePinTag,
  // Batch
  batchMode,
  toggleBatchMode,
  toggleTagSelection,
  isTagSelected,
  selectedTagIds,
  batchCopy,
  batchDelete,
  batchMoveToCategory,
  selectAllTags,
  // Import/Export
  exportLibrary,
  importLibrary,
  // Drag sort
  moveTagById,
  moveCategory,
};
