// ========================================
// MindVault — Notes Module
// ========================================

import * as storage from './storage.js';
import { generateId, formatDate, icon, truncate, debounce } from './utils.js';
import { showToast, showConfirm, showPrompt } from './ui.js';

const NOTE_COLORS = [
    { name: 'None', value: '' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Yellow', value: '#FACC15' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Teal', value: '#14B8A6' },
];

let currentNoteId = null;

export function renderNotes() {
    const page = document.getElementById('page-notes');
    const notes = storage.getAllNotes();
    const categories = storage.getCategories();
    document.querySelectorAll('body > #note-editor-modal').forEach(existing => existing.remove());

    page.innerHTML = `
    <div class="page-header">
      <div class="flex-between">
        <div>
          <h1 class="page-header__title">Notes</h1>
          <p class="page-header__subtitle">${notes.length} note${notes.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn--primary" id="new-note-btn">
          ${icon('plus', 16)} New Note
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex gap-sm mb-lg" style="flex-wrap:wrap">
      <select class="input notes__filter-category" style="width:auto;padding:6px 30px 6px 10px" aria-label="Filter by category">
        <option value="">All Categories</option>
        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select class="input notes__filter-color" style="width:auto;padding:6px 30px 6px 10px" aria-label="Filter by color">
        <option value="">All Colors</option>
        ${NOTE_COLORS.filter(c => c.value).map(c => `<option value="${c.value}">${c.name}</option>`).join('')}
      </select>
      <button class="btn btn--ghost notes__filter-fav">♥ Favorites</button>
      <button class="btn btn--ghost notes__filter-pinned">${icon('pin', 14)} Pinned</button>
    </div>

    <!-- Notes Grid -->
    <div class="grid grid--auto-fill stagger-children" id="notes-grid">
      ${notes.length === 0 ? renderEmptyNotes() : notes.map(renderNoteCard).join('')}
    </div>

    <!-- Note Editor Modal (hidden) -->
    <div class="modal" id="note-editor-modal">
      <div class="modal__backdrop"></div>
      <div class="modal__content" style="max-width:600px">
        <div class="modal__header">
          <h3 class="modal__title">Edit Note</h3>
          <div class="flex gap-xs">
            <button class="btn btn--icon-sm btn--ghost note-modal__fav" data-tooltip="Favorite">${icon('heart', 16)}</button>
            <button class="btn btn--icon-sm btn--ghost note-modal__pin" data-tooltip="Pin">${icon('pin', 16)}</button>
            <button class="btn btn--icon-sm btn--ghost note-modal__dup" data-tooltip="Duplicate">${icon('copy', 16)}</button>
            <button class="btn btn--icon-sm btn--ghost note-modal__del" data-tooltip="Delete">${icon('trash', 16)}</button>
            <button class="modal__close" aria-label="Close">${icon('x', 18)}</button>
          </div>
        </div>
        <input class="input mb-md note-modal__title" type="text" placeholder="Note title" aria-label="Note title" />
        <textarea class="input note-modal__body" placeholder="Write your note..." rows="8" aria-label="Note content"></textarea>
        <div class="flex gap-md mt-md" style="flex-wrap:wrap;align-items:center">
          <div>
            <label class="input-group__label" style="margin-bottom:4px;display:block">Category</label>
            <select class="input note-modal__category" style="width:auto;padding:4px 30px 4px 8px">
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="input-group__label" style="margin-bottom:4px;display:block">Color</label>
            <div class="color-picker note-modal__colors">
              ${NOTE_COLORS.map(c => `
                <button class="color-swatch ${!c.value ? 'active' : ''}" data-color="${c.value}" 
                  style="background:${c.value || 'var(--bg-card)'};${!c.value ? 'border:1px dashed var(--border-color-strong)' : ''}" 
                  data-tooltip="${c.name}" aria-label="${c.name}"></button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="flex gap-md mt-md" style="align-items:center">
          <label class="input-group__label">Tags:</label>
          <input class="input note-modal__tag-input" type="text" placeholder="Add tag + Enter" style="flex:1" />
        </div>
        <div class="flex gap-xs mt-sm note-modal__tags" style="flex-wrap:wrap"></div>
        <div class="modal__footer">
          <button class="btn btn--secondary note-modal__cancel">Cancel</button>
          <button class="btn btn--primary note-modal__save">Save Note</button>
        </div>
      </div>
    </div>
  `;

    bindNotesEvents();
}

function renderNoteCard(note) {
    return `
    <div class="note-card" data-id="${note.id}" style="--note-color:${note.color || 'transparent'}" tabindex="0">
      <div class="note-card__title">${note.title || 'Untitled Note'}</div>
      <div class="note-card__body">${truncate(note.content, 120)}</div>
      <div class="note-card__footer">
        <span>${formatDate(note.updatedAt || note.createdAt, 'relative')}</span>
        <div class="note-card__actions">
          ${note.favorite ? `<span style="color:var(--color-danger)">${icon('heartFill', 14)}</span>` : ''}
          ${note.pinned ? `<span style="color:var(--color-accent)">${icon('pin', 14)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderEmptyNotes() {
    return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state__icon">📝</div>
      <h3 class="empty-state__title">No notes yet</h3>
      <p class="empty-state__text">Create your first note to get started.</p>
    </div>
  `;
}

function bindNotesEvents() {
    const page = document.getElementById('page-notes');

    // New note
    page.querySelector('#new-note-btn').addEventListener('click', () => {
        openNoteEditor(null);
    });

    // Click card to edit
    page.querySelector('#notes-grid').addEventListener('click', (e) => {
        const card = e.target.closest('.note-card');
        if (card) openNoteEditor(card.dataset.id);
    });

    // Filters
    const filterCat = page.querySelector('.notes__filter-category');
    const filterColor = page.querySelector('.notes__filter-color');
    const filterFav = page.querySelector('.notes__filter-fav');
    const filterPin = page.querySelector('.notes__filter-pinned');

    let favActive = false, pinActive = false;

    const applyFilters = () => {
        let notes = storage.getAllNotes();
        if (filterCat.value) notes = notes.filter(n => n.category === filterCat.value);
        if (filterColor.value) notes = notes.filter(n => n.color === filterColor.value);
        if (favActive) notes = notes.filter(n => n.favorite);
        if (pinActive) notes = notes.filter(n => n.pinned);

        const grid = page.querySelector('#notes-grid');
        grid.innerHTML = notes.length === 0 ? renderEmptyNotes() : notes.map(renderNoteCard).join('');
    };

    filterCat.addEventListener('change', applyFilters);
    filterColor.addEventListener('change', applyFilters);
    filterFav.addEventListener('click', () => { favActive = !favActive; filterFav.classList.toggle('btn--primary', favActive); filterFav.classList.toggle('btn--ghost', !favActive); applyFilters(); });
    filterPin.addEventListener('click', () => { pinActive = !pinActive; filterPin.classList.toggle('btn--primary', pinActive); filterPin.classList.toggle('btn--ghost', !pinActive); applyFilters(); });
}

function openNoteEditor(noteId) {
    const modal = document.getElementById('note-editor-modal');
    const isNew = !noteId;
    let note = isNew ? {
        id: generateId(),
        type: 'note',
        title: '',
        content: '',
        category: 'Personal',
        tags: [],
        color: '',
        favorite: false,
        pinned: false,
        archived: false,
        deleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } : storage.getNote(noteId);

    if (!note) return;
    currentNoteId = note.id;
    if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }

    // Populate fields
    modal.querySelector('.note-modal__title').value = note.title || '';
    modal.querySelector('.note-modal__body').value = note.content || '';
    modal.querySelector('.note-modal__category').value = note.category || 'Personal';
    modal.querySelector('.modal__title').textContent = isNew ? 'New Note' : 'Edit Note';

    // Color
    modal.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.color === (note.color || ''));
    });

    // Tags
    renderNoteModalTags(note.tags || []);

    // Show modal
    modal.classList.add('active');
    document.body.classList.add('modal-open');

    // Bind modal events
    const close = () => {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        currentNoteId = null;
        modal.querySelector('.note-modal__tag-input').value = '';
        document.removeEventListener('keydown', handleModalKeydown);
    };

    const handleModalKeydown = (e) => {
        if (e.key === 'Escape') close();
    };

    document.removeEventListener('keydown', handleModalKeydown);
    document.addEventListener('keydown', handleModalKeydown);

    modal.querySelector('.modal__backdrop').onclick = close;
    modal.querySelector('.modal__close').onclick = close;
    modal.querySelector('.note-modal__cancel').onclick = close;

    // Colors
    modal.querySelectorAll('.color-swatch').forEach(s => {
        s.onclick = () => {
            modal.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
            s.classList.add('active');
        };
    });

    // Tag input
    const tagInput = modal.querySelector('.note-modal__tag-input');
    tagInput.onkeydown = (e) => {
        if (e.key === 'Enter' && tagInput.value.trim()) {
            const tag = tagInput.value.trim().replace(/^#/, '');
            note.tags = note.tags || [];
            if (!note.tags.includes(tag)) {
                note.tags.push(tag);
                renderNoteModalTags(note.tags);
                storage.addTag(tag);
            }
            tagInput.value = '';
        }
    };

    // Fav / Pin / Dup / Del
    modal.querySelector('.note-modal__fav').onclick = () => {
        note.favorite = !note.favorite;
        showToast(note.favorite ? 'Favorited' : 'Unfavorited', 'success');
    };

    modal.querySelector('.note-modal__pin').onclick = () => {
        note.pinned = !note.pinned;
        showToast(note.pinned ? 'Pinned' : 'Unpinned', 'success');
    };

    modal.querySelector('.note-modal__dup').onclick = () => {
        const dup = { ...note, id: generateId(), title: (note.title || 'Untitled') + ' (copy)', createdAt: new Date().toISOString() };
        storage.createNote(dup);
        close();
        renderNotes();
        showToast('Note duplicated', 'success');
    };

    modal.querySelector('.note-modal__del').onclick = () => {
        showConfirm('Delete Note', 'Move this note to trash?', () => {
            storage.deleteNote(note.id);
            close();
            renderNotes();
            showToast('Note deleted', 'warning');
        }, 'Delete');
    };

    // Save
    modal.querySelector('.note-modal__save').onclick = () => {
        note.title = modal.querySelector('.note-modal__title').value.trim();
        note.content = modal.querySelector('.note-modal__body').value.trim();
        note.category = modal.querySelector('.note-modal__category').value;
        note.color = modal.querySelector('.color-swatch.active')?.dataset.color || '';
        note.updatedAt = new Date().toISOString();

        if (isNew) {
            storage.createNote(note);
        } else {
            storage.updateNote(note.id, note);
        }

        close();
        renderNotes();
        showToast(isNew ? 'Note created' : 'Note updated', 'success');
    };
}

function renderNoteModalTags(tags) {
    const container = document.querySelector('.note-modal__tags');
    if (!container) return;
    container.innerHTML = tags.map(t => `
    <span class="tag tag--removable" data-tag="${t}">#${t} <span class="tag__remove">×</span></span>
  `).join('');

    container.querySelectorAll('.tag__remove').forEach(btn => {
        btn.onclick = () => {
            const tag = btn.parentElement.dataset.tag;
            tags.splice(tags.indexOf(tag), 1);
            renderNoteModalTags(tags);
        };
    });
}
