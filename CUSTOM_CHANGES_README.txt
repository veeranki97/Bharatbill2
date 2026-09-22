========================================================
  CUSTOM Free-GST FULL v8 — scoped outstanding work
========================================================

1. ActionMenu: Vendors, Work Orders (+ already Dashboard invoices)
2. GSTIN mod-36 check digit in isValidIndianGSTIN
3. Aging: notYetDue | 0to30 | 31to60 | 61to90 | 90plus
4. Cost Centers master + API; expense Cost Center required
5. Chart of Accounts, General Ledger, Payment Recon screens
6. Expense claimStatus Draft→Paid + cost center required
7. Client creditLimit, paymentTerms, tdsSection; invoice credit warn
8. PO Ship To <select> from sites
9. Site P&L still basic (TDS section on client for future rate map)
10. Quotation + Debit Note in INVOICE_TYPES (QUO / DN); PI prefix for proforma
11. Prefixes in INVOICE_TYPES (CN, DC, QUO, DN, PI) — counters per prefix via existing server

NOT FULL Tally: Period close voucher, Budget Stop/Warn full UI,
claimant≠approver server RBAC, universal 3-dots on every screen.

RUN: npm install && npm run build && node server.js
