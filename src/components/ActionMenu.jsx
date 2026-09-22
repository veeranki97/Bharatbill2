import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

/** Compact 3-dots action menu for table rows */
export default function ActionMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className="btn-icon" aria-label="Actions" onClick={() => setOpen(o => !o)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 50, minWidth: 160,
          background: 'var(--card, #fff)', border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '0.35rem 0',
        }}>
          {items.filter(Boolean).map((it, i) => (
            <button key={i} type="button"
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '0.45rem 0.85rem',
                border: 'none', background: 'transparent', fontSize: '0.82rem', cursor: 'pointer',
                color: it.danger ? '#dc2626' : 'inherit',
              }}
              onClick={() => { setOpen(false); it.onClick?.(); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
