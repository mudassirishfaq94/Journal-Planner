// ========================================
// MindVault — Journal Module
// ========================================

import * as storage from './storage.js';
import { generateId, formatDate, getToday, icon, getMoodEmoji, getAllMoods, wordCount, readingTime } from './utils.js';
import { Editor } from './editor.js';
import { showToast, showConfirm } from './ui.js';
import { navigate } from './router.js';
import { debounce } from './utils.js';

let currentEditor = null;
let currentEntryId = null;
let currentDraftEntry = null;
let autosaveTimer = null;

export function renderJournal(params = {}) {
    const page = document.getElementById('page-journal');
    const dateStr = params.date || params.id || getToday();

    // Clear previous editor instance if exists
    if (currentEditor) {
        currentEditor = null;
    }

    let entry = params.newEntry ? null : storage.getEntryByDate(dateStr);

    if (!entry) {
        entry = {
            id: generateId(),
            type: 'journal',
            title: '',
            date: dateStr,
            content: '',
            mood: null,
            category: 'Personal',
            tags: [],
            favorite: false,
            pinned: false,
            archived: false,
            deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    currentEntryId = entry.id;
    currentDraftEntry = { ...entry, tags: [...(entry.tags || [])] };
    const categories = storage.getCategories();
    const moods = getAllMoods();
    const isExistingEntry = Boolean(storage.getEntry(entry.id));

    page.innerHTML = `
    <div class="page-header">
      <div class="flex-between">
        <div>
          <h1 class="page-header__title">
            <span class="journal__date-display">${formatDate(dateStr, 'long')}</span>
          </h1>
          <p class="page-header__subtitle">${formatDate(entry.createdAt, 'time')} · ${entry.category || 'Personal'}</p>
        </div>
        <div class="journal__actions">
          <button class="btn btn--secondary journal__new-btn">
            ${icon('plus', 16)} New Journal
          </button>
          <button class="btn btn--primary journal__save-btn">
            ${icon('save', 16)} Save Journal
          </button>
          <button class="btn btn--icon btn--ghost journal__fav-btn" data-tooltip="${entry.favorite ? 'Unfavorite' : 'Favorite'}" aria-label="Toggle favorite">
            ${entry.favorite ? icon('heartFill', 20) : icon('heart', 20)}
          </button>
          <button class="btn btn--icon btn--ghost journal__pin-btn" data-tooltip="${entry.pinned ? 'Unpin' : 'Pin'}" aria-label="Toggle pin">
            ${icon('pin', 20)}
          </button>
          <button class="btn btn--icon btn--ghost journal__archive-btn" data-tooltip="Archive" aria-label="Archive">
            ${icon('archive', 20)}
          </button>
          <button class="btn btn--icon btn--ghost journal__delete-btn" data-tooltip="Delete" aria-label="Delete">
            ${icon('trash', 20)}
          </button>
        </div>
      </div>
    </div>

    <!-- Title -->
    <input class="input journal__title-input" type="text" placeholder="Entry title (optional)" value="${entry.title || ''}" aria-label="Entry title" />

    <!-- Meta Row -->
    <div class="journal__meta">
      <div class="journal__meta-item">
        <span style="color:var(--text-muted)">${icon('folder', 16)}</span>
        <select class="input journal__category-select" aria-label="Category" style="width:auto;padding:4px 30px 4px 8px">
          ${categories.map(c => `<option value="${c}" ${c === entry.category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="journal__meta-item">
        <span style="color:var(--text-muted)">Mood:</span>
        <div class="mood-selector">
          ${moods.map(m => `
            <button class="mood-btn ${entry.mood === m.key ? 'active' : ''}" data-mood="${m.key}" data-tooltip="${m.label}" aria-label="${m.label}">
              ${m.emoji}
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Tags -->
    <div class="journal__tags" id="journal-tags">
      ${(entry.tags || []).map(t => `
        <span class="tag tag--removable" data-tag="${t}">#${t} <span class="tag__remove">×</span></span>
      `).join('')}
      <div class="journal__tag-input-wrapper">
        <input class="journal__tag-input" type="text" placeholder="+ Add tag" aria-label="Add tag" />
      </div>
    </div>

    <!-- Editor -->
    <div id="journal-editor-container"></div>

    <!-- Status bar -->
    <div class="flex-between mt-md" style="font-size:var(--fs-xs);color:var(--text-muted)">
      <span class="journal__autosave-status">${isExistingEntry ? 'Saved' : 'Draft not saved yet'}</span>
      <span>Last updated: ${isExistingEntry ? formatDate(entry.updatedAt, 'relative') : 'Not saved yet'}</span>
    </div>
  `;

    // Init editor
    const editorContainer = document.getElementById('journal-editor-container');
    currentEditor = new Editor(editorContainer, {
        placeholder: 'What\'s on your mind today?',
        onChange: () => {
            updateAutosaveStatus('draft');
        }
    });

    // Clear editor content first, then set new content
    currentEditor.clear();
    currentEditor.setContent(entry.content);

    // Bind events
    bindJournalEvents(entry);
}

function bindJournalEvents(entry) {
    const page = document.getElementById('page-journal');

    page.querySelector('.journal__new-btn').addEventListener('click', () => {
        renderJournal({ date: getToday(), newEntry: true });
    });

    page.querySelector('.journal__save-btn').addEventListener('click', () => {
        saveCurrentEntry({ clearAfterSave: true });
    });

    // Title
    const titleInput = page.querySelector('.journal__title-input');
    titleInput.addEventListener('input', () => {
        currentDraftEntry.title = titleInput.value;
        updateAutosaveStatus('draft');
    });

    // Category
    const catSelect = page.querySelector('.journal__category-select');
    catSelect.addEventListener('change', () => {
        currentDraftEntry.category = catSelect.value;
        updateAutosaveStatus('draft');
    });

    // Mood
    page.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            page.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDraftEntry.mood = btn.dataset.mood;
            updateAutosaveStatus('draft');
        });
    });

    // Tags
    const tagInput = page.querySelector('.journal__tag-input');
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && tagInput.value.trim()) {
            const tag = tagInput.value.trim().replace(/^#/, '');
            currentDraftEntry.tags = currentDraftEntry.tags || [];
            if (!currentDraftEntry.tags.includes(tag)) {
                const newTags = [...currentDraftEntry.tags, tag];
                currentDraftEntry.tags = newTags;
                storage.addTag(tag);
                renderTagList(newTags);
                updateAutosaveStatus('draft');
            }
            tagInput.value = '';
        }
    });

    // Remove tags
    page.querySelector('#journal-tags').addEventListener('click', (e) => {
        const tagEl = e.target.closest('.tag--removable');
        if (tagEl && e.target.closest('.tag__remove')) {
            const tag = tagEl.dataset.tag;
            const newTags = (currentDraftEntry.tags || []).filter(t => t !== tag);
            currentDraftEntry.tags = newTags;
            renderTagList(newTags);
            updateAutosaveStatus('draft');
        }
    });

    // Favorite
    page.querySelector('.journal__fav-btn').addEventListener('click', () => {
        const current = storage.getEntry(currentEntryId);
        if (!current) {
            showToast('Save this journal before marking it as favorite', 'info');
            return;
        }
        storage.updateEntry(currentEntryId, { favorite: !current.favorite });
        renderJournal({ date: current.date });
        showToast(current.favorite ? 'Removed from favorites' : 'Added to favorites', 'success');
    });

    // Pin
    page.querySelector('.journal__pin-btn').addEventListener('click', () => {
        const current = storage.getEntry(currentEntryId);
        if (!current) {
            showToast('Save this journal before pinning it', 'info');
            return;
        }
        storage.updateEntry(currentEntryId, { pinned: !current.pinned });
        renderJournal({ date: current.date });
        showToast(current.pinned ? 'Unpinned' : 'Pinned', 'success');
    });

    // Archive
    page.querySelector('.journal__archive-btn').addEventListener('click', () => {
        const current = storage.getEntry(currentEntryId);
        if (!current) {
            showToast('Save this journal before archiving it', 'info');
            return;
        }
        storage.updateEntry(currentEntryId, { archived: !current.archived });
        showToast(current.archived ? 'Unarchived' : 'Archived', 'success');
    });

    // Delete
    page.querySelector('.journal__delete-btn').addEventListener('click', () => {
        if (!storage.getEntry(currentEntryId)) {
            renderJournal({ date: getToday(), newEntry: true });
            showToast('Draft cleared', 'info');
            return;
        }
        showConfirm('Delete Entry', 'Move this journal entry to trash?', () => {
            storage.deleteEntry(currentEntryId);
            showToast('Entry moved to trash', 'warning');
            navigate('dashboard');
        }, 'Delete');
    });
}

function renderTagList(tags) {
    const container = document.querySelector('#journal-tags');
    const inputWrapper = container.querySelector('.journal__tag-input-wrapper');
    container.querySelectorAll('.tag').forEach(t => t.remove());
    tags.forEach(t => {
        const span = document.createElement('span');
        span.className = 'tag tag--removable';
        span.dataset.tag = t;
        span.innerHTML = `#${t} <span class="tag__remove">×</span>`;
        container.insertBefore(span, inputWrapper);
    });
}

function saveCurrentEntry({ clearAfterSave = false } = {}) {
    if (!currentEntryId || !currentEditor || !currentDraftEntry) return;

    const now = new Date().toISOString();
    const entry = {
        ...currentDraftEntry,
        title: document.querySelector('.journal__title-input')?.value.trim() || '',
        category: document.querySelector('.journal__category-select')?.value || 'Personal',
        content: currentEditor.getContent(),
        updatedAt: now,
    };

    const plainContent = entry.content.replace(/<[^>]+>/g, '').trim();
    const hasContent = entry.title || plainContent || (entry.tags || []).length || entry.mood;

    if (!hasContent) {
        showToast('Write something before saving this journal', 'warning');
        return;
    }

    if (storage.getEntry(entry.id)) {
        storage.updateEntry(entry.id, entry);
    } else {
        storage.createEntry({ ...entry, createdAt: entry.createdAt || now });
    }

    updateAutosaveStatus('saved');
    showToast('Journal saved', 'success');

    if (clearAfterSave) {
        renderJournal({ date: getToday(), newEntry: true });
    }
}

function updateAutosaveStatus(status) {
    const el = document.querySelector('.journal__autosave-status');
    if (!el) return;
    if (status === 'draft') {
        el.textContent = 'Unsaved draft';
        el.style.color = 'var(--color-warning)';
    } else {
        el.textContent = 'Saved';
        el.style.color = 'var(--color-success)';
    }
}

export function openJournalByDate(dateStr) {
    navigate('journal', { date: dateStr });
}
