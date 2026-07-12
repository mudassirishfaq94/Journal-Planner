// ========================================
// MindVault — Client-side Router
// ========================================

const routes = {};
let currentRoute = null;

export function registerRoute(name, renderFn) {
    routes[name] = renderFn;
}

export function navigate(routeName, params = {}) {
    if (currentRoute === routeName && Object.keys(params).length === 0) return;

    // If leaving auth, restore the main layout (sidebar/navbar/content)
    if (currentRoute === 'auth' && routeName !== 'auth') {
        _restoreLayoutFromAuth();
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // Show target page
    const page = document.getElementById(`page-${routeName}`);
    if (page) {
        page.classList.add('active');
        page.classList.remove('page-enter');
        void page.offsetWidth; // reflow
        page.classList.add('page-enter');
    }

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === routeName);
    });

    // Call render function
    if (routes[routeName]) {
        routes[routeName](params);
    }

    currentRoute = routeName;
    window.location.hash = routeName;

    // Scroll to top
    const content = document.querySelector('.content');
    if (content) content.scrollTop = 0;
}

/** Restores sidebar/navbar/layout that auth page hides for full-screen effect */
function _restoreLayoutFromAuth() {
    const sidebar   = document.getElementById('sidebar');
    const navbar    = document.querySelector('.navbar');
    const mainEl    = document.querySelector('.main');
    const contentEl = document.querySelector('.content');
    const authPage  = document.getElementById('page-auth');

    if (sidebar)  sidebar.style.display    = '';
    if (navbar)   navbar.style.display     = '';
    if (mainEl)  { mainEl.style.marginLeft  = ''; mainEl.style.minHeight = ''; }
    if (contentEl) { contentEl.style.padding = ''; contentEl.style.display = ''; contentEl.style.minHeight = ''; }
    if (authPage) { authPage.style.maxWidth = ''; authPage.style.width = ''; authPage.style.minHeight = ''; authPage.style.margin = ''; }
}

export function getCurrentRoute() {
    return currentRoute;
}

export function initRouter(defaultRoute = 'dashboard') {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || defaultRoute;
        const [route, ...paramParts] = hash.split('/');
        const params = {};
        if (paramParts.length) params.id = paramParts.join('/');
        navigate(route, params);
    });

    // Parse initial hash
    const hash = window.location.hash.slice(1) || defaultRoute;
    const [route, ...paramParts] = hash.split('/');
    const params = {};
    if (paramParts.length) params.id = paramParts.join('/');
    navigate(route, params);
}
