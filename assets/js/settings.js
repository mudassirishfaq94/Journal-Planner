// ========================================
// MindVault — Settings Module
// ========================================

import * as storage from './storage.js';
import { handleAuthChange } from './storage.js';
import { getSupabase } from './supabaseClient.js';
import { navigate } from './router.js';
import { icon } from './utils.js';
import { showToast, showConfirm, applyTheme, applyAccentColor, applyFontSize } from './ui.js';

const ACCENT_COLORS = [
    { name: 'Blue', value: '#2563EB' },
    { name: 'Violet', value: '#7C3AED' },
    { name: 'Rose', value: '#E11D48' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Amber', value: '#D97706' },
    { name: 'Cyan', value: '#0891B2' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#4F46E5' },
];

export function renderSettings() {
    const page = document.getElementById('page-settings');
    const settings = storage.getSettings();

    page.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Settings</h1>
      <p class="page-header__subtitle">Customize your MindVault experience</p>
    </div>

    <!-- Appearance -->
    <div class="settings-section">
      <h3 class="settings-section__title">Appearance</h3>

      <div class="settings-row">
        <div>
          <span class="settings-row__label">Theme</span>
          <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Choose your preferred color scheme</p>
        </div>
        <div class="theme-switcher">
          <button class="theme-option ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">${icon('moon', 14)} Dark</button>
          <button class="theme-option ${settings.theme === 'light' ? 'active' : ''}" data-theme="light">${icon('sun', 14)} Light</button>
          <button class="theme-option ${settings.theme === 'system' ? 'active' : ''}" data-theme="system">System</button>
        </div>
      </div>

      <div class="settings-row">
        <div>
          <span class="settings-row__label">Accent Color</span>
          <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Personalize the app's highlight color</p>
        </div>
        <div class="color-picker">
          ${ACCENT_COLORS.map(c => `
            <button class="color-swatch ${settings.accentColor === c.value ? 'active' : ''}" 
              style="background:${c.value}" data-color="${c.value}" data-tooltip="${c.name}" aria-label="${c.name}"></button>
          `).join('')}
        </div>
      </div>

      <div class="settings-row">
        <div>
          <span class="settings-row__label">Font Size</span>
          <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Adjust text size for comfortable reading</p>
        </div>
        <div class="theme-switcher">
          <button class="theme-option font-size-opt ${settings.fontSize === 'small' ? 'active' : ''}" data-size="small">Small</button>
          <button class="theme-option font-size-opt ${settings.fontSize === 'medium' ? 'active' : ''}" data-size="medium">Medium</button>
          <button class="theme-option font-size-opt ${settings.fontSize === 'large' ? 'active' : ''}" data-size="large">Large</button>
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div class="settings-section">
      <h3 class="settings-section__title">Editor</h3>

      <div class="settings-row">
        <div>
          <span class="settings-row__label">Autosave</span>
          <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Automatically save your work as you type</p>
        </div>
        <div class="toggle ${settings.autosave ? 'active' : ''}" id="toggle-autosave" role="switch" aria-checked="${settings.autosave}" tabindex="0"></div>
      </div>
    </div>

    <!-- Data -->
    <div class="settings-section">
      <h3 class="settings-section__title">Data Management</h3>

      <div class="settings-row">
        <div>
          <span class="settings-row__label">Export Data</span>
          <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Download all your data as JSON</p>
        </div>
        <button class="btn btn--secondary" id="btn-export">${icon('download', 14)} Export</button>
      </div>

      <div class="settings-row">
        <div>
          <span class="settings-row__label">Import Data</span>
          <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Restore from a previously exported file</p>
        </div>
        <div>
          <input type="file" accept=".json" id="import-file-input" style="display:none" />
          <button class="btn btn--secondary" id="btn-import">${icon('upload', 14)} Import</button>
        </div>
      </div>

      <div class="settings-row">
        <div>
          <span class="settings-row__label" style="color:var(--color-danger)">Reset All Data</span>
          <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Permanently delete all data. This cannot be undone.</p>
        </div>
        <button class="btn btn--danger" id="btn-reset">${icon('trash', 14)} Reset</button>
      </div>
    </div>

    <!-- Cloud Sync -->
    <div class="settings-section">
      <h3 class="settings-section__title">Cloud Sync</h3>
      <div id="settings-sync-card" class="card" style="padding:var(--sp-lg)">
        <div class="skeleton" style="height:80px;border-radius:var(--radius-md)"></div>
      </div>
    </div>
  `;

    bindSettingsEvents(settings);
}

async function updateSyncCard() {
    const card = document.getElementById('settings-sync-card');
    if (!card) return;

    try {
        const supabase = await getSupabase();
        if (!supabase) {
            card.innerHTML = `
                <div style="text-align:center;padding:var(--sp-md)">
                    <p style="font-size:var(--fs-xl);margin-bottom:var(--sp-xs)">⚠️</p>
                    <p class="card__title">Cloud Offline</p>
                    <p class="card__body" style="margin-top:var(--sp-xs)">Sync services are currently unavailable. Running in local-only mode.</p>
                </div>
            `;
            return;
        }

        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
            card.innerHTML = `
                <div class="flex-between align-center" style="gap:var(--sp-md);flex-wrap:wrap">
                    <div>
                        <span class="tag" style="background:var(--color-success-light);color:var(--color-success);margin-bottom:var(--sp-xs)">☁️ Cloud Sync Active</span>
                        <p class="card__title" style="margin-top:var(--sp-2xs)">Syncing Account</p>
                        <p class="card__body" style="margin-top:2px;font-weight:var(--fw-medium);color:var(--text-primary)">${user.email}</p>
                    </div>
                    <button class="btn btn--secondary btn-sm" id="settings-btn-logout">Sign Out</button>
                </div>
            `;
            
            document.getElementById('settings-btn-logout')?.addEventListener('click', async () => {
                showConfirm('Sign Out', 'Are you sure you want to sign out? Your local data will remain cached on this device.', async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                        showToast(error.message, 'error');
                    } else {
                        showToast('Signed out successfully', 'success');
                        await handleAuthChange(null);
                        updateSyncCard();
                    }
                }, 'Sign Out');
            });
        } else {
            card.innerHTML = `
                <div style="text-align:center;padding:var(--sp-md)">
                    <p style="font-size:var(--fs-xl);margin-bottom:var(--sp-xs)">☁️</p>
                    <p class="card__title">Cloud Synchronization</p>
                    <p class="card__body" style="margin-top:var(--sp-xs);margin-bottom:var(--sp-md)">Synchronize your journal entries, notes, and settings securely to access them on any device.</p>
                    <button class="btn btn--primary btn-sm" id="settings-btn-login" style="margin: 0 auto">Sign In / Register</button>
                </div>
            `;

            document.getElementById('settings-btn-login')?.addEventListener('click', () => {
                navigate('auth');
            });
        }
    } catch (err) {
        console.error('Failed to update settings sync card:', err);
    }
}

function bindSettingsEvents(settings) {
    const page = document.getElementById('page-settings');
    updateSyncCard();

    // Theme
    page.querySelectorAll('.theme-option[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            page.querySelectorAll('.theme-option[data-theme]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const theme = btn.dataset.theme;
            storage.updateSettings({ theme });
            applyTheme(theme);
            showToast('Theme updated', 'success');
        });
    });

    // Accent Color
    page.querySelectorAll('.color-picker .color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            page.querySelectorAll('.color-picker .color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const color = swatch.dataset.color;
            storage.updateSettings({ accentColor: color });
            applyAccentColor(color);
            showToast('Accent color updated', 'success');
        });
    });

    // Font Size
    page.querySelectorAll('.font-size-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            page.querySelectorAll('.font-size-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const size = btn.dataset.size;
            storage.updateSettings({ fontSize: size });
            applyFontSize(size);
            showToast('Font size updated', 'success');
        });
    });

    // Autosave Toggle
    const autosaveToggle = page.querySelector('#toggle-autosave');
    autosaveToggle.addEventListener('click', () => {
        const isActive = autosaveToggle.classList.toggle('active');
        autosaveToggle.setAttribute('aria-checked', isActive);
        storage.updateSettings({ autosave: isActive });
        showToast(`Autosave ${isActive ? 'enabled' : 'disabled'}`, 'success');
    });

    // Export
    page.querySelector('#btn-export').addEventListener('click', () => {
        const data = storage.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindvault-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported successfully', 'success');
    });

    // Import
    const fileInput = page.querySelector('#import-file-input');
    page.querySelector('#btn-import').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                showConfirm('Import Data', 'This will merge imported data with your existing data. Continue?', () => {
                    storage.importAllData(data);
                    showToast('Data imported successfully', 'success');
                    // Reapply settings
                    const s = storage.getSettings();
                    applyTheme(s.theme);
                    applyAccentColor(s.accentColor);
                    applyFontSize(s.fontSize);
                });
            } catch {
                showToast('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    });

    // Reset
    page.querySelector('#btn-reset').addEventListener('click', () => {
        showConfirm('Reset All Data', 'This will permanently delete ALL your journals, notes, and settings. This action cannot be undone.', () => {
            storage.resetAllData();
            showToast('All data has been reset', 'warning');
            applyTheme('dark');
            applyAccentColor('#2563EB');
            applyFontSize('medium');
            window.location.reload();
        }, 'Reset Everything');
    });
}
