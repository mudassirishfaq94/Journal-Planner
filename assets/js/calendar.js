// ========================================
// MindVault — Calendar Module
// ========================================

import * as storage from './storage.js';
import { formatDate, getDaysInMonth, getFirstDayOfMonth, icon, getToday } from './utils.js';
import { navigate } from './router.js';

let currentYear, currentMonth;

export function renderCalendar() {
    const now = new Date();
    currentYear = currentYear || now.getFullYear();
    currentMonth = currentMonth !== undefined ? currentMonth : now.getMonth();

    const page = document.getElementById('page-calendar');
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const today = getToday();
    const entries = storage.getAllEntries();
    const entryDates = new Set(entries.map(e => e.date));

    const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Build day cells
    let dayCells = '';

    // Previous month padding
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevDays = getDaysInMonth(prevYear, prevMonth);
    for (let i = firstDay - 1; i >= 0; i--) {
        dayCells += `<div class="calendar__day calendar__day--other">${prevDays - i}</div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === today;
        const hasEntry = entryDates.has(dateStr);

        let classes = 'calendar__day';
        if (isToday) classes += ' calendar__day--today';
        if (hasEntry) classes += ' calendar__day--has-entry';

        dayCells += `<div class="${classes}" data-date="${dateStr}" tabindex="0">${d}</div>`;
    }

    // Next month padding
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        dayCells += `<div class="calendar__day calendar__day--other">${i}</div>`;
    }

    page.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Calendar</h1>
      <p class="page-header__subtitle">Your writing history at a glance</p>
    </div>

    <div class="calendar animate-fade-in">
      <div class="calendar__header">
        <button class="btn btn--icon btn--ghost" id="cal-prev" aria-label="Previous month">
          ${icon('chevronLeft', 20)}
        </button>
        <h2 class="calendar__title">${monthLabel}</h2>
        <div class="flex gap-xs">
          <button class="btn btn--sm btn--secondary" id="cal-today">Today</button>
          <button class="btn btn--icon btn--ghost" id="cal-next" aria-label="Next month">
            ${icon('chevronRight', 20)}
          </button>
        </div>
      </div>

      <div class="calendar__weekdays">
        ${weekdays.map(d => `<div class="calendar__weekday">${d}</div>`).join('')}
      </div>

      <div class="calendar__grid">
        ${dayCells}
      </div>
    </div>

    <!-- Legend -->
    <div class="flex gap-lg mt-lg" style="font-size:var(--fs-xs);color:var(--text-muted)">
      <div class="flex gap-xs" style="align-items:center">
        <div style="width:10px;height:10px;border-radius:50%;background:var(--color-accent)"></div>
        <span>Has journal entry</span>
      </div>
      <div class="flex gap-xs" style="align-items:center">
        <div style="width:10px;height:10px;border-radius:50%;background:var(--color-accent-light);border:1px solid var(--color-accent)"></div>
        <span>Today</span>
      </div>
    </div>
  `;

    // Bind events
    page.querySelector('#cal-prev').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });

    page.querySelector('#cal-next').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });

    page.querySelector('#cal-today').addEventListener('click', () => {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();
        renderCalendar();
    });

    page.querySelectorAll('.calendar__day:not(.calendar__day--other)').forEach(day => {
        day.addEventListener('click', () => {
            navigate('journal', { date: day.dataset.date });
        });
    });
}
