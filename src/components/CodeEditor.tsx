import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, HighlightStyle, syntaxHighlighting, indentUnit } from '@codemirror/language';
import { cpp } from '@codemirror/lang-cpp';

// Preserve CodeMirror's syntax tags with colors that remain legible on the active line.
const palette: Record<string, string> = { '#404740': '#51616b', '#708': '#6f369d', '#219': '#3044a0', '#164': '#176142', '#a11': '#a02e3c', '#e40': '#a73b16', '#00f': '#2454be', '#30a': '#56308c', '#085': '#136b54', '#167': '#286174', '#256': '#345568', '#00c': '#2454be', '#940': '#775017', '#f00': '#b12430' };
const accessibleHighlightStyle = HighlightStyle.define(defaultHighlightStyle.specs.map(spec => ({ ...spec, ...(typeof spec.color === 'string' ? { color: palette[spec.color] ?? spec.color } : {}) })));

export default function CodeEditor({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const callback = useRef(onChange); callback.current = onChange;
  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({ doc: value, extensions: [
        lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), history(), cpp(), bracketMatching(),
        indentUnit.of('    '), syntaxHighlighting(accessibleHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        placeholder('// Your solution starts here…'),
        EditorView.contentAttributes.of({ 'aria-label': label, 'aria-describedby': 'editor-keyboard-help', spellcheck: 'false' }),
        EditorState.transactionFilter.of(tr => tr.newDoc.length > 100000 ? [] : tr),
        EditorView.updateListener.of(update => { if (update.docChanged) callback.current(update.state.doc.toString()); }),
        EditorView.theme({
          '&': { fontSize: '14px', backgroundColor: '#fcfdff' },
          '.cm-scroller': { fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace', overflow: 'auto', minHeight: '310px', maxHeight: '570px', lineHeight: '1.75' },
          '.cm-content': { padding: '18px 0', minHeight: '310px', caretColor: '#245cde' },
          '.cm-gutters': { backgroundColor: '#f7f9fc', color: '#596b83', borderRight: '1px solid #edf0f4', paddingRight: '10px', minWidth: '42px' },
          '.cm-activeLine': { backgroundColor: '#f0f5ff' }, '.cm-activeLineGutter': { backgroundColor: '#e9f0fc' },
          '&.cm-focused': { outline: '2px solid #245cde', outlineOffset: '-2px' },
          '.cm-placeholder': { color: '#596b83' },
        }),
      ] }),
    });
    editor.current = view;
    return () => { view.destroy(); editor.current = null; };
  }, []);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);
  return <div className="code-editor" ref={host} />;
}
