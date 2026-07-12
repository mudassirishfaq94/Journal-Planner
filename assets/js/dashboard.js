// ========================================
// MindVault — Dashboard Module
// ========================================

import * as storage from './storage.js';
import { formatDate, getToday, getGreeting, icon, getMoodEmoji, truncate, getRandomQuote, wordCount } from './utils.js';
import { navigate } from './router.js';

export function renderDashboard() {
    const page = document.getElementById('page-dashboard');
    const entries = storage.getAllEntries();
    const notes = storage.getAllNotes();
    const today = getToday();
    const todayEntry = storage.getEntryByDate(today);

    const stats = computeStats(entries);
    const pinnedItems = [...storage.getPinnedEntries(), ...storage.getPinnedNotes()].slice(0, 4);
    const recentEntries = entries.slice(0, 5);
    const favoriteNotes = storage.getFavoriteNotes().slice(0, 4);
    const quote = getRandomQuote();

    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const entriesThisMonth = storage.countEntriesForMonth(now.getFullYear(), now.getMonth());

    // Total words
    let totalWords = 0;
    entries.forEach(e => { totalWords += wordCount(e.content); });

    page.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">${getGreeting()} 👋</h1>
      <p class="page-header__subtitle">${formatDate(new Date(), 'long')}</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid--dashboard stagger-children mb-lg">
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-accent-light);color:var(--color-accent)">${icon('fire', 22)}</div>
        <div class="stat-card__value">${stats.currentStreak}</div>
        <div class="stat-card__label">Day Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-secondary-light);color:var(--color-secondary)">${icon('fire', 22)}</div>
        <div class="stat-card__value">${stats.longestStreak}</div>
        <div class="stat-card__label">Longest Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-success-light);color:var(--color-success)">${icon('journal', 22)}</div>
        <div class="stat-card__value">${entriesThisMonth}</div>
        <div class="stat-card__label">Entries This Month</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-warning-light);color:var(--color-warning)">✍️</div>
        <div class="stat-card__value">${totalWords.toLocaleString()}</div>
        <div class="stat-card__label">Words Written</div>
      </div>
    </div>

    <div class="grid grid--2 mb-lg">
      <!-- Today's Journal -->
      <div class="card" style="cursor:pointer" id="dash-today-card">
        <div class="card__header">
          <span class="card__title">${icon('journal', 18)} Today's Journal</span>
          ${todayEntry?.mood ? `<span>${getMoodEmoji(todayEntry.mood)}</span>` : ''}
        </div>
        <div class="card__body">
          ${todayEntry && todayEntry.content
            ? truncate(todayEntry.content, 200)
            : '<span style="color:var(--text-muted)">No entry yet today. Click to start writing.</span>'}
        </div>
        <div class="card__footer">
          <span class="text-muted" style="font-size:var(--fs-xs)">${todayEntry ? formatDate(todayEntry.updatedAt, 'relative') : 'Start now'}</span>
        </div>
      </div>

      <!-- Quote -->
      <div class="quote-card">
        <p class="quote-card__text">"${quote.text}"</p>
        <p class="quote-card__author">— ${quote.author}</p>
      </div>
    </div>

    <!-- Pinned Items -->
    ${pinnedItems.length ? `
    <div class="mb-lg">
      <h2 style="font-size:var(--fs-md);margin-bottom:var(--sp-md)">${icon('pin', 18)} Pinned</h2>
      <div class="grid grid--auto-fill stagger-children">
        ${pinnedItems.map(item => renderDashCard(item)).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Recent Entries -->
    <div class="grid grid--2 mb-lg">
      <div>
        <h2 style="font-size:var(--fs-md);margin-bottom:var(--sp-md)">Recent Journals</h2>
        <div class="stagger-children" style="display:flex;flex-direction:column;gap:var(--sp-sm)">
          ${recentEntries.length ? recentEntries.map(entry => `
            <div class="card card--flat" style="padding:var(--sp-md);cursor:pointer" data-route="journal" data-date="${entry.date}">
              <div class="flex-between">
                <span class="card__title" style="font-size:var(--fs-sm)">${entry.title || formatDate(entry.date, 'medium')}</span>
                <span style="font-size:var(--fs-xs);color:var(--text-muted)">${getMoodEmoji(entry.mood)}</span>
              </div>
              <p class="card__body" style="margin-top:4px">${truncate(entry.content, 80)}</p>
            </div>
          `).join('') : '<p class="text-muted" style="font-size:var(--fs-sm)">No journal entries yet.</p>'}
        </div>
      </div>

      <div>
        <h2 style="font-size:var(--fs-md);margin-bottom:var(--sp-md)">Favorite Notes</h2>
        <div class="stagger-children" style="display:flex;flex-direction:column;gap:var(--sp-sm)">
          ${favoriteNotes.length ? favoriteNotes.map(note => `
            <div class="card card--flat" style="padding:var(--sp-md);cursor:pointer;border-left:3px solid ${note.color || 'var(--color-accent)'}" data-route="notes" data-note-id="${note.id}">
              <span class="card__title" style="font-size:var(--fs-sm)">${note.title || 'Untitled'}</span>
              <p class="card__body" style="margin-top:4px">${truncate(note.content, 80)}</p>
            </div>
          `).join('') : '<p class="text-muted" style="font-size:var(--fs-sm)">No favorite notes yet.</p>'}
        </div>
      </div>
    </div>
  `;

    // Bind events
    document.getElementById('dash-today-card')?.addEventListener('click', () => {
        navigate('journal', { date: today });
    });

    page.querySelectorAll('[data-route="journal"]').forEach(el => {
        el.addEventListener('click', () => navigate('journal', { date: el.dataset.date }));
    });

    page.querySelectorAll('[data-route="notes"]').forEach(el => {
        el.addEventListener('click', () => navigate('notes'));
    });
}

function renderDashCard(item) {
    const isEntry = item.type === 'journal';
    return `
    <div class="card" style="cursor:pointer" data-route="${isEntry ? 'journal' : 'notes'}" data-date="${item.date || ''}">
      <div class="flex-between" style="margin-bottom:var(--sp-xs)">
        <span class="tag">${isEntry ? 'Journal' : 'Note'}</span>
        ${item.mood ? `<span>${getMoodEmoji(item.mood)}</span>` : ''}
      </div>
      <div class="card__title" style="font-size:var(--fs-sm)">${item.title || (isEntry ? formatDate(item.date, 'medium') : 'Untitled')}</div>
      <p class="card__body" style="margin-top:4px">${truncate(item.content, 80)}</p>
    </div>
  `;
}

function computeStats(entries) {
    const dates = entries.map(e => e.date).sort().reverse();
    const uniqueDates = [...new Set(dates)];

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current streak
    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (uniqueDates.includes(dateStr)) {
            currentStreak++;
        } else if (i > 0) {
            break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
    }

    // Longest streak
    for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prev = new Date(uniqueDates[i - 1]);
            const curr = new Date(uniqueDates[i]);
            const diff = (prev - curr) / 86400000;
            tempStreak = diff === 1 ? tempStreak + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
    }

    return { currentStreak, longestStreak };
}
