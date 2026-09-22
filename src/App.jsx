import { useEffect, useState } from 'react';

/**
 * Temporary bootstrap.
 * Full App.jsx with sidebar auto-hide is in the release ZIP.
 * After cloning, copy src/App.jsx from Bharatbill2-FULL-App-sidebar-discount-dashboard.zip
 * OR run: python3 scripts/restore_App_jsx.py (after all chunks are present).
 */
export default function App() {
  const [msg] = useState(
    'Bharatbill2: Replace src/App.jsx from the fix ZIP, then refresh.\n\nDownload: Bharatbill2-FULL-App-sidebar-discount-dashboard.zip\nCopy App.jsx, Dashboard.jsx, InvoiceGenerator.jsx, index.css into src/\nThen: git add -A && git commit -m "restore full App" && git push'
  );
  return (
    <pre style={{ padding: 24, whiteSpace: 'pre-wrap', fontFamily: 'system-ui', maxWidth: 640 }}>{msg}</pre>
  );
}
