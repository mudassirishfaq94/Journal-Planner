// ========================================
// MindVault — Search Module
// ========================================

import * as storage from './storage.js';
import { icon, formatDate, highlightText, truncate, stripHtml, debounce, getMoodEmoji } from './utils.js';
import { navigate } from './router.js';

export function renderSearch() {
    const page = document.getElementById('page-search');
    const history = storage.getSearchHistory();
    const categories = storage.getCategories();

    page.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Search</h1>
      <p class="page-header__subtitle">Find anything in your vault</p>
    </div>

    <!-- Search Input -->
    <div class="flex gap-sm mb-lg" style="align-items:stretch">
      <div class="navbar__search" style="flex:1;min-width:0">
        <span class="navbar__search-icon">${icon('search', 18)}</span>
        <input class="navbar__search-input search__input" type="text" placeholder="Search journals, notes, tags..." aria-label="Search" id="search-main-input" />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-sm mb-lg search__filters" style="flex-wrap:wrap">
      <select class="input search__filter-type" style="width:auto;padding:6px 30px 6px 10px" aria-label="Type">
        <option value="">All Types</option>
        <option value="journal">Journals</option>
        <option value="note">Notes</option>
      </select>
      <select class="input search__filter-category" style="width:auto;padding:6px 30px 6px 10px" aria-label="Category">
        <option value="">All Categories</option>
        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select class="input search__filter-mood" style="width:auto;padding:6px 30px 6px 10px" aria-label="Mood">
        <option value="">All Moods</option>
        <option value="amazing">🤩 Amazing</option>
        <option value="good">😊 Good</option>
        <option value="okay">😐 Okay</option>
        <option value="bad">😔 Bad</option>
        <option value="terrible">😢 Terrible</option>
      </select>
      <select class="input search__filter-sort" style="width:auto;padding:6px 30px 6px 10px" aria-label="Sort">
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>
      <input type="date" class="input search__filter-from" style="width:auto" aria-label="From date" />
      <input type="date" class="input search__filter-to" style="width:auto" aria-label="To date" />
    </div>

    <!-- Search History -->
    <div id="search-history" class="mb-lg" ${history.length ? '' : 'style="display:none"'}>
      <div class="flex-between mb-sm">
        <span style="font-size:var(--fs-sm);color:var(--text-muted)">Recent Searches</span>
        <button class="btn btn--ghost btn--sm" id="clear-search-history">Clear</button>
      </div>
      <div class="flex gap-xs" style="flex-wrap:wrap">
        ${history.map(h => `<button class="btn btn--secondary btn--sm search-history-item">${h}</button>`).join('')}
      </div>
    </div>

    <!-- Results -->
    <div id="search-results" class="search-results"></div>
    <div id="search-empty" class="empty-state" style="display:none">
      <div class="empty-state__icon">🔍</div>
      <h3 class="empty-state__title">No results found</h3>
      <p class="empty-state__text">Try different keywords or adjust your filters.</p>
    </div>
  `;

    const searchInput = page.querySelector('#search-main-input');
    const resultsEl = page.querySelector('#search-results');
    const emptyEl = page.querySelector('#search-empty');
    const historyEl = page.querySelector('#search-history');

    const doSearch = debounce(() => {
        const query = searchInput.value.trim();
        const type = page.querySelector('.search__filter-type').value;
        const category = page.querySelector('.search__filter-category').value;
        const mood = page.querySelector('.search__filter-mood').value;
        const sort = page.querySelector('.search__filter-sort').value;
        const fromDate = page.querySelector('.search__filter-from').value;
        const toDate = page.querySelector('.search__filter-to').value;

        if (!query && !type && !category && !mood && !fromDate && !toDate) {
            resultsEl.innerHTML = '';
            emptyEl.style.display = 'none';
            return;
        }

        if (query) {
            storage.addSearchHistory(query);
        }

        let results = [
            ...storage.getAllEntries().map(e => ({ ...e, _type: 'journal' })),
            ...storage.getAllNotes().map(n => ({ ...n, _type: 'note' })),
        ];

        // Filter by type
        if (type) results = results.filter(r => r._type === type);

        // Filter by category
        if (category) results = results.filter(r => r.category === category);

        // Filter by mood
        if (mood) results = results.filter(r => r.mood === mood);

        // Filter by date range
        if (fromDate) results = results.filter(r => (r.date || r.createdAt?.split('T')[0]) >= fromDate);
        if (toDate) results = results.filter(r => (r.date || r.createdAt?.split('T')[0]) <= toDate);

        // Filter by query text
        if (query) {
            const lower = query.toLowerCase();
            results = results.filter(r => {
                const title = (r.title || '').toLowerCase();
                const body = stripHtml(r.content || '').toLowerCase();
                const tags = (r.tags || []).join(' ').toLowerCase();
                const cat = (r.category || '').toLowerCase();
                return title.includes(lower) || body.includes(lower) || tags.includes(lower) || cat.includes(lower);
            });
        }

        // Sort
        results.sort((a, b) => {
            const da = a.date || a.createdAt;
            const db = b.date || b.createdAt;
            return sort === 'oldest' ? da.localeCompare(db) : db.localeCompare(da);
        });

        // Render
        if (results.length === 0) {
            resultsEl.innerHTML = '';
            emptyEl.style.display = '';
        } else {
            emptyEl.style.display = 'none';
            resultsEl.innerHTML = results.map(r => {
                const snippet = truncate(r.content, 200);
                const highlighted = query ? highlightText(snippet, query) : snippet;
                const titleText = r.title || (r._type === 'journal' ? formatDate(r.date, 'medium') : 'Untitled Note');
                const highlightedTitle = query ? highlightText(titleText, query) : titleText;

                return `
          <div class="search-result" data-type="${r._type}" data-id="${r.id}" data-date="${r.date || ''}">
            <div class="search-result__title">${highlightedTitle}</div>
            <div class="search-result__snippet">${highlighted}</div>
            <div class="search-result__meta">
              <span class="tag" style="font-size:10px">${r._type === 'journal' ? 'Journal' : 'Note'}</span>
              ${r.mood ? `<span>${getMoodEmoji(r.mood)}</span>` : ''}
              <span>${r.category || ''}</span>
              <span>${formatDate(r.date || r.createdAt, 'medium')}</span>
            </div>
          </div>
        `;
            }).join('');
        }

        historyEl.style.display = 'none';
    }, 200);

    searchInput.addEventListener('input', doSearch);
    page.querySelectorAll('.search__filter-type, .search__filter-category, .search__filter-mood, .search__filter-sort, .search__filter-from, .search__filter-to')
        .forEach(el => el.addEventListener('change', doSearch));

    // Search history clicks
    page.querySelectorAll('.search-history-item').forEach(btn => {
        btn.addEventListener('click', () => {
            searchInput.value = btn.textContent;
            doSearch();
        });
    });

    page.querySelector('#clear-search-history')?.addEventListener('click', () => {
        storage.clearSearchHistory();
        historyEl.style.display = 'none';
    });

    // Click results
    resultsEl.addEventListener('click', (e) => {
        const result = e.target.closest('.search-result');
        if (!result) return;
        if (result.dataset.type === 'journal') {
            navigate('journal', { date: result.dataset.date });
        } else {
            navigate('notes');
        }
    });

    // Focus input
    searchInput.focus();
}
