// ========================================
// MindVault — Analytics Module
// ========================================

import * as storage from './storage.js';
import { icon, wordCount, formatDate, getToday } from './utils.js';

export function renderAnalytics() {
    const page = document.getElementById('page-analytics');
    const entries = storage.getAllEntries();
    const notes = storage.getAllNotes();

    const stats = computeAnalytics(entries);

    page.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Analytics</h1>
      <p class="page-header__subtitle">Insights into your writing habits</p>
    </div>

    <!-- Overview Cards -->
    <div class="grid grid--dashboard stagger-children mb-lg analytics__cards">
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-accent-light);color:var(--color-accent)">${icon('journal', 22)}</div>
        <div class="stat-card__value">${entries.length}</div>
        <div class="stat-card__label">Total Journals</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-secondary-light);color:var(--color-secondary)">${icon('notes', 22)}</div>
        <div class="stat-card__value">${notes.length}</div>
        <div class="stat-card__label">Total Notes</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-success-light);color:var(--color-success)">${icon('fire', 22)}</div>
        <div class="stat-card__value">${stats.currentStreak}</div>
        <div class="stat-card__label">Current Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-warning-light);color:var(--color-warning)">${icon('fire', 22)}</div>
        <div class="stat-card__value">${stats.longestStreak}</div>
        <div class="stat-card__label">Longest Streak</div>
      </div>
    </div>

    <div class="grid grid--dashboard stagger-children mb-lg analytics__cards">
      <div class="stat-card">
        <div class="stat-card__value">${stats.totalWords.toLocaleString()}</div>
        <div class="stat-card__label">Total Words</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${stats.avgWords}</div>
        <div class="stat-card__label">Avg Words/Entry</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${stats.mostActiveDay}</div>
        <div class="stat-card__label">Most Active Day</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${stats.mostUsedMood}</div>
        <div class="stat-card__label">Top Mood</div>
      </div>
    </div>

    <!-- Heatmap -->
    <div class="card mb-lg">
      <div class="card__header">
        <span class="card__title">Writing Activity</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">Last 52 weeks</span>
      </div>
      <div class="analytics__heatmap-container" style="overflow-x:auto">
        <div class="heatmap" id="analytics-heatmap"></div>
        <div class="flex gap-sm mt-sm" style="justify-content:flex-end;font-size:var(--fs-xs);color:var(--text-muted);align-items:center">
          <span>Less</span>
          <div style="width:12px;height:12px;border-radius:3px;background:var(--bg-input)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(37,99,235,0.2)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(37,99,235,0.4)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(37,99,235,0.6)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:var(--color-accent)"></div>
          <span>More</span>
        </div>
      </div>
    </div>

    <div class="grid grid--2 mb-lg">
      <!-- Top Tags -->
      <div class="card">
        <div class="card__header">
          <span class="card__title">Most Used Tags</span>
        </div>
        <div id="analytics-tags"></div>
      </div>

      <!-- Top Categories -->
      <div class="card">
        <div class="card__header">
          <span class="card__title">Most Used Categories</span>
        </div>
        <div id="analytics-categories"></div>
      </div>
    </div>

    <!-- Weekday Activity -->
    <div class="card mb-lg">
      <div class="card__header">
        <span class="card__title">Activity by Weekday</span>
      </div>
      <div id="analytics-weekdays" style="display:flex;gap:var(--sp-sm);align-items:flex-end;height:120px;padding:var(--sp-md) 0"></div>
    </div>
  `;

    renderHeatmap(entries);
    renderTagChart(stats.tagCounts);
    renderCategoryChart(stats.categoryCounts);
    renderWeekdayChart(stats.weekdayCounts);
}

function computeAnalytics(entries) {
    let totalWords = 0;
    const dates = [];
    const moodCounts = {};
    const tagCounts = {};
    const categoryCounts = {};
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

    entries.forEach(e => {
        const wc = wordCount(e.content);
        totalWords += wc;
        dates.push(e.date);

        if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        if (e.category) categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
        (e.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });

        const dayOfWeek = new Date(e.date).getDay();
        weekdayCounts[dayOfWeek]++;
    });

    const uniqueDates = [...new Set(dates)].sort().reverse();

    // Streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
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

    for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) { tempStreak = 1; }
        else {
            const prev = new Date(uniqueDates[i - 1]);
            const curr = new Date(uniqueDates[i]);
            const diff = (prev - curr) / 86400000;
            tempStreak = diff === 1 ? tempStreak + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Most active weekday
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const maxDayIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts));
    const mostActiveDay = weekdayCounts[maxDayIdx] > 0 ? days[maxDayIdx] : 'N/A';

    // Most used mood
    const moodEmojis = { amazing: '🤩', good: '😊', okay: '😐', bad: '😔', terrible: '😢' };
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const mostUsedMood = topMood ? `${moodEmojis[topMood[0]] || ''} ${topMood[0]}` : 'N/A';

    return {
        totalWords,
        avgWords: entries.length ? Math.round(totalWords / entries.length) : 0,
        currentStreak,
        longestStreak,
        mostActiveDay,
        mostUsedMood,
        tagCounts,
        categoryCounts,
        weekdayCounts,
    };
}

function renderHeatmap(entries) {
    const container = document.getElementById('analytics-heatmap');
    if (!container) return;

    const entryDateCounts = {};
    entries.forEach(e => {
        entryDateCounts[e.date] = (entryDateCounts[e.date] || 0) + 1;
    });

    const today = new Date();
    const weeks = 52;
    let html = '';

    // Start from the Sunday of the earliest week
    const start = new Date(today);
    start.setDate(start.getDate() - (weeks * 7) + 1 - start.getDay());

    for (let w = 0; w < weeks; w++) {
        html += '<div class="heatmap__week">';
        for (let d = 0; d < 7; d++) {
            const date = new Date(start);
            date.setDate(date.getDate() + (w * 7) + d);
            const dateStr = date.toISOString().split('T')[0];
            const count = entryDateCounts[dateStr] || 0;

            let level = '';
            if (count === 1) level = 'heatmap__day--l1';
            else if (count === 2) level = 'heatmap__day--l2';
            else if (count === 3) level = 'heatmap__day--l3';
            else if (count >= 4) level = 'heatmap__day--l4';

            const tooltip = `${formatDate(date, 'medium')}: ${count} entr${count !== 1 ? 'ies' : 'y'}`;
            html += `<div class="heatmap__day ${level}" data-tooltip="${tooltip}"></div>`;
        }
        html += '</div>';
    }

    container.innerHTML = html;
}

function renderTagChart(tagCounts) {
    const container = document.getElementById('analytics-tags');
    if (!container) return;

    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = sorted.length ? sorted[0][1] : 1;

    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size:var(--fs-sm);padding:var(--sp-md)">No tags used yet.</p>';
        return;
    }

    container.innerHTML = sorted.map(([tag, count]) => `
    <div style="display:flex;align-items:center;gap:var(--sp-sm);padding:var(--sp-xs) 0">
      <span style="font-size:var(--fs-sm);width:80px;text-align:right;color:var(--text-secondary)">#${tag}</span>
      <div style="flex:1;height:8px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden">
        <div style="width:${(count / max) * 100}%;height:100%;background:var(--color-accent);border-radius:var(--radius-full);transition:width 0.5s ease"></div>
      </div>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);width:24px">${count}</span>
    </div>
  `).join('');
}

function renderCategoryChart(categoryCounts) {
    const container = document.getElementById('analytics-categories');
    if (!container) return;

    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = sorted.length ? sorted[0][1] : 1;

    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size:var(--fs-sm);padding:var(--sp-md)">No categories used yet.</p>';
        return;
    }

    container.innerHTML = sorted.map(([cat, count]) => `
    <div style="display:flex;align-items:center;gap:var(--sp-sm);padding:var(--sp-xs) 0">
      <span style="font-size:var(--fs-sm);width:80px;text-align:right;color:var(--text-secondary)">${cat}</span>
      <div style="flex:1;height:8px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden">
        <div style="width:${(count / max) * 100}%;height:100%;background:var(--color-secondary);border-radius:var(--radius-full);transition:width 0.5s ease"></div>
      </div>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);width:24px">${count}</span>
    </div>
  `).join('');
}

function renderWeekdayChart(weekdayCounts) {
    const container = document.getElementById('analytics-weekdays');
    if (!container) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const max = Math.max(...weekdayCounts, 1);

    container.innerHTML = weekdayCounts.map((count, i) => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:var(--sp-2xs)">
      <span style="font-size:var(--fs-xs);color:var(--text-muted)">${count}</span>
      <div style="width:100%;max-width:40px;background:var(--bg-input);border-radius:var(--radius-sm);overflow:hidden;height:100%;display:flex;align-items:flex-end">
        <div style="width:100%;height:${max ? (count / max) * 100 : 0}%;background:${count === Math.max(...weekdayCounts) ? 'var(--color-accent)' : 'var(--color-accent-light)'};border-radius:var(--radius-sm);transition:height 0.5s ease;min-height:${count ? '4px' : '0'}"></div>
      </div>
      <span style="font-size:var(--fs-xs);color:var(--text-secondary)">${days[i]}</span>
    </div>
  `).join('');
}
