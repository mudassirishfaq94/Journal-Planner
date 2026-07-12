// ========================================
// MindVault — Rich Text Editor
// ========================================

import { icon } from './utils.js';

export class Editor {
    constructor(container, options = {}) {
        this.container = container;
        this.onChange = options.onChange || (() => { });
        this.placeholder = options.placeholder || 'Start writing...';
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
      <div class="editor">
        <div class="editor__toolbar" role="toolbar" aria-label="Text formatting">
          <button class="editor__toolbar-btn" data-cmd="undo" data-tooltip="Undo">${icon('undo', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="redo" data-tooltip="Redo">${icon('redo', 16)}</button>
          <div class="editor__toolbar-divider"></div>
          <button class="editor__toolbar-btn" data-cmd="bold" data-tooltip="Bold">${icon('bold', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="italic" data-tooltip="Italic">${icon('italic', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="underline" data-tooltip="Underline">${icon('underline', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="strikeThrough" data-tooltip="Strikethrough">${icon('strikethrough', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="hiliteColor" data-tooltip="Highlight">${icon('highlight', 16)}</button>
          <div class="editor__toolbar-divider"></div>
          <button class="editor__toolbar-btn" data-cmd="formatBlock" data-value="blockquote" data-tooltip="Quote">${icon('quote', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="formatBlock" data-value="pre" data-tooltip="Code Block">${icon('code', 16)}</button>
          <div class="editor__toolbar-divider"></div>
          <button class="editor__toolbar-btn" data-cmd="insertUnorderedList" data-tooltip="Bullet List">${icon('listBullet', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="insertOrderedList" data-tooltip="Numbered List">${icon('listOrdered', 16)}</button>
          <button class="editor__toolbar-btn" data-cmd="checklist" data-tooltip="Checklist">${icon('checklist', 16)}</button>
          <div class="editor__toolbar-divider"></div>
          <button class="editor__toolbar-btn" data-cmd="createLink" data-tooltip="Insert Link">${icon('link', 16)}</button>
        </div>
        <div class="editor__content" contenteditable="true" data-placeholder="${this.placeholder}" role="textbox" aria-multiline="true" aria-label="Journal content"></div>
        <div class="editor__footer">
          <span class="editor__word-count">0 words</span>
          <span class="editor__reading-time">< 1 min read</span>
        </div>
      </div>
    `;

        this.editorEl = this.container.querySelector('.editor__content');
        this.wordCountEl = this.container.querySelector('.editor__word-count');
        this.readingTimeEl = this.container.querySelector('.editor__reading-time');
        this.toolbarEl = this.container.querySelector('.editor__toolbar');
    }

    bindEvents() {
        // Toolbar buttons
        this.toolbarEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.editor__toolbar-btn');
            if (!btn) return;

            const cmd = btn.dataset.cmd;
            const value = btn.dataset.value || null;

            e.preventDefault();

            if (cmd === 'hiliteColor') {
                document.execCommand('hiliteColor', false, '#FACC1566');
            } else if (cmd === 'checklist') {
                this.insertChecklist();
            } else if (cmd === 'createLink') {
                const url = prompt('Enter URL:');
                if (url) document.execCommand('createLink', false, url);
            } else if (cmd === 'formatBlock') {
                document.execCommand('formatBlock', false, value);
            } else {
                document.execCommand(cmd, false, value);
            }

            this.editorEl.focus();
            this.updateStats();
            this.onChange(this.getContent());
        });

        // Content changes
        this.editorEl.addEventListener('input', () => {
            this.updateStats();
            this.onChange(this.getContent());
        });

        // Markdown shortcuts
        this.editorEl.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
            }

            // Ctrl shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b': e.preventDefault(); document.execCommand('bold'); break;
                    case 'i': e.preventDefault(); document.execCommand('italic'); break;
                    case 'u': e.preventDefault(); document.execCommand('underline'); break;
                }
            }
        });

        // Active state tracking
        this.editorEl.addEventListener('mouseup', () => this.updateToolbarState());
        this.editorEl.addEventListener('keyup', () => this.updateToolbarState());
    }

    insertChecklist() {
        const html = `<div class="checklist-item"><input type="checkbox" /><span>New item</span></div>`;
        document.execCommand('insertHTML', false, html);
    }

    updateToolbarState() {
        const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
        commands.forEach(cmd => {
            const btn = this.toolbarEl.querySelector(`[data-cmd="${cmd}"]`);
            if (btn) {
                btn.classList.toggle('active', document.queryCommandState(cmd));
            }
        });
    }

    updateStats() {
        const text = this.editorEl.innerText || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const minutes = Math.ceil(words / 200);
        this.wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        this.readingTimeEl.textContent = minutes < 1 ? '< 1 min read' : `${minutes} min read`;
    }

    getContent() {
        return this.editorEl.innerHTML;
    }

    setContent(html) {
        this.editorEl.innerHTML = html || '';
        this.updateStats();
    }

    getWordCount() {
        const text = this.editorEl.innerText || '';
        return text.trim() ? text.trim().split(/\s+/).length : 0;
    }

    focus() {
        this.editorEl.focus();
    }

    clear() {
        this.editorEl.innerHTML = '';
        this.updateStats();
    }
}
