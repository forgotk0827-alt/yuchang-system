# WeChat Mini-Program Full Business Design

## Status

Approved design direction: WeChat mini-program covers the complete business loop, including employee workflows and administrator workflows. The existing PC web pages may remain as development/debug fallback, but the delivery target is the WeChat mini-program.

## Goals

Build a WeChat mini-program for Yuyao Yuchang Electric's improvement proposal, points incentive, reward redemption, approval, reporting, and administration process.

The system must support:

- Employee proposal submission, draft editing, draft deletion, and progress tracking.
- Department evaluation, finance review, lean office review, and review committee approval.
- Automatic points calculation and points ledger.
- Gift catalog, stock reservation, redemption review, issue registration, and receipt status.
- Employee and organization Excel import.
- Gift maintenance.
- Reports, ranking views, and operation logs.
- Annual points clearing and clearing reminders.
- In-app notifications.

## Non-Goals

- Do not build a PC-first product. PC web can remain as a fallback/admin debug surface, but not as the primary delivery channel.
- Do not implement external messaging in the first complete version. Use in-app notifications first.
- Do not implement payment. Rewards are points-based redemptions.
- Do not implement Enterprise WeChat integration in this phase. It can be a later upgrade.

## Users And Permissions

The system uses role-based access plus data ownership checks.

Roles:

- Normal employee: submit proposals, manage own drafts, view own approvals, points, and redemptions.
- Department evaluation group: normal employee permissions plus evaluating proposals from authorized departments.
- Finance reviewer: review financial-benefit proposals and upload financial calculation attachments.
- Lean office reviewer: final review, points operations, redemption operations, gift maintenance, reports.
- Review committee member: review proposals waiting for committee approval.
- Super administrator: full access to users, departments, roles, rules, reports, logs, and system configuration.

Review committee membership is a user flag, not a replacement for the user's base role.

Current review committee members:

- 黄晓鹏
- 邵海波
- 刘佛生
- 钱利民

Login policy:

- Account is employee number.
- Initial password is employee number followed by `@`, for example `YC000020@`.

## Mini-Program Information Architecture

Use role-aware mobile workflows instead of copying the PC web layout.

Bottom tabs:

1. Workbench
   - Current user's pending tasks.
   - Proposal status summary.
   - Points summary.
   - Notifications.
   - Role-specific management shortcuts.

2. Proposals
   - My proposals.
   - Drafts.
   - New proposal.
   - Proposal detail.
   - Approval history.
   - Pending review list for reviewers.
   - Department evaluation form.
   - Finance review form.
   - Lean office review form.
   - Committee approval form.

3. Points
   - Points account.
   - Points ledger.
   - Points rules.
   - Manual add/deduct for lean office and administrators.
   - Annual clearing records.

4. Redemptions
   - Gift catalog.
   - Gift detail.
   - Redemption application.
   - My redemption records.
   - Redemption review for lean office and administrators.
   - Gift issue registration.
   - Gift maintenance.

5. Profile
   - User profile.
   - Current role and committee identity.
   - Management center entry.
   - Password change.
   - Logout.

Management center entries are shown by permission:

- Employee management.
- Department management.
- Excel import.
- Gift management.
- Reports.
- Operation logs.
- System configuration.

## Proposal Workflow

Supported statuses:

- Draft.
- Pending department evaluation.
- Department evaluation rejected.
- Pending finance review.
- Finance review rejected.
- Pending lean office review.
- Lean office review rejected.
- Pending review committee approval.
- Review committee rejected.
- Re-review.
- Invalid closed.
- Archived.

Rules:

- Drafts can be edited and deleted.
- Non-drafts cannot be deleted.
- Rejected proposals can be edited and resubmitted.
- Rejection requires an opinion.
- Department evaluation must confirm on-site verification before passing normal improvement proposals.
- Correction, restoration, and benchmarking cases are invalid for proposal rewards and close as invalid.
- Horizontal expansion proposals are rewarded at least one level lower.
- Financial-benefit proposals require finance review and a financial calculation attachment.
- Level II and Level I proposals require review committee approval before points are awarded.
- Points are issued only when the proposal reaches the final archived state.

## Points Rules

Points must be calculated by backend services. The mini-program displays calculated totals and breakdowns.

Rules:

- Base participation: 20 points per valid improvement proposal, proposer 30%, implementer 70%.
- Case value points:
  - Level IV: 60.
  - Level III: 100.
  - Level II: 200.
  - Level I: 400.
  - Distributed proposer 30%, implementer 70%.
- Financial benefit:
  - `R <= 2000`: `R * 1%`.
  - `2000 < R <= 20000`: `20 + (R - 2000) * 2%`.
  - `R > 20000`: `380 + (R - 20000) * 3%`.
- Effective focus topics:
  - Large: leader 7000, up to three core members at 1000 each.
  - Medium: leader 2000, up to three core members at 500 each.
  - Small: leader 300.
- Excellent case sharing/publishing: 50 points per time, only for Level II or above.
- Monthly department incentives:
  - Rank 1: employee +10, supervisor +30.
  - Rank 2: employee +5, supervisor +15.

All points changes must create ledger entries. Manual adjustments require operator, reason, before/after state, and timestamp.

## Redemption Workflow

Gift redemption must support:

- Gift catalog and gift detail.
- Required points.
- Reference value.
- Stock quantity.
- Reserved quantity.
- Quarterly catalog version.
- Redemption application.
- Balance validation.
- Stock validation.
- Stock reservation on application.
- Lean office/admin review.
- Reject with reason and release reserved stock.
- Approve and deduct points.
- Issue registration.
- Receipt status.
- Redemption records and export/report views.

## Organization And Data Import

Employee and department data are imported from Excel.

Employee import maps:

- `工号` to employee number and login account.
- `姓名` to name.
- `手机号` or employee number to phone/account fallback.
- `2级部门` preferred, then `1级部门`.
- `职位` to post.
- `员工状态=离职` to disabled.
- Other active statuses to active.

After import:

- Missing departments are created.
- Points accounts are created.
- Initial password is `employeeNo + "@"`.
- Review committee flags are resynced by name.

Mini-program administrators must be able to upload Excel files to the backend for import. The backend remains responsible for parsing and validation.

## Reports And Logs

Mini-program reports must include:

- Proposal count by department.
- Approved/rejected/pending proposal counts.
- Points awarded by department.
- Employee points ranking.
- Redemption summary.
- Gift stock summary.

Operation logs must include:

- Login.
- Proposal create/update/delete/review.
- Points adjustment.
- Redemption review/issue.
- Gift maintenance.
- Import operations.
- Annual clearing.

Logs are admin-only and read-only in the mini-program.

## Notifications

First phase uses in-app notifications:

- Proposal submitted.
- Review pending.
- Review result.
- Finance review result.
- Committee approval result.
- Points credited.
- Redemption result.
- Annual clearing reminder.

WeChat subscription messages are deferred to a later phase because they require production AppID setup and user authorization flows.

## Technical Architecture

Frontend:

- Native WeChat mini-program.
- Role-aware pages and data filtering.
- Uses backend token authentication.
- Uses `wx.request` and `wx.uploadFile`.

Backend:

- Existing Node.js HTTP server evolves into the mini-program API backend.
- Existing business rules and status machine are reused.
- Add mobile-friendly endpoints where current endpoints are too coarse.

Data:

- Current JSON database is acceptable for prototype/demo.
- Production should move to SQLite or MySQL before real company-wide use.

Files:

- Prototype can store uploads under local server upload directory.
- Production should use controlled server storage or object storage.

Authentication:

- Current token mechanism remains for prototype.
- Add token expiry, password change, and password reset before production.

Deployment:

- Mini-program production requires HTTPS domain.
- Server, domain, ICP filing, and SSL are customer responsibilities.
- WeChat mini-program request domain must be configured in the official mini-program console.

## Current Implementation Gap

Already available:

- Core backend proposal APIs.
- Employee import.
- Account/password rule.
- Review committee flag.
- Proposal base flow.
- Points calculation.
- Redemption base flow.
- Mini-program skeleton pages.

Missing or incomplete:

- Mini-program department evaluation form.
- Mini-program finance review form.
- Mini-program lean office review form.
- Attachment/image/Excel upload from mini-program.
- Mini-program organization import.
- Mini-program gift maintenance.
- Mini-program redemption review and issue.
- Mini-program reports.
- Mini-program operation logs.
- Annual clearing task.
- Password change.
- Formal database migration.
- Production deployment and WeChat domain setup.

## Delivery Strategy

Recommended implementation order:

1. Stabilize backend rules and authentication for mini-program use.
2. Complete mini-program proposal workflow end to end.
3. Complete points, redemption, and gift operations.
4. Complete organization import and admin management.
5. Complete reports, logs, annual clearing, and password management.
6. Prepare production deployment requirements and WeChat release checklist.
