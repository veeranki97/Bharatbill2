========================================================
  SD Dynamics v2.0.0 — custom layer vs upstream
========================================================
Repo: https://github.com/veeranki97/SD Dynamics
Base: Free GST Billing Software (IamRamgarhia / DiceCodes, MIT)

CUSTOM MODULES / FILES (high level)
  - WorkOrdersView, PurchaseOrdersView, VendorsView
  - CostCentersView, ChartOfAccountsView, GeneralLedgerView
  - FinancialBooksView, CashBookView, PaymentReconView
  - BankFeedView, VoucherEntryView, ServiceRevenueReport
  - DashboardCharts, ActionMenu, WorkflowRulesView
  - src/utils/ledger.js (journal helpers)
  - Sai Durga / Tally PDF variants in InvoicePreview
  - server.js update check → veeranki97/SD Dynamics

INVOICE / ERP BEHAVIOUR
  - State → Client → Site cascade (clients only, not vendors)
  - WO auto-fill, budget ceiling, due date +30 days
  - Payment → journal + receipt (GL + cash book)
  - Cost center on PO (required), expenses, receipts, purchase bills

VERSIONING
  - First fork release: 2.0.0 (see CHANGELOG.md)
  - Bump package.json when you tag GitHub Releases

RUN
  npm install && npm run build && npm start
  Protect the data/ folder on every update.

NOT CLAIMED AS FULL TALLY/SAP
  Full multi-currency GL rewrite, hard period lock UX, and
  server-side RBAC for claim approval are still limited.
========================================================
