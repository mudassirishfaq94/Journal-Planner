// ========================================
// MindVault — Filters Module
// ========================================
// Provides shared filter utilities used by search, notes, and other views.

import * as storage from './storage.js';
import { daysAgo, getToday } from './utils.js';

export function filterEntries(filters = {}) {
    let entries = storage.getAllEntries();

    if (filters.datePreset) {
        const today = getToday();
        switch (filters.datePreset) {
            case 'today':
                entries = entries.filter(e => e.date === today);
                break;
            case 'yesterday':
                entries = entries.filter(e => e.date === daysAgo(1));
                break;
            case 'last7':
                entries = entries.filter(e => e.date >= daysAgo(7));
                break;
            case 'last30':
                entries = entries.filter(e => e.date >= daysAgo(30));
                break;
            case 'thisMonth': {
                const now = new Date();
                const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                entries = entries.filter(e => e.date >= start);
                break;
            }
            case 'thisYear': {
                const start = `${new Date().getFullYear()}-01-01`;
                entries = entries.filter(e => e.date >= start);
                break;
            }
        }
    }

    if (filters.fromDate) entries = entries.filter(e => e.date >= filters.fromDate);
    if (filters.toDate) entries = entries.filter(e => e.date <= filters.toDate);
    if (filters.mood) entries = entries.filter(e => e.mood === filters.mood);
    if (filters.category) entries = entries.filter(e => e.category === filters.category);
    if (filters.tag) entries = entries.filter(e => (e.tags || []).includes(filters.tag));
    if (filters.favorite) entries = entries.filter(e => e.favorite);
    if (filters.pinned) entries = entries.filter(e => e.pinned);
    if (filters.archived) entries = storage.getArchivedEntries();
    if (filters.trash) entries = storage.getDeletedEntries();

    return entries;
}

export function filterNotes(filters = {}) {
    let notes = storage.getAllNotes();

    if (filters.category) notes = notes.filter(n => n.category === filters.category);
    if (filters.color) notes = notes.filter(n => n.color === filters.color);
    if (filters.tag) notes = notes.filter(n => (n.tags || []).includes(filters.tag));
    if (filters.favorite) notes = notes.filter(n => n.favorite);
    if (filters.pinned) notes = notes.filter(n => n.pinned);

    return notes;
}

export const DATE_PRESETS = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'thisYear', label: 'This Year' },
];
