/**
 * Simple double-entry journal helpers (custom)
 * Auto-post balanced entries when invoices/payments are saved.
 */

export const ACCOUNTS = {
  SALES: 'Sales',
  CGST_OUT: 'CGST Output',
  SGST_OUT: 'SGST Output',
  IGST_OUT: 'IGST Output',
  DEBTORS: 'Sundry Debtors',
  CASH_BANK: 'Cash/Bank',
  ROUND_OFF: 'Round Off',
};

export function journalFromTaxInvoice(bill) {
  const total = Number(bill.totalAmount) || 0;
  const tax = Number(bill.totalTaxAmount) || 0;
  const taxable = total - tax;
  const data = bill.data || {};
  const totals = data.totals || {};
  const cgst = Number(totals.cgst) || 0;
  const sgst = Number(totals.sgst) || 0;
  const igst = Number(totals.igst) || 0;

  const entries = [
    { account: ACCOUNTS.DEBTORS, debit: total, credit: 0 },
    { account: ACCOUNTS.SALES, debit: 0, credit: Math.max(0, taxable) },
  ];
  if (cgst > 0) entries.push({ account: ACCOUNTS.CGST_OUT, debit: 0, credit: cgst });
  if (sgst > 0) entries.push({ account: ACCOUNTS.SGST_OUT, debit: 0, credit: sgst });
  if (igst > 0) entries.push({ account: ACCOUNTS.IGST_OUT, debit: 0, credit: igst });

  // Balance any paise difference into round-off
  const dr = entries.reduce((s, e) => s + e.debit, 0);
  const cr = entries.reduce((s, e) => s + e.credit, 0);
  const diff = +(dr - cr).toFixed(2);
  if (Math.abs(diff) >= 0.01) {
    if (diff > 0) entries.push({ account: ACCOUNTS.ROUND_OFF, debit: 0, credit: diff });
    else entries.push({ account: ACCOUNTS.ROUND_OFF, debit: -diff, credit: 0 });
  }

  return {
    id: 'jnl_inv_' + (bill.id || bill.invoiceNumber),
    date: bill.invoiceDate,
    narration: `Invoice ${bill.invoiceNumber}`,
    refType: 'invoice',
    refId: bill.id || bill.invoiceNumber,
    entries,
  };
}

export function journalFromPayment(bill, paymentAmount) {
  const amt = Number(paymentAmount) || 0;
  if (amt <= 0) return null;
  return {
    id: 'jnl_pay_' + (bill.id || bill.invoiceNumber) + '_' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    narration: `Payment against ${bill.invoiceNumber}`,
    refType: 'payment',
    refId: bill.id || bill.invoiceNumber,
    entries: [
      { account: ACCOUNTS.CASH_BANK, debit: amt, credit: 0 },
      { account: ACCOUNTS.DEBTORS, debit: 0, credit: amt },
    ],
  };
}

export function trialBalance(journals) {
  const map = {};
  (journals || []).forEach(j => {
    (j.entries || []).forEach(e => {
      if (!map[e.account]) map[e.account] = { account: e.account, debit: 0, credit: 0 };
      map[e.account].debit += Number(e.debit) || 0;
      map[e.account].credit += Number(e.credit) || 0;
    });
  });
  return Object.values(map).sort((a, b) => a.account.localeCompare(b.account));
}


/** Period freeze (Settings stores fgsb_freeze_days in localStorage) */
export function isPeriodFrozen(dateStr) {
  try {
    const freezeDays = Number(localStorage.getItem('fgsb_freeze_days') || '0');
    if (!freezeDays || !dateStr) return false;
    const invD = new Date(dateStr);
    const diff = Math.floor((Date.now() - invD.getTime()) / 86400000);
    return diff > freezeDays;
  } catch {
    return false;
  }
}

/** Trading / P&L aggregates from journals (P2) */
export function computeTradingPnL(journals, fromDate, toDate) {
  let sales = 0, purchases = 0, expenses = 0;
  (journals || []).forEach(j => {
    const d = j.date || '';
    if (fromDate && d < fromDate) return;
    if (toDate && d > toDate) return;
    (j.entries || []).forEach(e => {
      const acc = (e.account || '').toLowerCase();
      const cr = Number(e.credit || 0);
      const dr = Number(e.debit || 0);
      if (acc.includes('sales')) sales += cr;
      if (acc.includes('purchase')) purchases += dr;
      if (acc.includes('expense') || acc.includes('salary') || acc.includes('rent')) expenses += dr;
    });
  });
  const grossProfit = sales - purchases;
  const netProfit = grossProfit - expenses;
  return { sales, purchases, expenses, grossProfit, netProfit };
}
