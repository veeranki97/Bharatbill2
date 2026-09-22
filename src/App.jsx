import { useEffect, useState } from 'react';

/** Temporary bootstrap — run: python3 scripts/restore_App_jsx.py */
export default function App() {
  const [msg, setMsg] = useState('Loading…');
  useEffect(() => {
    setMsg(
      'Bharatbill2: restore App.jsx from repo root:\n\n  python3 scripts/restore_App_jsx.py\n\nOr copy App.jsx from the fix ZIP, then refresh.'
    );
  }, []);
  return (
    <pre style={{ padding: 24, whiteSpace: 'pre-wrap', fontFamily: 'system-ui' }}>{msg}</pre>
  );
}
