// ========================================
// MindVault — Application Bootstrap
// ========================================

import * as storage from './storage.js';
import { initRouter, registerRoute, navigate } from './router.js';
import { applyTheme, applyAccentColor, applyFontSize, initSidebar } from './ui.js';
import { renderDashboard } from './dashboard.js';
import { renderJournal } from './journal.js';
import { renderNotes } from './notes.js';
import { renderCalendar } from './calendar.js';
import { renderSearch } from './search.js';
import { renderAnalytics } from './analytics.js';
import { renderSettings } from './settings.js';
import { renderAuth } from './auth.js';
import { getSupabase } from './supabaseClient.js';
import { icon } from './utils.js';

// Register routes
registerRoute('dashboard', renderDashboard);
registerRoute('journal', renderJournal);
registerRoute('notes', renderNotes);
registerRoute('calendar', renderCalendar);
registerRoute('search', renderSearch);
registerRoute('analytics', renderAnalytics);
registerRoute('settings', renderSettings);
registerRoute('auth', renderAuth);

// Initialize application
async function initApp() {
    // Hydrate local cache from Supabase before pages render.
    await storage.initRemoteStorage();

    // Apply saved settings
    const settings = storage.getSettings();
    applyTheme(settings.theme);
    applyAccentColor(settings.accentColor);
    applyFontSize(settings.fontSize);

    // Initialize sidebar
    initSidebar();

    // Bind global events
    bindGlobalEvents();

    // Initialize router
    initRouter('dashboard');

    // Setup Auth Listener
    await initAuthListener();
}

async function initAuthListener() {
    try {
        const supabase = await getSupabase();
        if (supabase) {
            const { data } = await supabase.auth.getUser();
            updateNavbarAuthButton(data?.user);

            supabase.auth.onAuthStateChange(async (event, session) => {
                const user = session?.user || null;
                await storage.handleAuthChange(user);
                updateNavbarAuthButton(user);
                
                // If settings is the active page, trigger update to reload account info card
                if (window.location.hash === '#settings') {
                    renderSettings();
                }
            });
        }
    } catch (e) {
        console.warn('Failed to initialize auth state listener:', e);
    }
}

function updateNavbarAuthButton(user) {
    const btn = document.getElementById('auth-nav-btn');
    if (!btn) return;
    if (user) {
        btn.classList.add('active');
        btn.style.color = 'var(--color-success)';
        btn.setAttribute('title', `Logged in as ${user.email}`);
    } else {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-secondary)';
        btn.setAttribute('title', 'Cloud Sync Offline');
    }
}

function bindGlobalEvents() {
    // Theme toggle in navbar
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            storage.updateSettings({ theme: newTheme });
            applyTheme(newTheme);
        });
    }

    // Auth navbar button
    const authNavBtn = document.getElementById('auth-nav-btn');
    if (authNavBtn) {
        authNavBtn.addEventListener('click', async () => {
            const supabase = await getSupabase();
            if (supabase) {
                const { data } = await supabase.auth.getUser();
                if (data?.user) {
                    navigate('settings');
                } else {
                    navigate('auth');
                }
            } else {
                navigate('auth');
            }
        });
    }

    // Navbar menu button (mobile) - toggle sidebar
    const navbarMenu = document.getElementById('navbar-menu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (navbarMenu && sidebar && overlay) {
        navbarMenu.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }

    // Close sidebar when clicking overlay
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Global search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && globalSearch.value.trim()) {
                navigate('search');
                // Set search input value after navigation
                setTimeout(() => {
                    const searchInput = document.getElementById('search-main-input');
                    if (searchInput) {
                        searchInput.value = globalSearch.value.trim();
                        searchInput.dispatchEvent(new Event('input'));
                    }
                }, 100);
            }
        });
    }

    // FAB (mobile quick action)
    const fab = document.getElementById('fab');
    if (fab) {
        fab.addEventListener('click', () => {
            navigate('journal');
        });
    }

    // Close sidebar when clicking nav items on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024 && sidebar && overlay) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });
    });
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
