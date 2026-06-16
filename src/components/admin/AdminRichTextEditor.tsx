import DOMPurify from 'dompurify';
import { useEditor, EditorContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import ImageExt from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Quote,
    Image as ImageIcon, Youtube as YoutubeIcon, Link as LinkIcon,
    Heading1, Heading2, Heading3,
    Undo, Redo, Code, Eye, Columns,
    Maximize2, Minimize2, FileCode, FileText, Minus,
    Palette, Highlighter, TableIcon, AlertCircle,
    Info, AlertTriangle, Lightbulb, ShieldAlert, CodeXml,
    Type, ChevronDown, PanelBottom
} from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════
   CUSTOM TIPTAP EXTENSIONS
   ═══════════════════════════════════════════════════════ */

const CALLOUT_STYLES: Record<string, { bg: string; border: string; label: string; emoji: string }> = {
    info: { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', label: 'Info', emoji: 'ℹ️' },
    warning: { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', label: 'Warning', emoji: '⚠️' },
    tip: { bg: 'rgba(16,185,129,0.08)', border: '#10b981', label: 'Tip', emoji: '💡' },
    danger: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444', label: 'Danger', emoji: '🚨' },
};

const CalloutExtension = Node.create({
    name: 'callout',
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'info',
                parseHTML: (el: HTMLElement) => el.getAttribute('data-callout-type') || 'info',
                renderHTML: (attrs: Record<string, any>) => ({ 'data-callout-type': attrs.type }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-callout]' }];
    },

    renderHTML({ node }: { node: any }) {
        const type = node.attrs.type as string;
        const s = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;
        return ['div', {
            'data-callout': '',
            'data-callout-type': type,
            style: `background:${s.bg};border-left:4px solid ${s.border};padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;`,
        }, 0];
    },
});

const StyledContainer = Node.create({
    name: 'styledContainer',
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            variant: {
                default: 'card',
                parseHTML: (el: HTMLElement) => el.getAttribute('data-container') || 'card',
                renderHTML: (attrs: Record<string, any>) => ({ 'data-container': attrs.variant }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-container]' }];
    },

    renderHTML({ node }: { node: any }) {
        const variant = node.attrs.variant;
        const styles: Record<string, string> = {
            card: 'background:var(--bg-elev-1,#1a1a2e);border:1px solid var(--divider,#333);border-radius:12px;padding:24px;margin:16px 0;',
            highlight: 'background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.1));border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:24px;margin:16px 0;',
            steps: 'background:var(--bg-elev-1,#1a1a2e);border-left:3px solid var(--brand,#6366f1);border-radius:0 8px 8px 0;padding:20px 24px;margin:16px 0;',
        };
        return ['div', {
            'data-container': variant,
            style: styles[variant] || styles.card,
        }, 0];
    },
});

/* ═══════════════════════════════════════════════════════
   TYPES & HELPERS
   ═══════════════════════════════════════════════════════ */

interface AdminRichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    className?: string;
    placeholder?: string;
}

type EditorMode = 'visual' | 'html' | 'preview';

const detectAdvancedHtml = (v: string) =>
    !!v && ((v.includes('<div') && v.includes('style=')) || v.includes('grid-template') || v.includes('var(--'));

const SANITIZE_CFG = {
    ADD_TAGS: ['iframe', 'style', 'div', 'details', 'summary', 'video', 'source', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'class', 'target', 'open', 'controls', 'autoplay',
        'data-callout', 'data-callout-type', 'data-container', 'colspan', 'rowspan'],
};

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
    '#f43f5e', '#ffffff', '#94a3b8', '#64748b',
];

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS (EXTRACTED)
   ═══════════════════════════════════════════════════════ */

const Btn = ({ onClick, active = false, icon: Icon, title, children, className: cls = '' }: any) => (
    <button
        onClick={onClick} type="button" title={title}
        className={`p-1.5 rounded-md transition-colors text-xs flex items-center justify-center ${cls} ${active
            ? 'bg-[var(--brand)] text-white'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]'}`}
    >
        {Icon ? <Icon className="w-4 h-4" /> : children}
    </button>
);

const Sep = () => <div className="w-px self-stretch mx-0.5 opacity-20" style={{ background: 'var(--text-secondary)' }} />;

const ModeTab = ({ mode, currentMode, label, icon: Icon, onModeChange }: { mode: EditorMode; currentMode: EditorMode; label: string; icon: any; onModeChange: (m: EditorMode) => void }) => (
    <button
        type="button" onClick={() => onModeChange(mode)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentMode === mode
            ? 'bg-[var(--brand)] text-white shadow-md'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]'
            }`}
    >
        <Icon className="w-3.5 h-3.5" /> {label}
    </button>
);

const Popover = ({ show, children }: { show: boolean; children: React.ReactNode }) => {
    if (!show) return null;
    return (
        <div
            className="absolute top-full left-0 mt-1 rounded-xl shadow-xl border z-[100] p-2 min-w-[160px]"
            style={{ background: 'var(--bg-elev-2)', borderColor: 'var(--divider)' }}
            onClick={e => e.stopPropagation()}
        >
            {children}
        </div>
    );
};

/* ── Editor Panes ── */

// Updated interface to include onChange and value
const EditorTextarea = React.forwardRef<HTMLTextAreaElement, {
    value: string;
    onChange: (val: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    mode: EditorMode;
    className?: string;
}>(({ value, onChange, onKeyDown, mode, className: cls = '' }, ref) => (
    <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`w-full p-5 font-mono text-sm leading-relaxed focus:outline-none resize-none ${cls}`}
        style={{ background: 'transparent', color: 'var(--text-primary)', caretColor: 'var(--brand)' }}
        placeholder={mode === 'html' ? 'Enter HTML here...' : 'Start writing...'}
        spellCheck={false}
    />
));

const PreviewPane = ({ previewHtml, className: cls = '' }: { previewHtml: string; className?: string }) => (
    <div
        className={`prose prose-invert max-w-none p-6 prose-headings:font-['Poppins',sans-serif] prose-p:font-['Inter',sans-serif] prose-a:text-[var(--brand)] prose-img:rounded-xl prose-img:shadow-lg prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--brand)] prose-code:bg-[var(--chip-bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-[var(--bg-elev-1)] prose-pre:border prose-pre:border-[var(--divider)] prose-pre:rounded-xl prose-blockquote:border-l-[var(--brand)] prose-blockquote:bg-[var(--chip-bg)] prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-hr:border-[var(--divider)] prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4 prose-li:my-0.5 prose-li:text-[var(--text-secondary)] ${cls}`}
        style={{ color: 'var(--text-primary)' }}
        dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color:var(--text-secondary);opacity:0.5">Preview will appear here...</p>' }}
    />
);

/* ── Toolbars ── */

const VisualToolbar = ({ editor, showCalloutMenu, setShowCalloutMenu, insertCallout, showContainerMenu, setShowContainerMenu, insertContainer, showColorPicker, setShowColorPicker, showHighlightPicker, setShowHighlightPicker }: any) => (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b" style={{ borderColor: 'var(--divider)' }}>
        {/* Text formatting */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} title="Bold" />
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} title="Italic" />
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={UnderlineIcon} title="Underline" />
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} title="Strikethrough" />
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} title="Inline Code" />
        <Sep />

        {/* Headings */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} title="H1" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} title="H2" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={Heading3} title="H3" />
        <Sep />

        {/* Alignment */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Left" />
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Center" />
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Right" />
        <Sep />

        {/* Lists */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} title="Bullet List" />
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} title="Ordered List" />
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} title="Quote" />
        <Sep />

        {/* Links & Media */}
        <Btn onClick={() => { const url = window.prompt('Enter URL', editor.getAttributes('link').href); if (url === null) return; url === '' ? editor.chain().focus().extendMarkRange('link').unsetLink().run() : editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); }} active={editor.isActive('link')} icon={LinkIcon} title="Link" />
        <Btn onClick={() => { const url = window.prompt('Enter image URL'); if (url) editor.chain().focus().setImage({ src: url }).run(); }} icon={ImageIcon} title="Image" />
        <Btn onClick={() => { const url = window.prompt('Enter YouTube URL'); if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run(); }} icon={YoutubeIcon} title="YouTube" />
        <Sep />

        {/* Table */}
        <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={TableIcon} title="Insert Table" />
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} icon={CodeXml} title="Code Block" />
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} title="Horizontal Rule" />
        <Sep />

        {/* Callout dropdown */}
        <div className="relative" onClick={e => e.stopPropagation()}>
            <Btn onClick={() => setShowCalloutMenu((c: boolean) => !c)} active={showCalloutMenu} title="Insert Callout">
                <AlertCircle className="w-4 h-4" /><ChevronDown className="w-3 h-3 ml-0.5" />
            </Btn>
            <Popover show={showCalloutMenu}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-2" style={{ color: 'var(--text-secondary)' }}>Callouts</div>
                {Object.entries(CALLOUT_STYLES).map(([key, s]) => (
                    <button key={key} onClick={() => insertCallout(key)}
                        className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-[var(--bg-elev-1)] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.border }} />
                        <span>{s.emoji} {s.label}</span>
                    </button>
                ))}
            </Popover>
        </div>

        {/* Container dropdown */}
        <div className="relative" onClick={e => e.stopPropagation()}>
            <Btn onClick={() => setShowContainerMenu((c: boolean) => !c)} active={showContainerMenu} title="Insert Styled Container">
                <PanelBottom className="w-4 h-4" /><ChevronDown className="w-3 h-3 ml-0.5" />
            </Btn>
            <Popover show={showContainerMenu}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-2" style={{ color: 'var(--text-secondary)' }}>Containers</div>
                <button onClick={() => insertContainer('card')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-[var(--bg-elev-1)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-3 h-3 rounded-sm border border-[var(--divider)]" style={{ background: 'var(--bg-elev-1)' }} /> Card
                </button>
                <button onClick={() => insertContainer('highlight')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-[var(--bg-elev-1)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(168,85,247,0.3))' }} /> Gradient
                </button>
                <button onClick={() => insertContainer('steps')} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-[var(--bg-elev-1)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-3 h-3 rounded-sm border-l-2" style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--brand)' }} /> Steps
                </button>
            </Popover>
        </div>
        <Sep />

        {/* Colors */}
        <div className="relative" onClick={e => e.stopPropagation()}>
            <Btn onClick={() => setShowColorPicker((c: boolean) => !c)} title="Text Color">
                <div className="flex flex-col items-center">
                    <Type className="w-4 h-4" />
                    <div className="w-4 h-0.5 rounded-full mt-px" style={{ background: editor.getAttributes('textStyle').color || 'var(--text-primary)' }} />
                </div>
            </Btn>
            <Popover show={showColorPicker}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-1" style={{ color: 'var(--text-secondary)' }}>Text Color</div>
                <div className="grid grid-cols-8 gap-1">
                    {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }}
                            className="w-5 h-5 rounded-md border border-white/10 hover:scale-110 transition-transform"
                            style={{ background: c }} title={c}
                        />
                    ))}
                </div>
                <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                    className="w-full mt-1.5 text-[10px] py-1 rounded-md hover:bg-[var(--bg-elev-1)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    Reset Color
                </button>
            </Popover>
        </div>
        <div className="relative" onClick={e => e.stopPropagation()}>
            <Btn onClick={() => setShowHighlightPicker((c: boolean) => !c)} active={editor.isActive('highlight')} title="Highlight">
                <Highlighter className="w-4 h-4" />
            </Btn>
            <Popover show={showHighlightPicker}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-1" style={{ color: 'var(--text-secondary)' }}>Highlight</div>
                <div className="grid grid-cols-8 gap-1">
                    {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => { editor.chain().focus().toggleHighlight({ color: c + '33' }).run(); setShowHighlightPicker(false); }}
                            className="w-5 h-5 rounded-md border border-white/10 hover:scale-110 transition-transform"
                            style={{ background: c + '55' }} title={c}
                        />
                    ))}
                </div>
                <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
                    className="w-full mt-1.5 text-[10px] py-1 rounded-md hover:bg-[var(--bg-elev-1)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    Remove Highlight
                </button>
            </Popover>
        </div>

        <div className="flex-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} icon={Undo} title="Undo" />
        <Btn onClick={() => editor.chain().focus().redo().run()} icon={Redo} title="Redo" />
    </div>
);



/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminRichTextEditor({
    value, onChange, className = '', placeholder: ph,
}: AdminRichTextEditorProps) {

    const isAdvanced = useMemo(() => detectAdvancedHtml(value), []);
    const [mode, setMode] = useState<EditorMode>(() => {
        return 'visual';
    });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showCalloutMenu, setShowCalloutMenu] = useState(false);
    const [showContainerMenu, setShowContainerMenu] = useState(false);
    const [showInsertMenu, setShowInsertMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Refs for stable TipTap callbacks
    const modeRef = useRef(mode);
    const onChangeRef = useRef(onChange);
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // ESC to exit fullscreen + close menus on click outside
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (isFullscreen) setIsFullscreen(false); } };
        const closeMenus = () => { setShowColorPicker(false); setShowHighlightPicker(false); setShowCalloutMenu(false); setShowContainerMenu(false); setShowInsertMenu(false); };
        window.addEventListener('keydown', h);
        document.addEventListener('click', closeMenus);
        return () => { window.removeEventListener('keydown', h); document.removeEventListener('click', closeMenus); };
    }, [isFullscreen]);

    /* ── TipTap editor ── */
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: { HTMLAttributes: { class: 'code-block' } } }),
            Underline,
            ImageExt.configure({ inline: true, allowBase64: true }),
            Youtube.configure({ controls: false }),
            Link.configure({ openOnClick: false }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Placeholder.configure({ placeholder: ph || 'Start writing your guide...' }),
            CalloutExtension,
            StyledContainer,
        ],
        content: isAdvanced ? '' : value,
        onUpdate: ({ editor }) => {
            if (modeRef.current === 'visual') onChangeRef.current(editor.getHTML());
        },
        editorProps: {
            attributes: { class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] p-5' },
        },
    });

    const previewHtml = useMemo(() => {
        const src = value || '';
        return DOMPurify.sanitize(src, SANITIZE_CFG);
    }, [value, mode]);

    /* ── Markdown helpers ── */
    const insertMd = useCallback((before: string, after = '', ph = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const s = ta.selectionStart, e = ta.selectionEnd;
        const sel = value.substring(s, e) || ph;
        onChange(value.substring(0, s) + before + sel + after + value.substring(e));
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length); });
    }, [value, onChange]);

    const insertLineMd = useCallback((prefix: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const s = ta.selectionStart;
        const lineStart = value.lastIndexOf('\n', s - 1) + 1;
        onChange(value.substring(0, lineStart) + prefix + value.substring(lineStart));
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + prefix.length, s + prefix.length); });
    }, [value, onChange]);

    const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = e.currentTarget, s = ta.selectionStart, end = ta.selectionEnd;
            onChange(value.substring(0, s) + '  ' + value.substring(end));
            requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
        }
    }, [value, onChange, mode]);

    const handleModeChange = useCallback((newMode: EditorMode) => {
        if (newMode === 'visual') {
            if (detectAdvancedHtml(value)) {
                if (!window.confirm('⚠️ Visual mode may simplify some advanced HTML.\n\nSwitch anyway?')) return;
            }
            editor?.commands.setContent(value || '');
        }
        setMode(newMode);
    }, [value, editor]);

    if (!editor) return null;

    /* ── Insert callout ── */
    const insertCallout = (type: string) => {
        editor.chain().focus().insertContent({
            type: 'callout',
            attrs: { type },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: `${CALLOUT_STYLES[type]?.emoji || ''} ${CALLOUT_STYLES[type]?.label || 'Note'}: ` }] }],
        }).run();
        setShowCalloutMenu(false);
    };

    /* ── Insert container ── */
    const insertContainer = (variant: string) => {
        editor.chain().focus().insertContent({
            type: 'styledContainer',
            attrs: { variant },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content here...' }] }],
        }).run();
        setShowContainerMenu(false);
    };

    /* ═══════════════════════════════════════════════════════
       MAIN RENDER
       ═══════════════════════════════════════════════════════ */

    const editorHeight = isFullscreen ? 'h-full' : 'min-h-[600px]';

    return (
        <div
            className={`flex flex-col overflow-hidden ${isFullscreen
                ? 'fixed inset-0 z-[9999] bg-[var(--bg-page)]'
                : `border rounded-xl ${className}`}`}
            style={!isFullscreen ? { background: 'var(--bg-surface)', borderColor: 'var(--divider)' } : undefined}
        >
            {/* Editor styles for TipTap */}
            <style>{`
                .ProseMirror table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                .ProseMirror td, .ProseMirror th { border: 1px solid var(--divider, #333); padding: 8px 12px; text-align: left; min-width: 80px; }
                .ProseMirror th { background: var(--bg-elev-2, #1a1a2e); font-weight: 600; }
                .ProseMirror .code-block { background: var(--bg-elev-1, #0d0d1a); border: 1px solid var(--divider, #333); border-radius: 8px; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
                .ProseMirror [data-callout] { margin: 16px 0; }
                .ProseMirror [data-container] { margin: 16px 0; }
                .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-secondary); opacity: 0.4; float: left; pointer-events: none; height: 0; }
                .ProseMirror mark { border-radius: 3px; padding: 2px 0; }
                .ProseMirror img { max-width: 100%; border-radius: 12px; }
                .ProseMirror hr { border: none; border-top: 2px solid var(--divider, #333); margin: 24px 0; }
                .ProseMirror blockquote { border-left: 4px solid var(--brand, #6366f1); background: var(--chip-bg, rgba(99,102,241,0.06)); border-radius: 0 8px 8px 0; padding: 12px 20px; margin: 16px 0; }
            `}</style>

            {/* ── Top bar: mode tabs + fullscreen ── */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b flex-shrink-0" style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--divider)' }}>
                <div className="flex items-center gap-1.5">
                    <ModeTab mode="html" currentMode={mode} onModeChange={handleModeChange} label="HTML" icon={FileCode} />
                    <ModeTab mode="visual" currentMode={mode} onModeChange={handleModeChange} label="Visual" icon={Palette} />
                    <Sep />
                    <ModeTab mode="preview" currentMode={mode} onModeChange={handleModeChange} label="Preview" icon={Eye} />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}>
                        HTML
                    </span>
                    <button type="button" onClick={() => setIsFullscreen(f => !f)}
                        className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)] transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ── Context toolbar ── */}
            {mode === 'visual' && <VisualToolbar
                editor={editor}
                showCalloutMenu={showCalloutMenu}
                setShowCalloutMenu={setShowCalloutMenu}
                insertCallout={insertCallout}
                showContainerMenu={showContainerMenu}
                setShowContainerMenu={setShowContainerMenu}
                insertContainer={insertContainer}
                showColorPicker={showColorPicker}
                setShowColorPicker={setShowColorPicker}
                showHighlightPicker={showHighlightPicker}
                setShowHighlightPicker={setShowHighlightPicker}
            />}

            {/* ── Editor body ── */}
            {/* ── Editor body ── */}
            <div className={`flex-1 overflow-hidden flex flex-col ${editorHeight}`}>
                {mode === 'visual' && (
                    <div className="flex-1 h-full overflow-y-auto" style={{ background: 'var(--bg-surface)' }}>
                        <EditorContent editor={editor} />
                    </div>
                )}
                {mode === 'html' && (
                    <div className="flex-1 h-full overflow-y-auto flex flex-col" style={{ background: 'var(--bg-elev-1)' }}>
                        <EditorTextarea
                            ref={textareaRef}
                            value={value}
                            onChange={(val) => onChange(val)}
                            onKeyDown={handleTextareaKeyDown}
                            mode={mode}
                            className="flex-1 h-full min-h-[400px]"
                        />
                    </div>
                )}
                {mode === 'preview' && (
                    <div className="flex-1 h-full overflow-y-auto" style={{ background: 'var(--bg-surface)' }}>
                        <PreviewPane previewHtml={previewHtml} />
                    </div>
                )}
            </div>

            {/* ── Status bar ── */}
            <div className="flex items-center justify-between px-4 py-1.5 text-[10px] border-t flex-shrink-0" style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}>
                <span>{value.length.toLocaleString()} chars</span>
                <div className="flex items-center gap-3">
                    {mode === 'visual' && <span>Click toolbar buttons or use shortcuts</span>}
                    {isFullscreen && <span className="opacity-60">Esc to exit</span>}
                </div>
            </div>
        </div>
    );
}
