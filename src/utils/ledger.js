/**
 * Double-entry journal helpers + financial statements
 */
export const ACCOUNTS = {
  SALES: 'Sales',
  CGST_OUT: 'Output CGST',
  SGST_OUT: 'Output SGST',
  IGST_OUT: 'Output IGST',
  DEBTORS: 'Sundry Debtors',
  CREDITORS: 'Sundry Creditors',
  CASH_BANK: 'Bank',
  CASH: 'Cash',
  ROUND_OFF: 'Round Off',
  DIRECT: 'Direct Costs',
  INDIRECT: 'Indirect Expenses',
  ITC_CGST: 'Input CGST',
  ITC_SGST: 'Input SGST',
  ITC_IGST: 'Input IGST',
  CAPITAL: 'Capital',
  RE: 'Retained Earnings',
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

  const dr = entries.reduce((s, e) => s + e.debit, 0);
  const cr = entries.reduce((s, e) => s + e.credit, 0);
  const diff = +(dr - cr).toFixed(2);
  if (Math.abs(diff) >= 0.01) {
    if (diff > 0) entries.push({ account: ACCOUNTS.ROUND_OFF, debit: 0, credit: diff });
    else entries.push({ account: ACCOUNTS.ROUND_OFF, debit: -diff, credit: 0 });
  }

  return {
    id: 'jnl_inv_' + (bill.id || bill.invoiceNumber),
    date: bill.invoiceDate || bill.data?.details?.invoiceDate,
    narration: `Invoice ${bill.invoiceNumber} — ${bill.clientName || bill.data?.client?.name || ''}`,
    refType: 'invoice',
    refId: bill.id || bill.invoiceNumber,
    party: bill.clientName || bill.data?.client?.name || '',
    clientName: bill.clientName || bill.data?.client?.name || '',
    costCenterId: bill.costCenterId || bill.data?.costCenterId || null,
    site: bill.site || bill.data?.site || null,
    entries,
  };
}

export function journalFromPayment(bill, paymentAmount, mode = 'bank', paymentMeta = {}) {
  const amt = Number(paymentAmount) || 0;
  if (amt <= 0) return null;
  const bankAcc = String(mode).toLowerCase().includes('cash') ? ACCOUNTS.CASH : ACCOUNTS.CASH_BANK;
  const party = bill.data?.client?.name || bill.clientName || paymentMeta.party || '';
  const payDate = paymentMeta.date || new Date().toISOString().split('T')[0];
  const payId = paymentMeta.id || String(Date.now());
  return {
    id: 'jnl_pay_' + (bill.id || bill.invoiceNumber) + '_' + payId,
    date: payDate,
    narration: `Receipt from ${party || 'customer'} against ${bill.invoiceNumber || bill.id}`,
    refType: 'payment',
    refId: bill.id || bill.invoiceNumber,
    party,
    clientName: party,
    site: bill.site || bill.data?.site || null,
    costCenterId: bill.costCenterId || bill.data?.costCenterId || null,
    entries: [
      { account: bankAcc, debit: amt, credit: 0, party },
      { account: ACCOUNTS.DEBTORS, debit: 0, credit: amt, party },
    ],
  };
}

export function journalFromExpense(exp) {
  const amt = Number(exp.amount) || 0;
  const gst = Number(exp.gstAmount) || 0;
  const total = amt + gst;
  if (total <= 0) return null;
  const entries = [
    { account: ACCOUNTS.INDIRECT, debit: amt, credit: 0 },
  ];
  if (gst > 0) {
    if (exp.interstate) entries.push({ account: ACCOUNTS.ITC_IGST, debit: gst, credit: 0 });
    else {
      const half = +(gst / 2).toFixed(2);
      entries.push({ account: ACCOUNTS.ITC_CGST, debit: half, credit: 0 });
      entries.push({ account: ACCOUNTS.ITC_SGST, debit: +(gst - half).toFixed(2), credit: 0 });
    }
  }
  entries.push({ account: ACCOUNTS.CASH_BANK, debit: 0, credit: total });
  return {
    id: 'jnl_exp_' + (exp.id || Date.now()),
    date: exp.date,
    narration: exp.description || 'Expense',
    refType: 'expense',
    refId: exp.id,
    costCenterId: exp.costCenterId || null,
    site: exp.site || null,
    entries,
  };
}

export function trialBalance(journals, untilDate) {
  const map = {};
  (journals || []).forEach(j => {
    if (untilDate && j.date && j.date > untilDate) return;
    (j.entries || []).forEach(e => {
      if (!map[e.account]) map[e.account] = { account: e.account, debit: 0, credit: 0 };
      map[e.account].debit += Number(e.debit) || 0;
      map[e.account].credit += Number(e.credit) || 0;
    });
  });
  return Object.values(map)
    .map(r => ({
      ...r,
      debit: +r.debit.toFixed(2),
      credit: +r.credit.toFixed(2),
      balance: +(r.debit - r.credit).toFixed(2),
    }))
    .sort((a, b) => a.account.localeCompare(b.account));
}

/** Classify TB rows into BS / P&L buckets by account name heuristics + type map */
const BS_ASSET = /bank|cash|debtor|input|asset|stock|inventory|receivable/i;
const BS_LIAB = /creditor|output|liabilit|payable|gst payable|loan/i;
const BS_EQ = /capital|equity|retained|drawing/i;
const PL_INC = /sales|income|revenue/i;
const PL_EXP = /expense|cost|salary|rent|purchase|direct|indirect/i;

export function balanceSheet(journals, asOfDate) {
  const tb = trialBalance(journals, asOfDate);
  const assets = [], liabilities = [], equity = [];
  let income = 0, expense = 0;
  tb.forEach(r => {
    const n = r.account;
    const bal = r.balance; // debit positive
    if (PL_INC.test(n)) { income += r.credit - r.debit; return; }
    if (PL_EXP.test(n)) { expense += r.debit - r.credit; return; }
    if (BS_ASSET.test(n)) assets.push({ ...r, amount: bal });
    else if (BS_LIAB.test(n)) liabilities.push({ ...r, amount: -bal });
    else if (BS_EQ.test(n)) equity.push({ ...r, amount: -bal });
    else if (bal >= 0) assets.push({ ...r, amount: bal });
    else liabilities.push({ ...r, amount: -bal });
  });
  const netProfit = +(income - expense).toFixed(2);
  if (Math.abs(netProfit) > 0.001) {
    equity.push({ account: 'Current Year P&L', amount: netProfit, debit: 0, credit: 0, balance: 0 });
  }
  const totalAssets = assets.reduce((s, a) => s + (a.amount || 0), 0);
  const totalLE = liabilities.reduce((s, a) => s + (a.amount || 0), 0)
    + equity.reduce((s, a) => s + (a.amount || 0), 0);
  return {
    assets, liabilities, equity,
    totalAssets: +totalAssets.toFixed(2),
    totalLiabilitiesAndEquity: +totalLE.toFixed(2),
    netProfit,
    income: +income.toFixed(2),
    expense: +expense.toFixed(2),
  };
}

export function bankBalance(journals, accountName = 'Bank') {
  let bal = 0;
  (journals || []).forEach(j => {
    (j.entries || []).forEach(e => {
      if ((e.account || '').toLowerCase() === accountName.toLowerCase()
        || (accountName === 'Bank' && /^(bank|cash\/bank)$/i.test(e.account || ''))) {
        bal += (Number(e.debit) || 0) - (Number(e.credit) || 0);
      }
    });
  });
  return +bal.toFixed(2);
}

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

export function isMonthLocked(dateStr) {
  try {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const locked = JSON.parse(localStorage.getItem('fgsb_locked_months') || '[]');
    return locked.includes(key);
  } catch {
    return false;
  }
}

export function lockMonth(yyyyMm) {
  const locked = JSON.parse(localStorage.getItem('fgsb_locked_months') || '[]');
  if (!locked.includes(yyyyMm)) locked.push(yyyyMm);
  localStorage.setItem('fgsb_locked_months', JSON.stringify(locked));
}

export function unlockMonth(yyyyMm) {
  let locked = JSON.parse(localStorage.getItem('fgsb_locked_months') || '[]');
  locked = locked.filter(m => m !== yyyyMm);
  localStorage.setItem('fgsb_locked_months', JSON.stringify(locked));
}

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
      if (acc.includes('purchase') || acc.includes('direct')) purchases += dr;
      if (acc.includes('expense') || acc.includes('salary') || acc.includes('rent') || acc.includes('indirect')) expenses += dr;
    });
  });
  const grossProfit = sales - purchases;
  const netProfit = grossProfit - expenses;
  return { sales, purchases, expenses, grossProfit, netProfit };
}

/** Site-wise P&L from journals tagged with site */
export function siteWisePnL(journals, fromDate, toDate) {
  const bySite = {};
  (journals || []).forEach(j => {
    const d = j.date || '';
    if (fromDate && d < fromDate) return;
    if (toDate && d > toDate) return;
    const site = j.site || 'Unassigned';
    if (!bySite[site]) bySite[site] = { site, income: 0, expense: 0 };
    (j.entries || []).forEach(e => {
      const acc = (e.account || '').toLowerCase();
      if (acc.includes('sales')) bySite[site].income += Number(e.credit) || 0;
      if (acc.includes('expense') || acc.includes('cost') || acc.includes('direct')) {
        bySite[site].expense += Number(e.debit) || 0;
      }
    });
  });
  return Object.values(bySite).map(s => ({
    ...s,
    profit: +(s.income - s.expense).toFixed(2),
  }));
}

/** Year-end close: transfer P&L into Retained Earnings (returns journal, does not save) */
export function periodCloseJournal(journals, fyEndDate) {
  const { netProfit } = computeTradingPnL(journals, null, fyEndDate);
  if (Math.abs(netProfit) < 0.01) return null;
  const entries = netProfit >= 0
    ? [
        { account: 'Current Year P&L', debit: netProfit, credit: 0 },
        { account: ACCOUNTS.RE, debit: 0, credit: netProfit },
      ]
    : [
        { account: ACCOUNTS.RE, debit: Math.abs(netProfit), credit: 0 },
        { account: 'Current Year P&L', debit: 0, credit: Math.abs(netProfit) },
      ];
  return {
    id: 'jnl_close_' + fyEndDate,
    date: fyEndDate,
    narration: `Period close — transfer P&L to Retained Earnings`,
    refType: 'period-close',
    refId: fyEndDate,
    entries,
  };
}
