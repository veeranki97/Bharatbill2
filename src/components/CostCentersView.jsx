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
      <div className="glass-panel p-3" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <strong style={{ marginRight: 8 }}>Master data</strong>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
          const v = prompt('Add HSN/SAC code (2/4/6/8 digits):');
          if (!v) return;
          const t = v.trim();
          if (!/^\d{2}$|^\d{4}$|^\d{6}$|^\d{8}$/.test(t)) { alert('HSN/SAC must be 2, 4, 6 or 8 digits'); return; }
          try {
            const arr = JSON.parse(localStorage.getItem('freegstbill_custom_sac') || '[]');
            if (!arr.includes(t)) { arr.push(t); localStorage.setItem('freegstbill_custom_sac', JSON.stringify(arr)); }
            alert('SAC/HSN saved — available on Invoice, WO, PO');
          } catch (e) { alert('Could not save'); }
        }}>＋ HSN / SAC</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
          const v = prompt('Add unit (e.g. Nos, Hrs, Sqft):');
          if (!v) return;
          try {
            const arr = JSON.parse(localStorage.getItem('freegstbill_custom_units') || '[]');
            const t = v.trim();
            if (t && !arr.includes(t)) { arr.push(t); localStorage.setItem('freegstbill_custom_units', JSON.stringify(arr)); }
            alert('Unit saved');
          } catch (e) { alert('Could not save'); }
        }}>＋ Unit</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
          const v = prompt('Add expense category (e.g. Direct Labor, Travel):');
          if (!v) return;
          try {
            const arr = JSON.parse(localStorage.getItem('freegstbill_expense_categories') || '[]');
            const t = v.trim();
            if (t && !arr.includes(t)) { arr.push(t); localStorage.setItem('freegstbill_expense_categories', JSON.stringify(arr)); }
            alert('Expense category saved');
          } catch (e) { alert('Could not save'); }
        }}>＋ Expense category</button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Used as dropdown masters across Invoice, WO, PO, Expenses</span>
      </div>

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
