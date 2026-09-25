import { useState, useEffect } from 'react';
import { getAllCostCenters, saveCostCenter, deleteCostCenter } from '../store';
import { toast } from './Toast';
import ActionMenu from './ActionMenu';

export default function CostCentersView() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => getAllCostCenters().then(setList).catch(() => toast('Failed to load', 'error'));
  useEffect(() => { load(); }, []);

  const addOrSave = async () => {
    if (!name.trim()) { toast('Name required', 'warning'); return; }
    const id = editing?.id || ('cc_' + Date.now().toString(36));
    await saveCostCenter({
      id,
      name: name.trim(),
      parentId: parentId || null,
      active: true,
    });
    setName('');
    setParentId('');
    setEditing(null);
    load();
    toast(editing ? 'Cost Center updated' : 'Cost Center saved', 'success');
  };

  const startEdit = (c) => {
    setEditing(c);
    setName(c.name || '');
    setParentId(c.parentId || '');
  };

  const remove = async (id) => {
    if (!confirm('Delete this cost center?')) return;
    try {
      await deleteCostCenter(id);
      load();
      toast('Deleted', 'success');
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="page">
      <h2>Cost Centers</h2>
      <p className="page-subtitle">Sites / departments for invoices, expenses, work orders, and site-wise P&amp;L.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto auto', gap: 8, marginBottom: 16, maxWidth: 720 }}>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Chirala Site / Tower A" />
        <select className="form-input" value={parentId} onChange={e => setParentId(e.target.value)}>
          <option value="">— No parent (root) —</option>
          {list.filter(c => !editing || c.id !== editing.id).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={addOrSave}>
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && (
          <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setName(''); setParentId(''); }}>
            Cancel
          </button>
        )}
      </div>
      <table className="data-table" style={{ maxWidth: 720 }}>
        <thead>
          <tr><th>Name</th><th>Parent</th><th>Id</th><th></th></tr>
        </thead>
        <tbody>
          {list.map(c => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td>{list.find(x => x.id === c.parentId)?.name || '—'}</td>
              <td style={{ fontSize: 11, color: '#94a3b8' }}>{c.id}</td>
              <td>
                <ActionMenu items={[
                  { label: 'Edit', onClick: () => startEdit(c) },
                  { label: 'Delete', danger: true, onClick: () => remove(c.id) },
                ]} />
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>No cost centers yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
