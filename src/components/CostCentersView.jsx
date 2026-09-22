import { useState, useEffect } from 'react';
import { getAllCostCenters, saveCostCenter } from '../store';
import { toast } from './Toast';

export default function CostCentersView() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('cc_company');

  const load = () => getAllCostCenters().then(setList).catch(() => toast('Failed', 'error'));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    await saveCostCenter({
      id: 'cc_' + Date.now().toString(36),
      name: name.trim(),
      parentId: parentId || null,
      active: true,
    });
    setName('');
    load();
    toast('Cost Center saved', 'success');
  };

  return (
    <div className="page">
      <h2>Cost Centers</h2>
      <p className="page-subtitle">Tree dimension for invoices, expenses, and P&amp;L.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chirala Site" />
        <select className="form-input" value={parentId} onChange={e => setParentId(e.target.value)}>
          {list.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" className="btn btn-primary" onClick={add}>Add child</button>
      </div>
      <ul>
        {list.map(c => (
          <li key={c.id}><strong>{c.name}</strong> {c.parentId ? `(parent: ${list.find(x => x.id === c.parentId)?.name || c.parentId})` : '(root)'}</li>
        ))}
      </ul>
    </div>
  );
}
