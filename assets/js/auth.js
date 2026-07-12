// ========================================
// MindVault — Authentication Module
// ========================================

import { getSupabase } from './supabaseClient.js';
import { handleAuthChange } from './storage.js';
import { showToast } from './ui.js';
import { navigate } from './router.js';

export function renderAuth(params = {}) {
    const page = document.getElementById('page-auth');
    if (!page) return;

    const mode = params.mode || 'login';

    // Hide sidebar + navbar for immersive auth experience
    const sidebar = document.getElementById('sidebar');
    const navbar  = document.querySelector('.navbar');
    if (sidebar) sidebar.style.display = 'none';
    if (navbar)  navbar.style.display  = 'none';

    // Make the page fill the full remaining space
    const mainEl = document.querySelector('.main');
    if (mainEl) {
        mainEl.style.marginLeft = '0';
        mainEl.style.minHeight  = '100dvh';
    }
    const contentEl = document.querySelector('.content');
    if (contentEl) {
        contentEl.style.padding  = '0';
        contentEl.style.display  = 'flex';
        contentEl.style.minHeight = '100dvh';
    }

    page.style.maxWidth  = 'none';
    page.style.width     = '100%';
    page.style.minHeight = '100dvh';
    page.style.margin    = '0';

    page.innerHTML = `
    <div id="auth-root" style="
        min-height: 100dvh;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 70%, #1a0a2e 100%);
        background-size: 400% 400%;
        animation: authBgShift 14s ease infinite;
    ">
        <!-- Ambient orbs -->
        <div style="
            position: absolute; width: 380px; height: 380px; border-radius: 50%;
            background: radial-gradient(circle, rgba(79,70,229,0.45) 0%, transparent 70%);
            top: -120px; left: -100px; filter: blur(55px); pointer-events: none;
            animation: authOrbFloat 9s ease-in-out infinite;
        "></div>
        <div style="
            position: absolute; width: 300px; height: 300px; border-radius: 50%;
            background: radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%);
            bottom: -80px; right: -60px; filter: blur(55px); pointer-events: none;
            animation: authOrbFloat 9s ease-in-out infinite; animation-delay: -4s;
        "></div>
        <!-- Dot grid overlay -->
        <div style="
            position: absolute; inset: 0; pointer-events: none;
            background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px);
            background-size: 28px 28px;
        "></div>

        <!-- Card -->
        <div id="auth-card" style="
            position: relative; z-index: 10;
            width: 100%; max-width: 400px;
            background: rgba(15, 23, 42, 0.82);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(99,102,241,0.25);
            border-radius: 20px;
            box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.1);
            padding: 2rem;
            animation: authSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
        ">
            <!-- Top shimmer line -->
            <div style="
                position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
                background: linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(139,92,246,0.7), transparent);
                border-radius: 1px;
            "></div>

            <!-- Header -->
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <!-- Logo pill -->
                <div style="
                    display: inline-flex; align-items: center; gap: 0.5rem;
                    background: linear-gradient(135deg, rgba(79,70,229,0.25), rgba(124,58,237,0.25));
                    border: 1px solid rgba(99,102,241,0.35);
                    border-radius: 999px; padding: 0.375rem 0.875rem;
                    margin-bottom: 0.875rem;
                ">
                    <img src="assets/img/logo.png" alt="Lumina" style="width:20px;height:20px;border-radius:5px;object-fit:cover;">
                    <span style="font-size:0.75rem;font-weight:600;color:rgba(165,180,252,0.9);letter-spacing:0.04em;">LUMINA</span>
                </div>
                <h1 style="
                    font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;
                    margin-bottom: 0.25rem;
                    background: linear-gradient(135deg, #f1f5f9 20%, #a5b4fc 80%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                ">Welcome back</h1>
                <p style="font-size: 0.75rem; color: rgba(148,163,184,0.7); line-height: 1.4;">
                    Sign in to sync your journal across all devices
                </p>
            </div>

            <!-- Tab switcher -->
            <div style="
                display: flex; background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 10px; padding: 3px; gap: 3px; margin-bottom: 1.25rem;
            ">
                <button id="tab-login" onclick="window._authSwitchTab('login')" style="
                    flex:1; padding: 0.4375rem; border: none; border-radius: 8px;
                    font-size: 0.8125rem; font-weight: 600; cursor: pointer;
                    transition: all 0.2s ease; font-family: inherit;
                    background: ${mode === 'login' ? 'linear-gradient(135deg,#4f46e5,#6d28d9)' : 'transparent'};
                    color: ${mode === 'login' ? '#fff' : 'rgba(148,163,184,0.8)'};
                    box-shadow: ${mode === 'login' ? '0 2px 10px rgba(79,70,229,0.45)' : 'none'};
                ">Sign In</button>
                <button id="tab-signup" onclick="window._authSwitchTab('signup')" style="
                    flex:1; padding: 0.4375rem; border: none; border-radius: 8px;
                    font-size: 0.8125rem; font-weight: 600; cursor: pointer;
                    transition: all 0.2s ease; font-family: inherit;
                    background: ${mode === 'signup' ? 'linear-gradient(135deg,#4f46e5,#6d28d9)' : 'transparent'};
                    color: ${mode === 'signup' ? '#fff' : 'rgba(148,163,184,0.8)'};
                    box-shadow: ${mode === 'signup' ? '0 2px 10px rgba(79,70,229,0.45)' : 'none'};
                ">Create Account</button>
            </div>

            <!-- Error -->
            <div id="auth-error" style="
                display: none; margin-bottom: 0.875rem;
                padding: 0.5625rem 0.75rem;
                background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
                border-radius: 8px; color: #fca5a5; font-size: 0.75rem; line-height: 1.4;
            "></div>

            <!-- Form -->
            <form id="auth-form" style="display:flex; flex-direction:column; gap:0.75rem;">

                <!-- Email -->
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                    <label for="auth-email" style="font-size:0.6875rem;font-weight:600;color:rgba(203,213,225,0.85);letter-spacing:0.06em;text-transform:uppercase;">Email</label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:rgba(148,163,184,0.5);display:flex;pointer-events:none;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </span>
                        <input type="email" id="auth-email" placeholder="you@example.com" autocomplete="email" required
                            style="
                                width:100%; box-sizing:border-box;
                                padding: 0.5625rem 0.75rem 0.5625rem 2.375rem;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 9px; color: #f1f5f9;
                                font-size: 0.8125rem; font-family: inherit; outline: none;
                                transition: border-color 0.2s, box-shadow 0.2s;
                            "
                            onfocus="this.style.borderColor='rgba(99,102,241,0.6)';this.style.boxShadow='0 0 0 3px rgba(79,70,229,0.18)'"
                            onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'"
                        >
                    </div>
                </div>

                <!-- Password -->
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                    <label for="auth-password" style="font-size:0.6875rem;font-weight:600;color:rgba(203,213,225,0.85);letter-spacing:0.06em;text-transform:uppercase;">Password</label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:rgba(148,163,184,0.5);display:flex;pointer-events:none;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </span>
                        <input type="password" id="auth-password" placeholder="Min. 6 characters" minlength="6" required
                            autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"
                            style="
                                width:100%; box-sizing:border-box;
                                padding: 0.5625rem 0.75rem 0.5625rem 2.375rem;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 9px; color: #f1f5f9;
                                font-size: 0.8125rem; font-family: inherit; outline: none;
                                transition: border-color 0.2s, box-shadow 0.2s;
                            "
                            onfocus="this.style.borderColor='rgba(99,102,241,0.6)';this.style.boxShadow='0 0 0 3px rgba(79,70,229,0.18)'"
                            onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'"
                        >
                    </div>
                </div>

                <!-- Confirm password (signup only) -->
                <div id="confirm-wrap" style="display:${mode === 'signup' ? 'flex' : 'none'};flex-direction:column;gap:0.25rem;">
                    <label for="auth-confirm" style="font-size:0.6875rem;font-weight:600;color:rgba(203,213,225,0.85);letter-spacing:0.06em;text-transform:uppercase;">Confirm Password</label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:rgba(148,163,184,0.5);display:flex;pointer-events:none;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </span>
                        <input type="password" id="auth-confirm" placeholder="Re-enter password" minlength="6"
                            autocomplete="new-password"
                            style="
                                width:100%; box-sizing:border-box;
                                padding: 0.5625rem 0.75rem 0.5625rem 2.375rem;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 9px; color: #f1f5f9;
                                font-size: 0.8125rem; font-family: inherit; outline: none;
                                transition: border-color 0.2s, box-shadow 0.2s;
                            "
                            onfocus="this.style.borderColor='rgba(99,102,241,0.6)';this.style.boxShadow='0 0 0 3px rgba(79,70,229,0.18)'"
                            onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'"
                        >
                    </div>
                </div>

                <!-- Submit -->
                <button type="submit" id="auth-submit" style="
                    width:100%; padding: 0.6875rem;
                    background: linear-gradient(135deg, #4f46e5, #6d28d9);
                    border: none; border-radius: 10px;
                    color: #fff; font-size: 0.875rem; font-weight: 600;
                    font-family: inherit; cursor: pointer; margin-top: 0.25rem;
                    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                    box-shadow: 0 4px 18px rgba(79,70,229,0.45);
                    transition: transform 0.15s, box-shadow 0.15s; position: relative; overflow: hidden;
                " onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 8px 26px rgba(79,70,229,0.55)'"
                   onmouseout="this.style.transform='';this.style.boxShadow='0 4px 18px rgba(79,70,229,0.45)'"
                >
                    <span id="auth-spinner" style="
                        display:none; width:14px;height:14px;
                        border:2px solid rgba(255,255,255,0.3);
                        border-top-color:#fff; border-radius:50%;
                        animation: authSpin 0.7s linear infinite;
                    "></span>
                    <span id="auth-btn-text">${mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                </button>
            </form>

            <!-- Divider -->
            <div style="display:flex;align-items:center;gap:0.625rem;margin: 1rem 0 0.875rem;">
                <div style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></div>
                <span style="font-size:0.6875rem;color:rgba(100,116,139,0.6);white-space:nowrap;">or</span>
                <div style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></div>
            </div>

            <!-- Offline -->
            <button id="auth-offline-btn" style="
                width:100%; padding: 0.5625rem;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px; color: rgba(148,163,184,0.8);
                font-size: 0.75rem; font-weight: 500; font-family: inherit;
                cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                transition: background 0.2s, color 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.color='#f1f5f9'"
               onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.color='rgba(148,163,184,0.8)'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                Continue offline (local only)
            </button>

            <!-- Footer -->
            <p style="text-align:center;margin-top:0.875rem;font-size:0.625rem;color:rgba(100,116,139,0.45);line-height:1.4;">
                🔒 Data encrypted &amp; synced securely
            </p>
        </div>
    </div>

    <style>
        @keyframes authBgShift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes authOrbFloat {
            0%, 100% { transform: translateY(0) scale(1); }
            50%       { transform: translateY(-25px) scale(1.04); }
        }
        @keyframes authSlideUp {
            from { opacity: 0; transform: translateY(28px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authSpin {
            to { transform: rotate(360deg); }
        }
        #auth-email::placeholder,
        #auth-password::placeholder,
        #auth-confirm::placeholder { color: rgba(100,116,139,0.55); }
    </style>
    `;

    bindAuthEvents(mode);
}

function restoreLayout() {
    const sidebar   = document.getElementById('sidebar');
    const navbar    = document.querySelector('.navbar');
    const mainEl    = document.querySelector('.main');
    const contentEl = document.querySelector('.content');
    const page      = document.getElementById('page-auth');

    if (sidebar) sidebar.style.display = '';
    if (navbar)  navbar.style.display  = '';
    if (mainEl) { mainEl.style.marginLeft = ''; mainEl.style.minHeight = ''; }
    if (contentEl) { contentEl.style.padding = ''; contentEl.style.display = ''; contentEl.style.minHeight = ''; }
    if (page) { page.style.maxWidth = ''; page.style.width = ''; page.style.minHeight = ''; page.style.margin = ''; }
}

function bindAuthEvents(initialMode) {
    let currentMode = initialMode;

    // Expose tab switcher globally (used in onclick attributes)
    window._authSwitchTab = (newMode) => {
        if (newMode === currentMode) return;
        currentMode = newMode;

        const loginTab  = document.getElementById('tab-login');
        const signupTab = document.getElementById('tab-signup');
        const confirmW  = document.getElementById('confirm-wrap');
        const btnText   = document.getElementById('auth-btn-text');

        const activeStyle   = 'linear-gradient(135deg,#4f46e5,#6d28d9)';
        const inactiveStyle = 'transparent';

        if (loginTab) {
            loginTab.style.background  = currentMode === 'login' ? activeStyle : inactiveStyle;
            loginTab.style.color       = currentMode === 'login' ? '#fff' : 'rgba(148,163,184,0.8)';
            loginTab.style.boxShadow   = currentMode === 'login' ? '0 2px 10px rgba(79,70,229,0.45)' : 'none';
        }
        if (signupTab) {
            signupTab.style.background = currentMode === 'signup' ? activeStyle : inactiveStyle;
            signupTab.style.color      = currentMode === 'signup' ? '#fff' : 'rgba(148,163,184,0.8)';
            signupTab.style.boxShadow  = currentMode === 'signup' ? '0 2px 10px rgba(79,70,229,0.45)' : 'none';
        }
        if (confirmW) confirmW.style.display = currentMode === 'signup' ? 'flex' : 'none';
        if (btnText)  btnText.textContent = currentMode === 'login' ? 'Sign In' : 'Create Account';

        hideError();
    };

    // Offline button
    document.getElementById('auth-offline-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        restoreLayout();
        navigate('dashboard');
    });

    // Form submit
    document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email    = document.getElementById('auth-email')?.value.trim();
        const password = document.getElementById('auth-password')?.value;

        if (!email || !password) { showError('Please fill in all fields.'); return; }
        if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }

        if (currentMode === 'signup') {
            const confirm = document.getElementById('auth-confirm')?.value;
            if (password !== confirm) { showError('Passwords do not match.'); return; }
        }

        setLoading(true);
        try {
            const supabase = await getSupabase();
            if (!supabase) throw new Error('Cloud services unavailable. Use offline mode instead.');

            const authResult = currentMode === 'login'
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });

            const { data, error } = authResult;
            if (error) throw error;

            if (currentMode === 'signup' && data.session === null) {
                showToast('Account created! Check your email to confirm.', 'success');
                window._authSwitchTab('login');
                return;
            }

            showToast(
                currentMode === 'login'
                    ? `Welcome back, ${data.user?.email?.split('@')[0]}! ☁️`
                    : 'Account created and logged in!',
                'success'
            );

            if (data.user) await handleAuthChange(data.user);
            restoreLayout();
            navigate('dashboard');

        } catch (err) {
            console.error('Auth error:', err);
            showError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(on) {
        const btn     = document.getElementById('auth-submit');
        const spinner = document.getElementById('auth-spinner');
        const text    = document.getElementById('auth-btn-text');
        if (!btn) return;
        btn.disabled = on;
        btn.style.opacity = on ? '0.7' : '1';
        if (spinner) spinner.style.display = on ? 'block' : 'none';
        if (text)    text.textContent = on
            ? (currentMode === 'login' ? 'Signing in…' : 'Creating account…')
            : (currentMode === 'login' ? 'Sign In'     : 'Create Account');
    }

    function showError(msg) {
        const el = document.getElementById('auth-error');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function hideError() {
        const el = document.getElementById('auth-error');
        if (el) el.style.display = 'none';
    }
}
