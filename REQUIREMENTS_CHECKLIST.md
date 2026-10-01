# Performance Platform — Requirements Checklist

**Source:** [Performance Platform Brainstorming_ Master Doc.md](./Performance%20Platform%20Brainstorming_%20Master%20Doc.md)  
**Compared against:** current codebase (client + server) as of checklist creation  
**Legend**


| Mark  | Meaning                                             |
| ----- | --------------------------------------------------- |
| `[x]` | Implemented in the platform                         |
| `[ ]` | Not implemented / not wired end-to-end              |
| `[~]` | Partial — core pieces exist; gaps called out inline |


**Notes**

- “Done” means product behaviour exists in code (UI and/or API), not that content (rubrics, live email delivery, Revolut migration) is finished operationally.
- Policy/process-only items (e.g. arrears date Feb 28) are marked done only when the platform supports them; calendar policy alone is left open.
- Phase 2 modules are listed for tracking even when intentionally out of V1 scope.

---

# Requirements overview (re-audit)

Only **remaining** work. Shipped items were removed after a codebase re-scan. Module detail sections below still hold full wording.

**Verdict key:** Partial · Open · Ops/content · Decide · Deferred (P3)


| Area                 | Item                                                                             | Verdict                                                                                                    | Reality check                                                                                            |
| -------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **P0 Content**       | Skills library + level rubrics                                                   | **Partial**                                                                                                | Seed skills now have Poor→Expert rubric text; org may still need PTR wording sign-off + more roles       |
|                      | Unmapped-role skills rule                                                        | **Parked**                                                                                                 | All 154 live roles already have skills; only edge case is people with no role                            |
|                      | Q1 2026 Performing seed + badge                                                  | **Partial / Ops**                                                                                          | **Badge shipped** on annual Q1 row; prod one-time Performing seed still ops                              |
| **P1 Goals**         | Admin UI to add metric units                                                     | **Open**                                                                                                   | Fixed `METRIC_UNITS` list only                                                                           |
|                      | Re-approval after manager change                                                 | **Partial**                                                                                                | Inheritance + edit path exist; no dedicated “request re-approval”                                        |
|                      | Notice-period exclusion                                                          | **Open**                                                                                                   | `excludeNoticePeriod` flag unused in eligibility                                                         |
|                      | Dedicated Goals check-in rating UX                                               | **Partial**                                                                                                | Rating lives on review packet/scorecard; Goals API exists — no first-class Goals check-in screen         |
|                      | Bulk approve many reports                                                        | **Open**                                                                                                   | Per-person only                                                                                          |
|                      | Leaver = PTR-only everywhere                                                     | **Partial**                                                                                                | Goals hide inactive; People/search/reviews not fully locked                                              |
|                      | OKR RACI multi-dept visibility                                                   | **Open**                                                                                                   | Dept/wing scope only; RACI cross-dept undecided                                                          |
| **P1 Dashboards**    | Manager / tree / HOD / PTR / HRBP compliance dashboards                          | **Partial**                                                                                                | Analytics + queues exist; not role-complete dashboards                                                   |
|                      | Goals/compliance CSV export                                                      | **Open**                                                                                                   | Calibration CSV ≠ goals compliance export                                                                |
|                      | Analytics vs old FN dash + allowlist                                             | **Partial / Ops**                                                                                          | Analytics allowlist-gated; parity/retire is a decision                                                   |
| **P1 Reviews**       | Rating release Option C (window + auto)                                          | **Partial**                                                                                                | Schedule UI + **cycle stage scheduler** auto-publishes at Goes-live; restart API to pick up               |
|                      | TR/Finance merit export                                                          | **Partial**                                                                                                | Calib CSV has grades; not grade+promo Y/N TR package                                                     |
|                      | Appeals in-product                                                               | **Partial / Decide**                                                                                       | UI/API exist but **forced off** — enable Option B or keep offline                                        |
|                      | Named Feb milestones automation                                                  | **Partial**                                                                                                | Dates configurable; no named policy/comms job                                                            |
|                      | Calibration close → publish gate                                                 | **Done**                                                                                                   | Scheduler locks sitting after calib end; release API + Publish now blocked until lock                    |
|                      | Weighted suggest vs “no recommend”                                               | **Ops / Decide**                                                                                           | Product already uses weighted suggest — needs sign-off, not rebuild                                      |
|                      | “Do I feel valued or heard?”                                                     | **Ops / Decide**                                                                                           | Add or park permanently                                                                                  |
|                      | Extreme-band narrative only (U/E)                                                | **Partial**                                                                                                | Override/gap rules exist; not U/E-only narrative gate                                                    |
|                      | Q1 transition badge everywhere                                                   | **Partial**                                                                                                | Badge on annual Goals quarters; expand if it appears elsewhere                                           |
| **P1 Calibration**   | Full auto-flag set                                                               | **Partial**                                                                                                | Consecutive high/low, drop 2+, gap, unsat-no-PIP; missing post-PIP Exceeding / retention / Q4 trajectory |
|                      | Skills/values-specific gap flags                                                 | **Partial**                                                                                                | Overall gap only                                                                                         |
|                      | HOD↔HRBP then HOD↔SLT stages                                                     | **Ops**                                                                                                    | One calib UI; second meeting is process                                                                  |
|                      | Calibration without HOD                                                          | **Open**                                                                                                   | No HRBP-leads mode                                                                                       |
|                      | Forced distribution hard caps                                                    | **Decide / Deferred**                                                                                      | Guidance exists; hard caps = Phase 2 unless you decide otherwise                                         |
|                      | Audit-trail completeness                                                         | **Partial**                                                                                                | Strong activity log; not proven on every unlock/edit                                                     |
| **P1 RBAC**          | Named HRBP / HRBP Lead / HOD approve                                             | **Open**                                                                                                   | Today `admin_read` / `admin_write` + manager — not named personas                                        |
|                      | User timezone display pass                                                       | **Partial**                                                                                                | Browser TZ helpers used widely; no stored employee TZ                                                    |
| **P1 Skills/Values** | Skills N/A per employee                                                          | **Open**                                                                                                   | Role mastery has N/A concept; grading path doesn’t exclude one skill from average                        |
|                      | Values gap only in calibration                                                   | **Partial**                                                                                                | No blocking values modal; calib shows overall gap                                                        |
|                      | 2026 values period (calendar vs Q2–Q4)                                           | **Open**                                                                                                   | Not encoded as cycle policy                                                                              |
|                      | Notice-period for values/annual                                                  | **Open**                                                                                                   | Same unused exclusion flag                                                                               |
| **P2**               | OQ decisions / Q1 adj exception / bulk pre-fill / endorsement                    | **Ops / Decide**                                                                                           | Then maybe build                                                                                         |
|                      | Transfer mid-quarter UX / leave-resign wizards                                   | **Partial**                                                                                                | Org move + leave/exclusions exist; no dedicated wizards                                                  |
| **Ops**              | Revolut migration, cutover, UAT, retire old dash                                 | **Ops**                                                                                                    | Not feature build                                                                                        |
| **P3**               | AI, PIP/probation/promo workflows, nine-box, custom skills, blocked status, etc. | **Deferred**                                                                                               | Do not block Jan 2027                                                                                    |


### What is still worth building (short list)

1. **Q1 2026 Performing seed** (ops) — transition badge on annual quarters shipped; unmapped-role rule parked (all roles mapped)
2. **Notice-period / leaver PTR-only** enforcement across surfaces
3. **Dashboards + compliance CSV + Analytics RBAC** (or keep allowlist and document)
4. **TR merit export** (calib close → publish gate + auto-release shipped)
5. **Named HRBP/HOD roles** and remaining Goals polish (units admin, bulk approve, RACI decision)
6. **Appeals / weighted-suggest / feel-valued / forced-dist** — decide, then tiny code or none

---

## 0. Platform Principles & Non-Goals

- [x] Single system of record for goals, check-ins, annual appraisals, calibration, performance data
- [x] OKR platform remains separate (read-only reference only in goals)
- [x] Human judgment over automation — manager enters grades; completion % shown as reference

- [~] Audit trail on edits, approvals, rating changes — activity log + goal/review history exist; not every domain event may be equally covered

- [x] Dates, cycles, templates configurable without developer intervention (cycle/group settings)
- [x] Users cannot see own rating until publish/calibration gate allows it

- [~] Data retained permanently; inactive/leaver profiles PTR-only — retention model exists; full leaver lock-down needs ops verification

- [x] Not an OKR platform
- [ ] AI goal writing / AI-assisted review — Phase 2 (out of scope)
- [x] Cross-functional goal cascading / dual reporting excluded from V1 (direct line manager only)

- [~] UTC system time with user timezone display — dates stored/handled; full timezone UX not verified as complete

- [x] Concurrent independent cycles / population extensions supported

---

## 1. Module 1 — Goal Management

### 1.1 Roles & RBAC

- [x] Employee can create / edit / submit own goals
- [x] Manager can create / edit / approve / send back for reports
- [x] Senior manager / tree viewers get read-only reporting-line access (org + goals visibility via reporting tree)

- [~] HOD approve in edge cases — HOD can view dept; dedicated HOD-only goal approve path not separate from manager/admin rules
- [~] HRBP dept view-only — platform uses `platform.read_all` / org tree more than a dedicated HRBP goal role
- [~] HRBP Lead create/edit/submit without approve — covered via admin/write permissions, not a distinct HRBP Lead role matrix

- [x] PTR Admin full access (read/write all)
- [x] Access follows real-time direct reporting line
- [x] Delegation is manual (acting manager), not automatic
- [x] No user sees own performance rating before release (review visibility rules)

### 1.2 Stage 1 — Cycle opens & OKR setup

- [x] Goal window opens/closes on configurable dates (not hard-coded Day 1 / Day 30)
- [x] Concurrent cycles and per-population extensions
- [x] OKR read-only reference panel in goal UI

- [~] OKR visibility respects OKR-platform RBAC — connection + fetch gated; full RACI multi-dept edge case still open

- [x] V1 read-only OKR panel
- [x] V2-style apply OKR / KR into goal draft (drag/apply) — **built ahead of V2 label**

- [~] Automated reminders Day 7 / 14 / 25 — notification rules/catalogue exist; scheduled email/ClickUp delivery worker not verified

- [ ] Manual blast to non-submitters only (template + audience picker)

- [~] Email + ClickUp channels — channel types exist in rules; actual ClickUp/email send not implemented

### 1.3 Stage 2 — Employee batch goal creation

- [x] Draft all goals in one session with auto-save
- [x] Copy from prior cycle as draft (not auto-submitted)
- [x] Fields: Description, Measurements, Weightage, linked/cascaded goal
- [x] Process / Priority / Type tags removed from UI
- [x] Minimum 2 goals hard block
- [x] No hard maximum; advisory warnings below 3 / above 5 (recommended range)
- [x] Goal weights must sum to 100% to submit
- [x] Minimum 1 measurement per goal
- [x] Milestones (checklist) and metrics (numeric) supported; mixed allowed
- [x] Metric strategies: keep less than / more than / in between / numeric targets
- [ ] Custom measurement formulas — deferred V2
- [x] Measurement weights sum to 100% within a goal
- [x] Predefined metric units (%, number, days, currency, etc.)

- [~] Only PTR Admin can add new units — unit list is product-defined; admin “add unit” UI not confirmed

- [x] Single measurement auto-weights to 100%
- [x] Submit All batch action with validation blockers

- [~] One notification to manager per batch submit — in-app/event emit exists; email delivery incomplete

- [x] Cascaded goals show visual/link indicator
- [x] Clicking away does not lose draft (debounced save)

### 1.4 Stage 3 — Manager batch approval

- [x] Manager team queue; work one employee submission at a time
- [x] Approve entire batch / send back entire submission (not per-goal approve)
- [x] Manager can edit description, measurements, weightage; add/remove measurements; comments

- [~] Employee notified of manager edits — notification events exist

- [x] No formal employee acknowledgement required after manager edits
- [x] Delegation: assign acting manager; audit-friendly; reporting manager unchanged
- [ ] Manual reminder blast UI (template + non-submitters only)
- [ ] Multi-employee “approve all reports” bulk action (per-person approve only)

### 1.5 Stage 4 — Day 30 non-lock (post-window)

- [x] Configurable deadline (product “Day 30”)
- [x] Post-deadline changes require 2-level approval (manager → manager’s manager)
- [x] Late first-time submission: 2-level approval + mandatory justification

- [~] PTR / plus-one / plus-two notified past deadline — rules keys exist; full auto escalation incomplete

- [x] Per-cycle / per-population deadline extensions

- [~] No submission → flagged incomplete — demo/helper + status supported; production cron/job to auto-flag at lock incomplete

- [x] Missing quarter treated as zero in annual goals rollup when applicable

### 1.6 Stage 5 — Progress updates

- [x] Real-time progress updates on metrics and milestones

- [~] Last-15-days-of-quarter auto reminders — catalogue/rules; delivery scheduling incomplete

- [x] Late progress updates allowed for configurable days into next quarter
- [x] Manager can view team/employee progress without per-update spam notifications
- [x] Manager can adjust progress; changes logged
- [x] Last-updated / stale (>7 days) visual indicator
- [ ] External dashboard auto-population API — deferred V2
- [ ] “Blocked” goal status flag — explicitly not required V1

### 1.7 Stage 6 — Quarterly check-in (Q1–Q3)

- [x] Check-in window configurable via cycle/stage dates
- [x] No system-suggested quarterly grade from completion alone (manager judgment)
- [x] Manager sees per-goal and overall completion %

- [~] Quarter rating on 5-tier scale — API + types exist; primary UX is review/scorecard path rather than a dedicated Goals check-in rating screen

- [x] Free-text / feedback fields available in review packet flow
- [x] No employee self-rating on quarterly check-ins
- [x] No standalone Q4 check-in; Q4 rated inside annual
- [x] Cycles/groups can run independently per population
- [x] Rating visibility gated until release/publish rules allow

- [~] Manager change mid-quarter: new manager inherits goals; re-approval via 2-level — inheritance via reporting line works; explicit “request re-approval” workflow partial

### 1.8 Stage 7 — Annual appraisal connection (from goals)

- [x] Q1–Q3 ratings auto-populate into annual as read-only linked quarters
- [x] Q4 rated by manager inside annual review
- [x] Equal weight across applicable quarters
- [x] Missing submission quarter = 0 and still counted when applicable

- [~] Full-quarter leave “O” rating assigned by PTR and excluded — leave/grade handling exists in annual quarters UI; dedicated “O / Leave” PTR workflow to confirm completeness
- [~] Q1 2026 pre-marked Performing for all — supported in data/seed/demo patterns; one-time ops seed not a permanent product feature

- [x] Equal quarterly weights for normal years

### 1.9 Stage 8 — Goal reporting & dashboards

- [~] Replace legacy FN performance dashboard inside platform — Analytics page exists (allowlisted); not full role-specific goal compliance suite
- [~] Real-time goal submission / approval compliance % by team/dept — partial via analytics/home/goals queues
- [~] Manager dashboard: team progress, submission, check-in — Goals + Home + scorecards cover parts

- [ ] Manager’s manager cascaded tree dashboard (explicit tree compliance view)
- [ ] HOD department goal compliance dashboard
- [ ] PTR org-wide goal quality + compliance dashboard

- [~] Data exportable — some exports/CSV paths exist in reviews/career; goals compliance export TBD

### 1.10 Stage 9 — History & leavers

- [x] Goal / performance history on employee profile
- [x] Reporting-line change updates who can see current data

- [~] Leaver inactive; PTR-only access — employee inactive flags exist; enforce “PTR only” consistently across all surfaces

### 1.11 Goal edge cases

- [x] Late joiner eligibility vs cycle day-1 / quarterly day-25 rules (configurable eligibility helpers)
- [ ] Probation-specific goal framework — Phase 2 (same process for now)

- [~] Manager change mid-quarter inherits goals; 2-level to reopen

- [x] Post-deadline delete/edit with 2-level approval path

- [~] Employee transfer mid-quarter — goals follow person via org; dedicated transfer UX not separate

- [x] Pending approval past deadline escalates to 2-level
- [x] Manager leave → PTR can assign delegate
- [x] Employee leave during check-in — manager can still rate (employee not required)

- [~] Notice-period exclusion from goal setting — policy flags exist; case-by-case PTR enforcement partial

- [ ] Revolut Q4 transition cutover (ops/migration, not product feature)
- [ ] Revolut Q2/Q3 data migration + UAT sample validation (ops)

### 1.12 Module 1 — Extra Covered

- [x] Optimistic concurrency / expectedVersion on goal mutations
- [x] Mentions in goal comments
- [x] Proof link fields on measurements
- [x] Duplicate single goal to another cycle
- [x] Goal submission blockers UI with clear reasons
- [x] Post-window policy toggle: hard stop vs two-tier approval
- [x] Cascaded goal placeholder / incomplete cascade naming safeguards
- [x] Realtime invalidation after goal writes
- [x] Demo phase helpers for local/dev flows

---

## 2. Module 2 — Performance Review

### 2.1 Roles (annual)

- [x] Employee submits self-review (goals / skills / values / overall as configured)
- [x] Manager rates reports (Q4, skills, values, final)

- [~] Senior manager calibration input / tree view — calibration + reporting tree; not a full “endorsement” stage

- [x] HOD / HRBP participate via calibration (no separate HOD gate)
- [x] PTR Admin override / unlock / reassign capabilities (admin write paths)
- [x] Dual reporting rejected — real-time direct manager (+ delegation cover)

### 2.2 Stage 1 — Annual cycle opens

- [x] Configurable annual cycle open dates
- [x] Eligibility: join on/before Oct 1 cutoff + ≥1 rated linked quarter
- [x] Scorecard pillar weights configurable (default 50/25/25)

- [~] Notify all employees on open (email + ClickUp) — events/rules; delivery incomplete

- [x] Flexible scorecard templates / question bank (Google-Forms-like forms editor)
- [x] Different templates/policies per cycle group

### 2.3 Stage 2 — Employee self-review

- [x] Employee sees Q1–Q3 ratings locked; Q4 progress without Q4 rating yet

- [~] Q1 2026 “Performing” transition badge/tooltip — badge on annual Goals quarter row (“Transition Quarter”); one-time Performing seed still ops

- [x] Self-rate goals (annual), skills (per skill), values (per value), overall grade
- [x] Parallel self + manager stages
- [x] Manager blinded from self-review until manager has also submitted
- [x] Late self-review: manager proceeds; shown as not submitted (Option A)

- [~] Configurable narrative questions / visibility — form questions supported; exact prompt content still product content

- [ ] Mandatory “Do I feel valued or heard?” question — not locked as default content
- [x] Self-review deadline / edit lock after stage end (PTR/admin override via write-all)
- [x] Strengths & development (and similar feedback) supported on packet

### 2.4 Stage 3 — Manager review

- [x] After own submit, manager can see employee self-review
- [x] Rate Q4 goals; system rolls up annual goals score from applicable quarters
- [x] Annual goals component treated as calculated / not freely regraded as the override path for overall (goals read-only intent; overall override with reason)
- [x] Rate each skill
- [x] Rate each core value
- [x] Suggested final from weighted pillars; manager confirms or overrides with mandatory justification
- [x] Manager mandatory questions: flight risk / retain + engagement (LM/HOD visibility; hidden from employee)
- [x] Mandatory strengths + areas of improvement
- [x] Manager deadline hard-lock behaviour; force-move when missed (annual)

- [~] HOD can assign ratings without manager input after miss — force-move + calibration/admin paths; dedicated HOD “complete manager review” wizard partial

- [ ] Large-team bulk pre-fill tools for 15+ reports

- [~] Significant self vs manager gap ≥2 tiers mandatory comment — deferred to calibration indicators more than manager submit gate
- [~] Per-pillar narratives mandatory only for extreme ratings — feedback packing + validation exist; exact extreme-band rules may still refine

### 2.5 Stage 4 — HOD review

- [x] Separate HOD stage collapsed into calibration (no mandatory pre-calibration HOD gate)

### 2.6 Stage 5 — Calibration (annual touchpoints in M2)

- [x] Calibration opens after manager window; dedicated calibration area
- [x] HRBP/HOD-oriented views: ratings, distribution, side-by-side comparisons
- [x] Rating changes during calibration with audit/governance

- [~] After close, only PTR/admin changes with acknowledged override — locked session + admin override path
- [~] SLT final calibration approval workflow — process supported by sessions/locking; no separate “SLT approval” product stage

- [x] Audit logging for calibration grade changes
- [x] Employee rating visibility gated until publish

- [~] Auto-flags (consecutive high, drop 2+ tiers, post-PIP Exceeding, self/manager gap, retention) — indicator framework exists; not every proposed trigger may be complete

- [ ] Nine-box (Performance × Potential) — deferred

- [~] Forced distribution — guideline/distribution reference exists; hard caps not enforced

- [x] Formal calibration close deadline enforcement (Feb 7 policy) as automated gate — scheduler locks sitting after calib stage end; publish blocked until lock

### 2.7 Stage 6 — Rating communication & sign-off

- [ ] Hard business dates Feb 15 close / Feb 28 arrears as automated platform milestones (configurable dates exist; named policy automation open)

- [~] Rating release mechanism (batch / manager window / auto at deadline) — publish controls + exclusions + **cycle stage scheduler auto-release** at Goes-live
- [x] No formal employee “I acknowledge” button required (view/timestamp approach preferred)

- [~] Appeal process — schema/UI paths exist but in-product appeals disabled (`appealOn = false`)
- [~] Merit increment export for TR (final grade + promotion yes/no) — career/grade data exists; dedicated TR CSV export workflow incomplete

- [x] Publication exclusions (publish all except listed people)

### 2.8 Final rating formula

- [x] Goals 50% + Skills 25% + Values 25% (configurable template)
- [x] Goals from Q1–Q4 applicable quarters equal weight
- [x] Goals component calculated for annual scorecard
- [x] Manager overrides final overall grade with mandatory written reason

- [~] “No system-recommended ratings” — completion % for goals; annual uses weighted_suggest for overall (product chose suggest-then-confirm, which differs from strict “no recommend” wording)

### 2.9 Review edge cases (many still policy-open)

- [~] Employee on leave during self-review — edit windows/admin override; no dedicated leave workflow
- [~] Employee resigns before self-review — exclusions / inactive; case-by-case
- [~] Employee on PIP during review — `onPip` display + policy flag; no full PIP gate

- [x] Manager change / delegation during review period
- [x] Manager reviewing team while also being reviewed (RBAC packet visibility)

- [~] HOD disagrees with manager rating — handled in calibration overrides

- [ ] Policy briefing: no verbal rating before release (process, not product)
- [ ] Department has no calibration (HOD absent) special mode
- [ ] SLT blocks promotion nomination escalation path
- [ ] Employee disputes final rating (formal appeal) — disabled in product
- [ ] Rating affects visa/immigration (out of product)
- [x] Leaver / notice-period publish exclusions

### 2.10 Module 2 — Extra Covered

- [x] Review packets with stage navigation and scorecard hero
- [x] Client + server submit validation parity
- [x] Overall grade reason when overriding suggestion
- [x] Manager missed-deadline auto force-move
- [x] Quarterly eligibility (join on/after day 25 of quarter)
- [x] Annual eligibility helpers wired into group membership UI
- [x] Grade publishing exclusions drawer
- [x] Scorecard form editor / custom questions library
- [x] Packet visibility redaction before publish
- [x] Cycles list, cycle groups, goals settings, review settings pages
- [x] Demo/seed stakeholder review data

---

## 3. Module 3 — Calibration (standalone)

> Master doc: high-level only; full design parked. Much of V1 behaviour was built from M2 Session #5 decisions.

- [x] Dedicated Calibration product area (insights + ratings)
- [x] Distribution / bell-curve guidance view
- [x] Heatmap / comparison / employee rating table + drawer
- [x] Calibrator assignments per department
- [x] Session lock / unlock governance
- [x] Override grades with reason when permitted

- [~] Auto-flag indicators for discussion cohorts

- [ ] Nine-box grid
- [ ] Hard forced-distribution caps
- [ ] Formal HOD↔HRBP then HOD↔SLT two-step product workflow
- [ ] Calibration edge-case playbooks as product rules (HOD absent, verbal leak, etc.)

### 3.1 Module 3 — Extra Covered

- [x] Calibration guideline math + guideline % on bands
- [x] Locked-override copy / admin acknowledgement path
- [x] Unsatisfactory-without-PIP style indicators
- [x] Cohort columns (e.g. last promotion metadata) on rating table

---

## 4. Module 4 — Analytics & Reporting

> Master doc: not designed; only “replace FN dashboard” confirmed.

- [~] In-platform analytics dashboard (allowlist-gated)
- [~] Review pipeline / grade mix / calibration hooks in dashboard builder

- [ ] Full role-based dashboards (Manager / Manager’s manager tree / HOD / PTR / HRBP) as specified in M1 Stage 8
- [ ] Org-wide goal quality analytics
- [ ] Formal export package for Finance/TR post-calibration
- [ ] Replacement parity with performance.nextventures.io (ops confirmation)

### 4.1 Module 4 — Extra Covered

- [x] Allowlisted Analytics route in app shell
- [x] Dashboard composition helpers tied to review/calibration data

---

## 5. Module 5 — Skills & Competency Library

- [x] Skills confirmed in V1 cycle (product includes skills pillar)
- [x] Skills library CRUD UI + server store
- [x] Role-anchored skills (competency matrix / inherited skills)
- [x] Per-skill rating in self + manager review
- [x] Skills pillar contributes to annual weighted overall

- [~] 3–5 skills per role operational content — platform supports; library completeness is content/ops
- [~] Rating scale (Poor→Expert mastery levels implemented; final org scale decision still noted as open in doc)
- [~] Equal weight across skills within pillar — averaging implemented; per-role priority weights not a first-class config

- [x] Behavioural rubric text per skill level — seeded for default library skills (PTR may refine wording)
- [ ] Default handling for unmapped roles at go-live (Performing / exclude / nearest family) as explicit product rule
- [ ] Skills N/A option per employee
- [ ] Skills gap auto-flag in calibration (dedicated) — partial via general indicators
- [ ] Custom employee-created skills with validation workflow

### 5.1 Module 5 — Extra Covered

- [x] Skills library under Reviews + Organisation skills surfaces
- [x] Skill form editor
- [x] Role skills drawer / matrix views
- [x] Seed skills support for demos
- [x] Remote skills API + local store

---

## 6. Module 6 — Core Values Assessment

- [x] Seven core values catalog in platform
- [x] 1–5 style grading with band behaviour guidance in catalog
- [x] Equal weight across values within 25% pillar (~1/7 each)
- [x] Employee and manager rate values in identical structure
- [x] Separate values comment / feedback support on scorecard
- [x] Values pillar score system-calculated from per-value grades (not free override of pillar)

- [x] Behavioural anchors 3–5 statements per score level — shipped in catalog/seed for all 7 values; optional PTR wording sign-off only

- [ ] Values self-rating gap only surfaced in calibration (flag) — comparison data exists; dedicated “values gap only in calibration” product rule partial
- [ ] Transition-year scope decision (calendar vs Q2–Q4) encoded as policy
- [ ] Notice-period inclusion rule for values specifically

### 6.1 Module 6 — Extra Covered

- [x] Values library UI + form editor
- [x] Server values store + seed
- [x] Scorecard values grade card with per-value scoring
- [x] Organisation Values page surface

---

## 7. Module 7 — Notification Engine

- [x] Event catalogue for goals + review lifecycle
- [x] Notification rules admin UI (enable/disable, channels) — **Settings → Notifications** manages every notification and reminder; **Required** rules (workflow must-sends) stay on and cannot be disabled
- [x] In-app notification feed / drawer
- [x] Browser (OS) notifications delivery hook
- [x] Email channel plumbing — same payload as in-app; outbox + worker; silent until `PLATFORM_SMTP_*` is set (`not_configured`, no catch-up spam)
- [x] ClickUp channel plumbing — same pattern; silent until token + list id
- [x] Configurable cadence scheduler (Day 7/14/25 + results reminder + deadline escalation) — `notificationScheduler.mjs`
- [x] Manual blast composer (non-submitters) — Goals overview + API

- [~] Review deadline reminders prototype helpers — client helpers still exist; server review cadence not fully ported

- [x] Production goal domain events create server notifications (submit/approve/send-back/manager edit)

### 7.1 Module 7 — Extra Covered

- [x] Realtime topic updates for notification rules
- [x] Goal/review event emitters on key writes
- [x] Settings panel for browser permission testing
- [x] Required / non-disableable rule flag — migration `00057`, defaults, API lock, Settings badge + locked switch

---

## 8. Module 8 — PIP & Performance Exit (Phase 2)

- [~] Employee `onPip` flag stored/displayed

- [ ] Start / manage / end PIP workflow UI
- [ ] PIP-triggered exit / performance process
- [ ] Auto-enrolment from Unsatisfactory / Developing ratings
- [x] Display-only PIP mark on profile/calibration (explicit non-workflow)

### 8.1 Module 8 — Extra Covered

- [x] Server career APIs for start/end PIP (backend capability ahead of UI)
- [x] Calibration indicator for unsatisfactory without PIP

---

## 9. Module 9 — Probation (Phase 2)

- [ ] Probation goal framework
- [ ] Probation review workflow

- [~] `excludeProbation` policy flag on review config (not enforced in membership UI)

- [x] Probation employees can still be included in annual if eligible by Oct 1 (no hard block) — aligns with D44

### 9.1 Module 9 — Extra Covered

- [x] Policy field reserved for future enforcement

---

## 10. Module 10 — Promotion & Career Pathing (Phase 2 / Phase 1 in summary table)

- [ ] Promotion nominations inside/after calibration
- [ ] Career ladders / pathing UI

- [~] Grade change kinds (promotion / lateral / demotion) on employee form

- [x] Last promotion date surfaces in profile/calibration columns
- [ ] SLT ratification workflow for nominations
- [ ] TR export “promotion yes/no” package

### 10.1 Module 10 — Extra Covered

- [x] Server `recordGradeChange` / career metadata APIs
- [x] Calibration cohort visibility for recent promotions

---

## 11. Cross-Cutting Confirmed Decisions (build tracking)

Use this as a quick regression checklist of locked decisions.

- [x] D05 Batch goal submission
- [x] D06 Min 2 goals; warnings <3 / >5
- [x] D07 Auto-save drafts
- [x] D08 Copy last quarter as draft
- [x] D09 Manager batch approval (per employee)

- [~] D10 Single consolidated notification per submission (emit yes; email delivery no)

- [x] D11 Day 30 not hard lock; 2-level approval
- [x] D12 Delegation manual by PTR/admin only
- [ ] D14 Revolut 2025 migration (ops)
- [x] D15 Option D annual flow
- [x] D16 50/25/25 formula

- [~] D17 No system-recommended ratings (goals completion reference yes; annual weighted suggest yes)

- [x] D18 Single final grade field
- [x] D19 Q1–Q3 auto-populate read-only
- [x] D20 Equal quarterly weights
- [x] D21 Missing quarter = zero counts

- [~] D22 Full-quarter absence “O” leave exclude
- [~] D23 Q1 2026 Performing for all (data/seed)
- [~] D24 Timeline to Feb 15 / arrears Feb 28 (dates configurable; named automation open)

- [x] D25 Parallel blinded review
- [x] D26 Annual goals score read-only; override final only
- [x] D27 Dual reporting rejected
- [x] D28 Cross-functional cascade excluded V1
- [x] D29 Process/Priority/Type tags removed
- [x] D30 Annual reviews; quarterly goal tracking
- [x] D32 No extensions for late annual manager reviews (force-move)
- [x] D33 HOD/HRBP update in active calibration; PTR after lock

- [~] D34 SLT final calibration approval

- [x] D35 Audit log for calibration changes
- [x] D36 Rating visibility gated until calibration/publish complete

- [~] D37 UTC + derived timezones
- [~] D38 Email primary V1; ClickUp V2

- [x] D39 Manager retain + engagement questions
- [x] D40 Annual eligibility Oct 1 + ≥1 rated quarter

- [~] D41 PTR owns values rubrics (platform ready; content ownership ops)

- [x] D42 HOD review collapsed into calibration

- [~] D43 One-time Q1 2026 overall adjustment exception

- [x] D44 Probation eligible for annual if Oct 1

- [~] D45 Total rewards extract only after calibration

- [x] D46 Flexible scorecard / question bank

- [~] D47 Quarterly calibration (HOD↔HRBP and HOD↔SLT) also in Q1–Q3 — calibration UI exists; quarterly-specific calibration process may still need product confirmation

---

## 12. Open Questions / Content Blockers (not code bugs)

Track until product owners close them. Do not treat as “missing features” until decided.

- [ ] OQ-01 Skills V1 vs Phase 2 — **Session #6 confirmed Skills V1; still flagged “requires revisiting” in doc**
- [ ] OQ-02 Core values rubric owner / content delivery
- [ ] OQ-03 Skills library coverage across all functions
- [ ] OQ-04 Manager review narrative rules (final exact triggers)
- [ ] OQ-05 Exact self-review question copy
- [ ] OQ-06 Calibration auto-flags + nine-box + forced distribution final set
- [ ] OQ-07 Appeal process policy (platform appeals currently off)
- [ ] OQ-08 Rating release mechanism final option
- [ ] OQ-09 Merit export format/owner/trigger
- [ ] OQ-10 HRBP edit vs challenge-only authority (partially implemented as shared calibrator access)
- [ ] OQ-18 Second approver includes HRBP or only manager’s manager? (**code: manager’s manager**)
- [ ] OQ-19 Multi-dept OKR RACI visibility

---

## 13. Platform Shell — Extra Covered (outside Modules 1–10)

These are implemented beyond the brainstorming module list and should stay on the project checklist.

### 13.1 Organisation & People

- [x] Organisation hub (departments, teams, roles, skills/values tabs)
- [x] Interactive org chart
- [x] People directory with filters / create / edit
- [x] Revolut-aligned employee / team / role sync surfaces
- [x] Role competency matrix & inherited skills
- [x] Team archive
- [x] Employee profile (overview, performance, team, skills card)
- [x] My Profile
- [x] Manager absence / acting-manager delegation card on profile

### 13.2 App shell & UX

- [x] Home orientation + action banners
- [x] Global search catalog (people, org, goals, cycles, scorecards, skills, …)
- [x] Breadcrumbs + navigation progress
- [x] Writing assistant / Pip contextual tips
- [x] Settings: appearance, access control, activity log, notification rules
- [x] Activity log drawers on goals / cycles / profiles
- [x] Realtime SSE client + live topic invalidation
- [x] Column visibility persistence on large tables
- [x] Resizable tables / dense data patterns

### 13.3 Engineering / ops affordances

- [x] Local demo/seed paths for goals, reviews, skills, values
- [x] Stakeholder demo seed script
- [x] Extensive unit tests around eligibility, visibility, submit validation, rollup
- [x] Platform base path `/platform/` + `publicUrl` asset rules

---

## 14. Suggested “Next Build” Priority

See **[Remaining actionable work](#remaining-actionable-work)** at the top of this file (P0 → P1 → Ops → P2 → P3).

---

*Generated from the Master Alignment Document (Modules 1–10 + Sessions #1–6 notes embedded therein) and a codebase comparison. Re-check items marked `[~]` when closing a release. When you finish an item, check it off in both the top work list and the matching module section below.*