// ========================================
// MindVault — Storage Manager
// ========================================
// Abstract storage layer backed by localStorage cache and Supabase sync.

import { getSupabase } from './supabaseClient.js';

const STORAGE_PREFIX = 'mindvault_';

const COLLECTIONS = {
  entries: 'entries',
  notes: 'notes',
  categories: 'categories',
  tags: 'tags',
  settings: 'settings',
  searchHistory: 'searchHistory',
};



let APP_STATE_ID = 'default';
let remoteReady = false;
let isHydrating = false;
let syncTimer = null;

function getKey(collection) {
  return `${STORAGE_PREFIX}${APP_STATE_ID}_${collection}`;
}

function readCollection(collection) {
  const raw = localStorage.getItem(getKey(collection));
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCollection(collection, data) {
  localStorage.setItem(getKey(collection), JSON.stringify(data));
  scheduleRemoteSync();
}

function writeCollectionLocalOnly(collection, data) {
  localStorage.setItem(getKey(collection), JSON.stringify(data));
}

function readAllLocalData() {
  return {
    entries: readCollection(COLLECTIONS.entries),
    notes: readCollection(COLLECTIONS.notes),
    categories: getCategories(),
    tags: readCollection(COLLECTIONS.tags),
    settings: getSettings(),
    searchHistory: readCollection(COLLECTIONS.searchHistory),
  };
}

function hasMeaningfulLocalData(data) {
  return Boolean(
    data.entries.length ||
    data.notes.length ||
    data.tags.length ||
    data.searchHistory.length
  );
}

function normalizeRemoteData(data = {}) {
  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    categories: Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES,
    tags: Array.isArray(data.tags) ? data.tags : [],
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    searchHistory: Array.isArray(data.searchHistory) ? data.searchHistory : [],
  };
}

function hydrateLocalCache(data) {
  isHydrating = true;
  writeCollectionLocalOnly(COLLECTIONS.entries, data.entries);
  writeCollectionLocalOnly(COLLECTIONS.notes, data.notes);
  writeCollectionLocalOnly(COLLECTIONS.categories, data.categories);
  writeCollectionLocalOnly(COLLECTIONS.tags, data.tags);
  writeCollectionLocalOnly(COLLECTIONS.searchHistory, data.searchHistory);
  localStorage.setItem(getKey(COLLECTIONS.settings), JSON.stringify(data.settings));
  isHydrating = false;
}

async function saveRemoteNow() {
  if (!remoteReady || isHydrating || APP_STATE_ID === 'default') return;

  const supabase = await getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('app_state')
    .upsert({ id: APP_STATE_ID, data: readAllLocalData() }, { onConflict: 'id' });

  if (error) {
    console.warn('Supabase sync failed:', error.message);
  }
}

function scheduleRemoteSync() {
  if (!remoteReady || isHydrating) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    saveRemoteNow();
  }, 350);
}

export async function initRemoteStorage() {
  try {
    const supabase = await getSupabase();
    if (!supabase) {
      remoteReady = false;
      console.warn('Supabase unavailable; using local cache only.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      APP_STATE_ID = user.id;
    } else {
      remoteReady = false;
      APP_STATE_ID = 'default';
      return;
    }

    const localData = readAllLocalData();
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', APP_STATE_ID)
      .maybeSingle();

    if (error) throw error;

    remoteReady = true;

    if (data?.data) {
      const remoteData = normalizeRemoteData(data.data);
      if (hasMeaningfulLocalData(localData) && !hasMeaningfulLocalData(remoteData)) {
        await saveRemoteNow();
      } else {
        hydrateLocalCache(remoteData);
      }
    } else {
      hydrateLocalCache(normalizeRemoteData(localData));
      await saveRemoteNow();
    }
  } catch (error) {
    remoteReady = false;
    console.warn('Supabase unavailable or sync error:', error.message);
  }
}

export async function handleAuthChange(user) {
  if (user) {
    APP_STATE_ID = user.id;
    await initRemoteStorage();
  } else {
    APP_STATE_ID = 'default';
    remoteReady = false;
  }
}

export function isRemoteStorageReady() {
  return remoteReady;
}

// ---- Generic CRUD ----

function getAll(collection) {
  return readCollection(collection);
}

function getById(collection, id) {
  return readCollection(collection).find(item => item.id === id) || null;
}

function create(collection, item) {
  const items = readCollection(collection);
  items.unshift(item);
  writeCollection(collection, items);
  return item;
}

function update(collection, id, updates) {
  const items = readCollection(collection);
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
  writeCollection(collection, items);
  return items[idx];
}

function remove(collection, id) {
  const items = readCollection(collection);
  const filtered = items.filter(item => item.id !== id);
  writeCollection(collection, filtered);
}

// ---- Entries (Journals) ----

export function getAllEntries() {
  return getAll(COLLECTIONS.entries).filter(e => !e.deleted);
}

export function getEntry(id) {
  return getById(COLLECTIONS.entries, id);
}

export function getEntryByDate(dateStr) {
  return readCollection(COLLECTIONS.entries).find(e => e.date === dateStr && !e.deleted) || null;
}

export function createEntry(entry) {
  return create(COLLECTIONS.entries, entry);
}

export function updateEntry(id, updates) {
  return update(COLLECTIONS.entries, id, updates);
}

export function deleteEntry(id) {
  return update(COLLECTIONS.entries, id, { deleted: true, deletedAt: new Date().toISOString() });
}

export function restoreEntry(id) {
  return update(COLLECTIONS.entries, id, { deleted: false, deletedAt: null });
}

export function permanentDeleteEntry(id) {
  return remove(COLLECTIONS.entries, id);
}

export function getDeletedEntries() {
  return getAll(COLLECTIONS.entries).filter(e => e.deleted);
}

export function getArchivedEntries() {
  return getAll(COLLECTIONS.entries).filter(e => e.archived && !e.deleted);
}

export function getFavoriteEntries() {
  return getAllEntries().filter(e => e.favorite);
}

export function getPinnedEntries() {
  return getAllEntries().filter(e => e.pinned);
}

// ---- Notes ----

export function getAllNotes() {
  return getAll(COLLECTIONS.notes).filter(n => !n.deleted);
}

export function getNote(id) {
  return getById(COLLECTIONS.notes, id);
}

export function createNote(note) {
  return create(COLLECTIONS.notes, note);
}

export function updateNote(id, updates) {
  return update(COLLECTIONS.notes, id, updates);
}

export function deleteNote(id) {
  return update(COLLECTIONS.notes, id, { deleted: true, deletedAt: new Date().toISOString() });
}

export function restoreNote(id) {
  return update(COLLECTIONS.notes, id, { deleted: false, deletedAt: null });
}

export function permanentDeleteNote(id) {
  return remove(COLLECTIONS.notes, id);
}

export function getFavoriteNotes() {
  return getAllNotes().filter(n => n.favorite);
}

export function getPinnedNotes() {
  return getAllNotes().filter(n => n.pinned);
}

// ---- Categories ----

const DEFAULT_CATEGORIES = [
  'Personal', 'Work', 'Ideas', 'Learning', 'Programming',
  'Fitness', 'Books', 'Recipes', 'Travel', 'Expenses',
  'Meeting', 'Projects'
];

export function getCategories() {
  const stored = readCollection(COLLECTIONS.categories);
  if (stored.length === 0) {
    writeCollection(COLLECTIONS.categories, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return stored;
}

export function addCategory(category) {
  const cats = getCategories();
  if (!cats.includes(category)) {
    cats.push(category);
    writeCollection(COLLECTIONS.categories, cats);
  }
  return cats;
}

export function removeCategory(category) {
  const cats = getCategories().filter(c => c !== category);
  writeCollection(COLLECTIONS.categories, cats);
  return cats;
}

// ---- Tags ----

export function getTags() {
  return readCollection(COLLECTIONS.tags);
}

export function addTag(tag) {
  const tags = getTags();
  if (!tags.includes(tag)) {
    tags.push(tag);
    writeCollection(COLLECTIONS.tags, tags);
  }
  return tags;
}

// ---- Settings ----

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accentColor: '#2563EB',
  fontSize: 'medium',
  autosave: true,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(getKey(COLLECTIONS.settings));
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function updateSettings(updates) {
  const settings = { ...getSettings(), ...updates };
  localStorage.setItem(getKey(COLLECTIONS.settings), JSON.stringify(settings));
  scheduleRemoteSync();
  return settings;
}

// ---- Search History ----

export function getSearchHistory() {
  return readCollection(COLLECTIONS.searchHistory).slice(0, 10);
}

export function addSearchHistory(query) {
  let history = readCollection(COLLECTIONS.searchHistory);
  history = history.filter(h => h !== query);
  history.unshift(query);
  writeCollection(COLLECTIONS.searchHistory, history.slice(0, 10));
}

export function clearSearchHistory() {
  writeCollection(COLLECTIONS.searchHistory, []);
}

// ---- Export / Import ----

export function exportAllData() {
  const data = {};
  for (const key of Object.values(COLLECTIONS)) {
    data[key] = readCollection(key);
  }
  data.settings = getSettings();
  return data;
}

export function importAllData(data) {
  for (const key of Object.values(COLLECTIONS)) {
    if (data[key]) {
      if (key === 'settings') {
        localStorage.setItem(getKey(key), JSON.stringify(data[key]));
      } else {
        writeCollection(key, data[key]);
      }
    }
  }
  scheduleRemoteSync();
}

export function resetAllData() {
  for (const key of Object.values(COLLECTIONS)) {
    localStorage.removeItem(getKey(key));
  }
  scheduleRemoteSync();
}

// ---- Stats helpers ----

export function countEntriesForMonth(year, month) {
  return getAllEntries().filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;
}

export function getEntriesInRange(startDate, endDate) {
  return getAllEntries().filter(e => e.date >= startDate && e.date <= endDate);
}
