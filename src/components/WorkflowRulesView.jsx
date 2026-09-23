import { useState } from 'react';
import { toast } from './Toast';
const KEY = 'fgsb_workflow_rules';
const DEFAULTS = [
  { id: 'overdue_15', enabled: true, days: 15, channel: 'email', label: 'If invoice > 15 days overdue, remind client' },
  { id: 'overdue_30', enabled: false, days: 30, channel: 'whatsapp', label: 'If invoice > 30 days overdue, WhatsApp reminder' },
];
export function getWorkflowRules() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch {}
  return DEFAULTS;
}
export default function WorkflowRulesView() {
  const [rules, setRules] = useState(getWorkflowRules);
  const save = (next) => { setRules(next); localStorage.setItem(KEY, JSON.stringify(next)); toast('Saved', 'success'); };
  return (
    <div className="page">
      <h2>Workflow Rules</h2>
      <table className="data-table" style={{ width: '100%', maxWidth: 720 }}>
        <thead><tr><th>On</th><th>Rule</th><th>Days</th><th>Channel</th></tr></thead>
        <tbody>
          {rules.map((r, i) => (
            <tr key={r.id}>
              <td><input type="checkbox" checked={!!r.enabled} onChange={e => { const n = rules.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x); save(n); }} /></td>
              <td>{r.label}</td>
              <td><input type="number" className="form-input" style={{width:70}} value={r.days} onChange={e => { const n = rules.map((x,j)=>j===i?{...x,days:Number(e.target.value)||0}:x); save(n); }} /></td>
              <td><select className="form-input" value={r.channel} onChange={e => { const n = rules.map((x,j)=>j===i?{...x,channel:e.target.value}:x); save(n); }}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
