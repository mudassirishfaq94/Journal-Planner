// ========================================
// MindVault — UI Helpers
// ========================================

import { icon } from './utils.js';

// ---- Toast Notifications ----

let toastContainer;

function ensureToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.setAttribute('role', 'status');
        toastContainer.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastContainer);
    }
}

const TOAST_ICONS = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
};

export function showToast(message, type = 'info', duration = 3000) {
    ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
    <span class="toast__icon">${TOAST_ICONS[type]}</span>
    <span class="toast__message">${message}</span>
    <button class="toast__close" aria-label="Close">${icon('x', 14)}</button>
  `;

    toast.querySelector('.toast__close').addEventListener('click', () => removeToast(toast));
    toastContainer.appendChild(toast);

    setTimeout(() => removeToast(toast), duration);
    return toast;
}

function removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
}

// ---- Confirm Modal ----

export function showConfirm(title, message, onConfirm, confirmText = 'Confirm') {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
    <div class="modal__backdrop"></div>
    <div class="modal__content animate-scale-in">
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
        <button class="modal__close" aria-label="Close">${icon('x', 18)}</button>
      </div>
      <p class="card__body">${message}</p>
      <div class="modal__footer">
        <button class="btn btn--secondary modal__cancel-btn">Cancel</button>
        <button class="btn btn--danger modal__confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;

    const close = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 250);
    };

    modal.querySelector('.modal__backdrop').addEventListener('click', close);
    modal.querySelector('.modal__close').addEventListener('click', close);
    modal.querySelector('.modal__cancel-btn').addEventListener('click', close);
    modal.querySelector('.modal__confirm-btn').addEventListener('click', () => {
        onConfirm();
        close();
    });

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
}

// ---- Prompt Modal ----

export function showPrompt(title, placeholder, onSubmit, defaultValue = '') {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
    <div class="modal__backdrop"></div>
    <div class="modal__content animate-scale-in">
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
        <button class="modal__close" aria-label="Close">${icon('x', 18)}</button>
      </div>
      <input class="input mt-md" type="text" placeholder="${placeholder}" value="${defaultValue}" />
      <div class="modal__footer">
        <button class="btn btn--secondary modal__cancel-btn">Cancel</button>
        <button class="btn btn--primary modal__submit-btn">Submit</button>
      </div>
    </div>
  `;

    const close = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 250);
    };

    const input = modal.querySelector('.input');

    modal.querySelector('.modal__backdrop').addEventListener('click', close);
    modal.querySelector('.modal__close').addEventListener('click', close);
    modal.querySelector('.modal__cancel-btn').addEventListener('click', close);
    modal.querySelector('.modal__submit-btn').addEventListener('click', () => {
        const val = input.value.trim();
        if (val) {
            onSubmit(val);
            close();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if (val) { onSubmit(val); close(); }
        }
    });

    document.body.appendChild(modal);
    requestAnimationFrame(() => {
        modal.classList.add('active');
        input.focus();
    });
}

// ---- Ripple Effect ----

export function addRipple(element) {
    element.addEventListener('click', (e) => {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        ripple.className = 'ripple__wave';
        element.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}

// ---- Sidebar Toggle ----

export function initSidebar() {
    const hamburger = document.querySelector('.navbar__hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Close sidebar on nav item click (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });
    });
}

// ---- Theme Toggle ----

export function applyTheme(theme) {
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const btn = document.querySelector('.navbar__theme-toggle');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark ? icon('sun', 20) : icon('moon', 20);
}

export function applyAccentColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--color-accent', color);
    root.style.setProperty('--color-accent-hover', color);
    root.style.setProperty('--color-accent-light', color + '26');
    root.style.setProperty('--shadow-glow', `0 0 20px ${color}4D`);
}

export function applyFontSize(size) {
    const sizes = { small: '87.5%', medium: '100%', large: '112.5%' };
    document.documentElement.style.fontSize = sizes[size] || '100%';
}

// ---- Skeleton Loader Helper ----

export function skeleton(type = 'card', count = 1) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(`<div class="skeleton skeleton--${type}"></div>`);
    }
    return skeletons.join('');
}

// ---- Set page title ----
export function setPageHeader(title, subtitle = '') {
    const header = document.querySelector('.page.active .page-header');
    if (header) {
        header.querySelector('.page-header__title').textContent = title;
        const sub = header.querySelector('.page-header__subtitle');
        if (sub) sub.textContent = subtitle;
    }
}
