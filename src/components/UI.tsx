import { useEffect, useRef, type ReactNode } from 'react';
import { Check, Code2, X } from 'lucide-react';

export function Brand() { return <div className="brand"><span className="brand-mark"><Code2 size={24} strokeWidth={2.4} /></span><div><strong>C Programming Assessment</strong><span>ASSESSMENT WORKSPACE</span></div></div>; }
export function Saved({ error = false }: { error?: boolean }) { return <span className={`saved ${error ? 'unsaved' : ''}`}>{error ? <X size={14} /> : <Check size={14} />}{error ? 'Not saved to this device' : 'Saved on this device'}</span>; }
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close(); }, []);
  return <dialog className="modal" ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}><div className="modal-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div>{children}</dialog>;
}
export function Footer() { return <footer className="site-footer"><span>C Programming Assessment <span className="footer-dot">·</span> Exam version c-2026.1</span><span>Built for focused thinking.</span></footer>; }
