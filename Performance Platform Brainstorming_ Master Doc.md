# Master Alignments

# **FN Group — Performance Platform Master Alignment Document**

**Classification:** Internal · People & Performance · PTR Lead  
**Status:** Working Draft — Pending Owner Review  
**Prepared:** 1 September 2026  
**Sources:** Master Brainstorming Document (Modules 1–10) \+ Sessions \#1–5 (6–21 August 2026\)  
**Prepared by:** Claude (AI analyst synthesis; all facts sourced, no decisions made)

---

# **1\. EXECUTIVE SUMMARY**

## **Purpose of the Performance Platform**

FN Group is building a proprietary performance management platform to replace Revolut (the incumbent third-party tool) ahead of the January 2027 annual appraisal cycle. The platform is not an OKR system — those remain separate. It is the single system of record for employee goal setting, quarterly check-ins, annual appraisals, calibration, and performance data across the \~500-person FN Group / Next Ventures organisation.

## **Major Modules and Their Roles**

The platform is scoped across ten modules. Only two have been substantively designed:

| Module | Description | Review Status |
| :---- | :---- | :---- |
| 1 — Goal Management | Goal creation, approval, progress tracking, check-ins, annual roll-up | **Fully reviewed — ready to build** |
| 2 — Performance Review | Self-review, manager review, calibration, rating release | **Partially reviewed — multiple decisions open** |
| 3 — Calibration | Standalone calibration workflow | **Not yet started** |
| 4 — Analytics & Reporting | Dashboard and export layer | **Not yet started** |
| 5 — Skills & Competency Library | Skill rubrics, rating, library | **Not yet started** |
| 6 — Core Values Assessment | Values rubrics and rating | **Not yet started** |
| 7 — Notification Engine | Automated and manual communications | **Not yet started** |
| 8 — PIP & Performance Exit | Performance Improvement Plans | **Phase 2** |
| 9 — Probation | Probation goal and review framework | **Phase 2** |
| 10 — Promotion & Career Pathing | Promotion nominations, career ladders | **Phase 1** |

## **Current State of Alignment**

Module 1 is substantially complete — the core flow, RBAC, rules, and edge cases are aligned. Build can proceed on the goal creation through check-in lifecycle. A small number of edge cases remain in the parking lot.

Module 2 has a confirmed foundational framework (formula, quarterly weights, annual flow Option D, parallel blinded review) but the bulk of the detailed design — manager review format, calibration mechanics, appeal, forced distribution, nine-box, and all edge cases — is either open or was discussed only at a high level in Session \#5 and not fully locked.

## **Most Important Confirmed Decisions**

1. Platform live January 2027 — non-negotiable.

2. OKR and performance platforms remain permanently separate.

3. Annual rating formula: Goals 50% \+ Skills 25% \+ Core Values 25%.

4. Annual appraisal flow: Option D (parallel self-review and manager review; no standalone Q4 check-in; Q4 rated inside annual review).

5. Quarterly ratings retained; equal weight (25% each, applicable quarters only).

6. Parallel blinded review locked: manager cannot see employee self-review until manager submits own.

7. No system-recommended ratings — manager judgment only, goal completion % shown as reference.

8. Day 30 goal lock is NOT a hard lock — changes require 2-level approval.

9. Q1 2026 \= “Performing” for all employees (transition year).

10. Data migration from Revolut is the final project step (Q2 \+ Q3 2025 data \+ Q4 goals up to 15 Dec).

## **Highest-Priority Unresolved Questions**

1. **Skills: V1 (Jan 2027\) or Phase 2?** Awaiting SLT / “L” decision. Go-live blocker.

2. **Skills library completion:** HRBP building 3–5 skills per role; only 5 functions targeted by Q3 end. Is this enough for Jan 2027?

3. **Core value rubrics:** PTR owns definition — content not yet written. Go-live blocker.

4. **Elvira’s participation:** Proposed Values owner has declined all 5 sessions. Fallback owner must be assigned today.

5. **Manager evaluation format:** The entire manager review stage design was deferred from Session \#5.

6. **Appeal process:** Never discussed. Must be decided.

7. **Calibration mechanics:** Auto-flags, forced distribution, nine-box — all deferred.

8. **HOD review as a separate gate vs. collapse into calibration:** Discussed but not locked.

## **Ready to Move Forward vs. Blocked**

| Area | Status |
| :---- | :---- |
| Goal creation and approval UI build | **✅ Ready — proceed** |
| Goal RBAC implementation | **✅ Ready — proceed** |
| Progress tracking and check-in flow | **✅ Ready — proceed** |
| Data migration scoping | **✅ Ready — Jawad to scope** |
| Notification engine (email V1) | **✅ Ready — email first** |
| Annual appraisal framework and Q1–Q3 auto-population | **✅ Ready — proceed** |
| **Self-review UI (structure confirmed; questions TBD)** | **⚠ Partially ready — questions unresolved** |
| Manager review stage design | **❌ Blocked — not yet brainstormed** |
| Skills module (library, rating, rubrics) | **❌ Blocked — SLT decision and library content pending** |
| Core values module | **❌ Blocked — rubric content not written** |
| Calibration dashboard | **❌ Blocked — mechanics not designed** |
| Nine-box, forced distribution | **❌ Deferred to a future session** |
| Appeal process | **❌ Never discussed** |
| Modules 3–10 (except Analytics) | **❌ Not yet brainstormed** |

---

# **2\. PLATFORM OVERVIEW**

## **Who the Platform Serves**

The platform serves approximately 500 confirmed, active FN Group employees across multiple countries (Bangladesh, Malaysia, UAE, UK, and others). Users include:

* **Employees** — create goals, update progress, complete self-reviews.

* **Managers** — approve goals, conduct check-ins and annual reviews.

* **Senior Managers** — view their reporting tree (read-only).

* **HODs (Heads of Department)** — view, approve in edge cases, participate in calibration.

* **HRBPs** — view their assigned populations, participate in calibration, generate and analyse data.

* **HRBP Lead** — cross-department access, calibration oversight.

* **PTR Admin / Super-Admin** — full platform access; override, unlock, delegate, and audit.

## **Core User Journeys**

**Employee journey:** Start of quarter → Set 2–5 goals (referencing OKR panel) → Submit batch → Manager approves or returns → Update progress throughout quarter → End-of-quarter update → Manager check-in (Q1–Q3) → Year-end self-review → Receive annual rating.

**Manager journey:** Approve team goals (batch, within Day 30\) → Monitor team progress → Conduct quarterly check-ins → Rate Q4 goals inside annual review → Rate skills and core values → Submit final annual grade → Participate in calibration.

**PTR Admin journey:** Configure cycles → Monitor compliance → Handle exceptions, delegation, and overrides → Run calibration → Release ratings.

## **Intended Business and Operational Outcomes**

* Replace Revolut before January 2027 annual appraisal.

* Eliminate known Revolut failures: individual (not batch) goal submission, inability to know who has completed goal setting, premature rating visibility, no audit trail, limited concurrent cycle support.

* Enable real-time compliance tracking without manual dashboards.

* Support merit increment calculations (arrears 28 February 2027).

* Provide HRBP with department-level dashboards without edit access to ratings.

* Retain complete performance history permanently.

## **Relationships Among Modules**

* **Goal Management** feeds quarterly ratings into **Performance Review**.

* **Performance Review** aggregates all data into the annual appraisal and feeds **Calibration**.

* **Skills & Competency Library** and **Core Values Assessment** provide the rubric foundation for the 25% \+ 25% pillars of **Performance Review**.

* **Analytics & Reporting** reads from all modules.

* **PIP & Performance Exit** (Phase 2\) would be triggered by Unsatisfactory or Developing ratings from **Performance Review**.

## **Important Principles and Non-Goals**

**Principles (confirmed across sessions):** \- Human judgment over system automation — no auto-generated ratings. \- Audit trail on every edit, approval, and rating change. \- Flexibility by design — all dates, cycles, templates configurable without developer intervention. \- Users cannot see their own rating at any stage until calibration is complete. \- Data retained permanently; inactive profiles accessible to PTR only.

**Non-goals:** \- This is NOT an OKR platform. OKRs remain in a separate system (read-only reference only). \- AI goal writing and AI-assisted review are Phase 2\. \- PIP, probation, and promotion modules are Phase 2\. \- Cross-functional goal cascading and dual reporting are excluded from V1.

---

# **3\. MODULE-BY-MODULE SPECIFICATION**

---

## **3.1 Module 1: Goal Management \[FULLY REVIEWED\]**

*Sources: Brainstorming doc (Module 1), Sessions \#1 (6 Aug), \#2 (10 Aug), \#3 (12 Aug), \#4 (18 Aug)*

### **Purpose**

Manage the full lifecycle of employee goals: creation, manager approval, ongoing progress tracking, quarterly check-ins, and annual roll-up. Replaces Revolut’s goal management.

### **Users and Roles**

| Role | Create | Edit | Submit | Approve | View Only |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Employee | Yes (own) | Yes (own, pre-approval) | Yes | No | No |
| Manager | Yes | Yes (any at approval; post-approval via 2-level) | Yes | Yes | No |
| Senior Manager | No | No | No | No | Yes (full tree) |
| HOD | No | No | No | Yes (edge cases) | Yes (dept) |
| HRBP (dept) | No | No | No | No | Yes (dept) |
| HRBP Lead | Yes | Yes | Yes | No | Yes (all) |
| PTR Admin | Yes | Yes | Yes | Yes | Yes (all) |

**Key RBAC rules:** \- No user can see their own rating at any stage until calibration is complete. \- Access follows the real-time direct reporting line — changes immediately when manager changes. \- Leavers’ data: invisible to all except PTR Admin after profile is set inactive. \- Delegation: PTR Admin initiates manually; never automatic.

### **Core Workflow**

**Stage 1 — Cycle Opens and OKR Setup** \- Cycle opens Day 1 of quarter; goal window closes Day 30\. \- All dates are configurable per cycle (including concurrent independent cycles for different populations). \- OKR and performance platforms remain separate. OKR data appears as a read-only reference panel in the goal creation UI. RBAC for OKR visibility mirrors the OKR platform’s own permissions. \- V1: read-only OKR reference panel. V2: click-to-cascade from OKR into goal draft. \- Notifications: configurable automated reminders (Day 7, 14, 25 of cycle). Email \+ ClickUp. Manual blast also available (PTR selects template, sends to non-submitters only).

**Stage 2 — Employee Goal Creation (Batch)** \- Employee drafts all goals in one session (auto-save prevents loss). \- Goals can be copied from prior quarter (pre-filled draft; not auto-submitted). \- Goal fields confirmed: Description, Type, Priority, Weightage, linked/cascaded goal indicator. \- *Note: “Process,” “Priority,” and “Type” tags removed from UI in Session \#4 as causing confusion. Final confirmed field list: Description, Measurements, Weightage, linked goal.* \- Goal count: minimum 2 (hard block). No maximum. Warning popup if below 3; warning popup if above 5\. Warnings are advisory, not blocking above 2\. \- Goal weightage: must sum to 100% before submission is enabled. \- Each goal has: minimum 1 measurement. Measurements can be milestones (binary checklist) or metrics (numeric start → target). Multiple of each per goal; mixed allowed. \- Measurement types: keep “keep less than,” “keep more than,” “keep in between,” and numeric targets. Custom formulas deferred to V2. \- Measurement weightage: each measurement within a goal must sum to 100%. \- Metric units: predefined list (%, number, days, currency). Only PTR Admin can add new units. \- If only one metric per goal: system auto-sets it to 100% weightage. \- All goals submitted in one batch action (“Submit All” button). System blocks submission until: ≥2 goals, all goal weights sum to 100%, all measurements included. \- One notification to manager per employee batch submission (not per goal). \- Cascaded goals display a visual indicator (icon) to distinguish them from individually created goals. \- Auto-save confirmed: clicking away does not lose data.

**Stage 3 — Manager Batch Approval** \- Manager sees full team queue; one employee at a time; “next” to move through. \- Manager actions: Approve all, edit (description, measurements, weightage), add/remove measurements, add comments, send back entire submission. \- Manager can only approve entire batch — not individual goals within a batch. \- If manager edits anything: employee automatically notified of all changes. \- If manager sends back: entire submission returns (not individual goals). \- No formal employee acknowledgement required after manager edits — notification only. \- Delegation: PTR Admin assigns delegate if manager absent. Delegate has same rights. Audit logged. Manager does not change in system; responsibility delegates. \- Reminder cadence: Manual blast (PTR selects template, timing, recipients) \+ configurable automated reminders.

**Stage 4 — Day 30 Non-Lock** \- Day 30 is the standard goal-setting deadline. \- After Day 30: goals are NOT hard-locked. Any change (edit, add, delete) requires 2-level approval: direct manager \+ manager’s manager. \- Post-Day-30 submission (never submitted before lock): treated as a late submission; same 2-level approval required; mandatory justification field; manager notified. \- PTR notified when goals remain unapproved past Day 30\. System auto-notifies plus-one and plus-two. \- Day 30 date is configurable per cycle (can be extended for specific teams/populations without affecting others). \- No submission by Day 30: profile flagged as “incomplete.” Zero score for that quarter (still counts in annual average).

**Stage 5 — Progress Updates Throughout Quarter** \- Employees can update progress in real-time or by cadence (weekly/monthly). \- Last 15 days of quarter: automated reminders to update goals to final status. \- Late updates: permitted in first 7 days of following quarter (for CPM, BI, Marketing teams specifically). \- Manager visibility: can view team progress in real time via employee profile. No notification on each employee update. \- Manager can adjust employee progress updates (e.g., if employee absent). All adjustments audit-logged. \- “Last updated” indicator shown on each goal — goals not updated in \>7 days flagged visually at check-in. \- API for external dashboard auto-population: deferred to V2. \- “Blocked” goal status flag: not required in V1.

**Stage 6 — Quarterly Check-In (Q1, Q2, Q3 only)** \- Check-in window: opens Day 1 of following quarter; closes Day 15\. Configurable. \- No system-suggested rating — manager applies independent judgment. \- Manager sees: goal completion % per goal, weighted overall completion %. System shows the data; manager makes the rating call. \- Quarter rating: 5-tier scale (Exceptional / Exceeding / Performing / Developing / Unsatisfactory). \- Free-text comment box per check-in. \- No employee self-rating at quarterly check-in. Employee self-rating at year-end only. \- No standalone Q4 check-in. Q4 rating happens inside annual appraisal. \- Check-in runs independently per population — senior leader delay does not block rest of org. \- Rating visibility: not released to employee until manager or PTR releases it. \- Manager change mid-quarter: new manager inherits approved goals as-is. Can request re-approval via 2-level process.

**Stage 7 — Annual Appraisal Connection** \- Q1–Q3 ratings auto-populated into annual appraisal as read-only. \- Q4 rated by manager as first step of annual review. \- Quarter weightage: equal weight, 25% each, for applicable quarters. \- Missing quarter (no submission): zero score. Still counts in the applicable quarter average. \- Example: employee present Q2–Q4 — each is 33.33% of the performance component. If Q2 had no submission → 0 out of 33.33%. \- Full-quarter absence (on leave entire quarter): PTR Admin manually assigns “O” (Leave) rating. System excludes that quarter from average. Not automatic. \- Q1 2026 \= “Performing” for all (transition year). System pre-marks. One-time exception this cycle: managers may adjust the overall final annual rating to account for Q1 outperformance. \- 2026 and 2027 onward: Q1=25%, Q2=25%, Q3=25%, Q4=25% (equal).

**Stage 8 — Reporting and Dashboards** \- Existing FN performance dashboard (performance.nextventures.io) is **discarded**. All functionality migrated into the new platform. \- Real-time compliance tracking: goal submission %, manager approval %, by team/dept. \- Manager dashboard: team goal progress, submission status, check-in completion. \- Manager’s manager dashboard: same as manager, plus cascaded view of direct manager reports (tree format). \- HOD dashboard: department-level goal progress and compliance. \- PTR dashboard: org-wide compliance, quality of goals, all statuses. \- Data exportable. Format and access TBD with Aminul (tech).

**Stage 9 — Goal History and Leaver Management** \- All goal and rating history retained permanently in employee profile. \- When reporting line changes: new manager gains full historical access; previous manager loses access immediately. \- Leaver profile: set to inactive. Only PTR Admin can access inactive profiles.

### **Business Rules and Logic**

| Rule | Decision |
| :---- | :---- |
| Minimum goals per quarter | 2 (hard block) |
| Maximum goals per quarter | None (warning above 5\) |
| Goal weight sum | Must equal 100% before submission |
| Measurement weight sum per goal | Must equal 100% |
| Post-Day-30 changes | 2-level approval required (manager \+ manager’s manager) |
| No submission by Day 30 | Zero score for that quarter; flagged incomplete |
| Full-quarter leave | “O” rating assigned by PTR; excluded from average |
| Missing quarter (zero submission) | 0 score; included in average with applicable weight |
| Delegation | PTR Admin initiates manually; never automatic |
| Rating visibility | Gated until manager or PTR releases |
| Own rating visibility | **Blocked at all stages for all users** |
| Data retention | Permanent |
| Leaver data access | PTR only after profile set inactive |
| Cycle management | Multiple concurrent cycles supported; all dates configurable |

### **Key Data / Fields**

Goal-level: Description, Weightage (% summing to 100%), Linked/Cascaded Goal Indicator, Created/Submitted/Approved timestamps, Status.

Measurement-level: Name, Type (Milestone/Metric), Unit (predefined), Target (numeric or binary), Current Value, Weightage within goal (% summing to 100%), Proof Link, Comments, Last Updated date.

### **Dependencies on Other Modules**

* OKR platform (read-only reference; API feed, respects OKR RBAC).

* Performance Review (M2) receives quarterly ratings from Goal Management.

* Notification Engine (M7) handles all reminders and alerts.

* Analytics & Reporting (M4) reads real-time goal data.

### **Edge Cases and Decisions**

| Edge Case | Decision |
| :---- | :---- |
| Late joiner (joins Day 25\) | Not eligible for current quarter; enrolled next quarter. |
| Probation employee goals | **Deferred to Phase 2 (probation module). Same process for now.** |
| Manager change mid-quarter | New manager inherits goals. Can request re-approval via 2-level process. |
| Goal becomes irrelevant (org restructure) | Deletable past Day 30 with 2-level approval. |
| Employee transfer mid-quarter | Goals transfer. Adjustment requires 2-level approval. |
| Day 29 submission, manager hasn’t approved by Day 30 | Shows as “pending approval.” Manager \+ manager’s manager must approve post-lock. |
| Manager on leave during check-in | PTR delegates to any person (team or outside). Delegate has same rights. |
| Employee on leave during check-in | Manager completes check-in. Employee not required. |
| Full-quarter leave | PTR assigns “O” rating manually. Excluded from annual average. |
| Employees in notice period | Can be excluded from goal setting. PTR decides case by case. |
| Q4 goal setting in Revolut | Q4 goals set in Revolut until 15 Dec 2026\. Progress updated in Revolut until 15 Dec. From 15 Dec onward: new platform. Q4 check-in and annual appraisal in new platform. |
| Data migration (Q2+Q3) | Migrate before January launch. UAT required first. 20% sample validation post-migration. Jawad leads. Validators: Angie, Fahim, Jawad, Aminul, CK. |

### **Confirmed Decisions**

All decisions in this module are confirmed across Sessions \#1–4 unless explicitly noted as open.

### **Tentative Decisions**

| Item | Tentative Decision | Status |
| :---- | :---- | :---- |
| V2 OKR auto-population (click cascade) | Build in V2 | **Tentative** |
| External dashboard API | V2 | **Tentative** |
| AI goal writing assistant | **Phase 2** | **Tentative** |
| Cascading goals (full cascade chain) | **Parking lot / Phase 2** | **Tentative** |
| Bandwidth calculation per goal | Future concept | **Tentative** |

### **Open Questions (Module 1\)**

1. **Who exactly is the second approver for post-Day-30 changes?** Manager \+ manager’s manager confirmed. But original doc referenced “manager \+ manager+1 AND HRBP.” Which is correct?

2. **Multi-department OKR visibility (RACI edge cases):** Employees RACI’d to OKRs in multiple departments — do they see only their department’s OKRs, or also the OKRs they’re RACI’d to?

3. **HOD goals approved by SLT:** Which SLT member approves which HOD? Is this mapping already captured in the org structure?

4. **Skills and operations vs. project-based weightage:** In parking lot. When will this be decided?

5. **Probation goal framework:** Phase 2 — but does the probation review process need to be aware of the new platform even in V1?

---

## **3.2 Module 2: Performance Review \[PARTIALLY REVIEWED\]**

*Sources: Brainstorming doc (Module 2 through boundary), Sessions \#3, \#4, \#5*

### **⚠️ REVIEW BOUNDARY NOTICE**

The user-defined reviewed portion of Module 2 covers the material **up to and including** the “Questions to Answer Today” section in the brainstorming document. All content from “CONFIRMED CARRYOVER — DO NOT REVISIT” onward in the brainstorming document is marked **NOT YET REVIEWED / DO NOT TREAT AS FINALIZED.**

However, Sessions \#3, \#4, and \#5 contain substantive decisions on many of these topics. Those session decisions are documented here with their source clearly labelled. Where a session decision addresses a brainstorming doc item that has not been formally reviewed in a group session against the doc itself, it is marked as a **session-based tentative decision**.

### **Purpose**

Manage the annual performance appraisal cycle: employee self-review, manager review of Q4 and annual performance, calibration, and rating release. Produces the annual rating used for merit increments and bonus.

### **Users and Roles**

*(From brainstorming doc — NOT YET REVIEWED against final doc; confirmed from Session \#5 context)*

| Role | Create/Submit | Edit | Approve | Rate/Score | View Only |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Employee | Self-review only | Own draft before submit | No | Self-rates Goals, Skills, Values \+ overall grade | Own profile, own Q1–Q3 ratings (post-release) |
| Manager | No | Ensure correct data before submit | No | Rates Q4 goals, Skills, Values, Final grade for reports | All direct reports |
| Senior Manager | No | No | No | Calibration input only | Direct \+ indirect reports |
| HOD | No | No | No (see Stage 4\) | Calibration only — challenge/adjust with HRBP | Full dept calibration view |
| HRBP (Dept) | No | No | No | Facilitates calibration — flag and challenge | Assigned depts only |
| HRBP Lead | No | No | No | Calibration — cross-department | All departments |
| PTR Admin | Yes (trigger cycles) | Yes (override, unlock, reassign) | Yes (override) | Yes (override any rating — documented reason required) | Full org — all stages |

**⚠️ RBAC NOTE — NOT YET REVIEWED:** The above matrix is from the brainstorming doc (not yet reviewed against the group). Session \#5 confirmed some elements (PTR overrides, HOD calibration authority, HRBP calibration role) but the full matrix has not been formally walked through.

### **Core Workflows**

#### ***Stage 1 — Annual Review Cycle Opens \[CONFIRMED\]***

* Opens January 1, 2027 (date adjustable).

* Population: all confirmed, active employees who joined on or before **October 1, 2026** and have at least one rated quarter. *(Session \#5: Oct 1 cutoff confirmed.)*

* PTR Admin confirms 50/25/25 weightage and locks before window opens.

* All employees notified: email \+ ClickUp.

* **Scorecard template:** Google-Forms-level flexible. Question bank/library approach. Templates, weightings, questions, and rating criteria all editable without developer intervention. Different templates can be assigned to different groups (Leadership Team vs. non-LT). *(Session \#5 confirmed.)*

#### ***Stage 2 — Employee Self-Review \[CONFIRMED — structure; questions TBD\]***

* **What employee sees:** Q1, Q2, Q3 ratings locked and visible. Q4 goal progress visible (completion %). No Q4 rating yet. Q1 2026 shows “Performing” (transition quarter — recommend tooltip/badge to clarify).

* **Self-review content:** Full-year narrative. Overall annual goal rating (5-tier; not per-goal or per-quarter). Skills rating (per skill). Core Values rating (per value). An overall self-rating for the full year.

* **Overall self-rating:** Employee can indicate a final rating for themselves annually along with separate ones for goals, skills, and core values. *(Confirmed in brainstorming doc and Session \#5.)*

* **Parallel blinded review:** Employee self-review and manager review run **simultaneously.** Manager **cannot** see employee self-assessment until manager has submitted their own review. **Locked in Session \#4.**

* **Late self-review:** If employee has not submitted by the deadline, manager proceeds without self-review — shown as “not submitted.” *(Session \#5: “Option A” confirmed.)*

* **Mandatory employee question (proposed):** “Do I feel valued or heard in the company?” Proposed in Session \#5 by HUDDLE 2\. Visibility settings TBD. **NOT FINALIZED.**

* **Self-review narrative prompts:** System must support configurable questions. Exact questions not yet finalized.

* **Deadline:** January 14 proposed (hard lock). PTR Admin override required after.

* **Q1 “Performing” badge:** Tooltip or badge recommended: “Transition Quarter — Standard Grade.” Aligned.

**\[NOT YET REVIEWED — Post-Boundary Material\]**

The detailed self-review question structure, exact prompts, and visibility controls are documented in the brainstorming doc’s Stage 2 section but have not been walked through as a group in the formal review process. Session \#5 addressed these at a high level. Full self-review content decisions require a dedicated session or async review.

#### ***Stage 3 — Manager Review \[NOT YET FULLY REVIEWED\]***

*High-level decisions from Sessions \#3–5:*

* After submitting own review: manager sees employee self-review \+ self-ratings.

* **Step 1:** Rate Q4 goals. System auto-calculates full-year annual goals score.

* **Step 2:** Annual goals score is **READ-ONLY** — manager cannot override the goals component. *(Session \#3 confirmed. Overrides the original doc language that implied manager could override.)*

* **Step 3:** Rate each skill. *(Scale and method TBD — see Skills section.)*

* **Step 4:** Rate each of the FN Core Values. *(Format TBD — see Core Values section.)*

* **Step 5:** System calculates suggested Final Rating. Manager confirms or overrides with mandatory written justification.

* **Manager mandatory questions:** (1) Is this person a flight risk / would the company do what it takes to retain them? (2) Is this person fully engaged in their role? **Visible to line manager and HOD only — not visible to employee.** *(Session \#5 confirmed.)*

* **Manager open-ended questions:** Strengths and areas of improvement (two required free-text fields). *(Session \#5 confirmed.)*

* **Manager deadline:** January 28 proposed (hard lock). **No extensions under any circumstances for annual cycle.** If manager misses deadline, system force-moves to next stage. HOD has authority to assign final ratings without manager input. *(Session \#5 confirmed — firm policy.)*

* **Narrative requirements (per pillar vs. overall):** Not decided. See Open Questions.

* **Retention flag:** Included as mandatory question (see above).

* **Large team efficiency tools:** Not decided.

**Items from brainstorming doc (NOT YET REVIEWED):** Manager review stage full flow, significant rating gap mandatory comment threshold, manager deadline specifics, large team efficiency tools.

#### ***Stage 4 — HOD Review \[TENTATIVE — Collapse into Calibration\]***

* **Recommendation from brainstorming doc:** Collapse into calibration (Option B). Saves 3–5 calendar days.

* **Session \#5 decision:** “Collapse into calibration.” *(Session \#5: “Collapse into calibration” confirmed.)*

* **Status:** Session-based tentative decision. Not walked through in formal doc review.

#### ***Stage 5 — Calibration \[PARTIALLY DECIDED\]***

* **Participants:** HRBP facilitates. Managers, HODs, and SLT attend per department. Each department calibrates together. *(Confirmed.)*

* **Opens:** After manager review window closes (Jan 28). Calibration opens immediately.

* **Process:** Cross-team rating normalisation. HRBP challenges where self-rating vs. manager rating discrepancy is significant.

* **View:** HRBP and HOD see all ratings. Distribution curve visible. Manager ratings \+ employee self-ratings side by side.

* **Who changes ratings:** During active calibration window: HOD and HRBP can update ratings directly in system (audit-logged). After cycle closes: PTR Admin executes rating changes. *(Session \#5 confirmed.)*

* **SLT final calibration:** HOD sits with SLT for final calibration approval after HOD ↔ HRBP calibration. *(Session \#5 confirmed from Project Red.)*

* **Audit log:** Required for all calibration changes. Critical gap in Revolut; mandatory in new platform. *(Session \#5 confirmed.)*

* **Rating visibility gating:** Employees cannot see ratings until the full calibration process is complete. *(Session \#5 confirmed.)*

* **Auto-flagged employees (calibration V1):** Not yet decided. Proposed triggers include: consecutive Exceeding/Exceptional 2+ cycles; rating drop 2+ tiers; post-PIP rated Exceeding; self vs. manager gap ≥2 tiers; retention flag. *(Open question.)*

* **Close deadline:** Must close before Feb 15\. Feb 7 proposed. *(TBD.)*

* **Nine-box:** Deferred to calibration module brainstorming. *(Session \#5.)*

* **Forced distribution:** Not discussed in Session \#5. Brainstorming doc flags it as low ROI / high overhead. No decision made. *(Open.)*

#### ***Stage 6 — Rating Communication and Sign-Off \[PARTIALLY DECIDED\]***

* **All 2026 ratings closed:** 15 February 2027\. *(Confirmed.)*

* **Arrears:** Merit increment processed 28 February 2027, effective January 2027\. *(Confirmed.)*

* **Rating release mechanism:** Not decided. Options include: PTR batch-releases all, or manager releases individually within a window, or auto-releases at deadline. *(Open.)*

* **Employee acknowledgement:** Not decided. Low ROI flag in brainstorming doc (timestamp view recommended over formal button). *(Open.)*

* **Appeal / rebuttal window:** Not discussed in Session \#5. Raised by Fahim but never addressed. *(Open — no decision.)*

* **Merit increment export to Finance (TR / Gordon):** Format, owner, and trigger not decided. *(Open.)*

### **Final Rating Formula \[CONFIRMED\]**

**(Goals × 50%) \+ (Skills × 25%) \+ (Core Values × 25%) \= Annual Rating**

* Goals component: auto-calculated from Q1–Q4 quarterly ratings (applicable quarters, equal weight).

* Goals component is **READ-ONLY** — manager cannot override it.

* Manager can only override the **FINAL overall annual grade** (with mandatory written justification).

* No system-recommended ratings displayed.

### **Skills Assessment \[BLOCKED — PENDING SLT DECISION\]**

| Item | Status | Notes |
| :---- | :---- | :---- |
| **Skills in V1 or Phase 2?** | **❌ OPEN** | Awaiting SLT/L decision. Go-live blocker. |
| Skills library structure | **❌ OPEN** | HRBP building 3–5 skills per role; 5 functions targeted by Q3 end. |
| Skills rating scale | **❌ OPEN** | Options: 5-tier, 4-level proficiency, 3-level. |
| Skills rating method | **❌ OPEN** | Per skill vs. skill clusters. |
| Skills library owner | Session \#5: HRBP creates skills; Angie leads job mapping | Not formally walked through in doc review. |
| Skills weightage | **❌ OPEN** | Equal weight per skill (recommended) vs. priority skill per role. |

**If Skills deferred to Phase 2:** Formula adjusts to Goals × 67% \+ Values × 33% (re-weighted) OR Skills defaults to “Performing” (3/5) for all — formula numerically unchanged, Skills becomes real in 2027\. *(Options B/C from brainstorming doc.)*

### **Core Values Assessment \[BLOCKED — RUBRICS NOT WRITTEN\]**

| Item | Status | Notes |
| :---- | :---- | :---- |
| Values rating method | **❌ OPEN** | Options: Behavioural anchors, rating scale per value, free text, or hybrid (recommended: Option D). |
| Values weightage | **❌ OPEN** | All 9 values equal weight (recommended) vs. weighted vs. consolidate to 5\. |
| Values self-rating | **❌ OPEN** | Identical format to manager for direct comparison (recommended). |
| Values rubric owner | PTR (Session \#5) | PTR defines “Performing” and “Exceeding” rubrics. HRBP reviews. |
| Values rubric content | **❌ BLOCKED** | **Not yet written. Go-live blocker.** |
| Elvira / People Excellence | **❌ BLOCKER** | Proposed owner has not attended any of 5 sessions. Fallback owner must be assigned. |
| Number of FN Core Values | 7 (referenced in brainstorming doc) | Sessions reference “7 FN Core Values.” |

### **Edge Cases \[NOT YET REVIEWED\]**

The following edge cases from the brainstorming doc are **NOT YET REVIEWED** (they appear after the review boundary in Module 2):

* Employee on leave during self-review

* Employee resigns before self-review

* Employee on PIP during review

* Manager change during review period

* Manager reviewing team while being reviewed (RBAC-critical — flagged in brainstorming doc as hard requirement)

* HOD disagrees with manager rating

* Manager told employee rating verbally before calibration

* Department has no calibration (HOD absent)

* SLT blocks a promotion nomination

* Employee disputes final rating

* Rating affects visa/immigration status

* Leaver receives rating (notice period in Jan 2027\)

**Note:** These are documented in the brainstorming doc with recommended decisions but have not been walked through with the group.

### **Confirmed Decisions (Module 2\)**

| Decision | Source |
| :---- | :---- |
| Annual rating formula: Goals 50% \+ Skills 25% \+ Core Values 25% | **Sessions \#1–4 \+ confirmed carryover** |
| Q1–Q3 ratings auto-populated, read-only, equal weight 25% each | Sessions \#1–4 |
| Q4 rated by manager inside annual review (no standalone Q4 check-in) | Sessions \#1–4 |
| Annual appraisal flow: Option D | Session \#3 |
| Parallel blinded review: simultaneous; manager blinded until own review submitted | Session \#4 (locked) |
| Single final grade field (no separate Contribution/Impact \+ Final) | **Confirmed carryover** |
| No system-recommended ratings | **Sessions \#2–3 \+ confirmed carryover** |
| Annual goals score is READ-ONLY; manager can only override final overall grade | **Session \#3 \+ confirmed carryover** |
| Dual reporting rejected: real-time direct manager only | **Session \#4 \+ confirmed carryover** |
| Close date: 15 February 2027 | **Confirmed** |
| Arrears: 28 February 2027 | **Confirmed** |
| Q1 2026 \= “Performing” for all employees | **Confirmed carryover** |
| Missing quarter: zero score counts; inapplicable quarter excluded | **Confirmed carryover** |
| Full-quarter absence: PTR assigns “O” rating; excluded from average | **Session \#3 \+ confirmed carryover** |
| Oct 1 eligibility cutoff for annual appraisal | Session \#5 |
| No extensions for late manager reviews (annual) | Session \#5 |
| HOD/HRBP can update ratings during active calibration window | Session \#5 |
| SLT final calibration approval (from Project Red) | Session \#5 |
| Audit log required for all calibration changes | Session \#5 |
| Rating visibility gated until full calibration complete | Session \#5 |
| UTC system time; individual user timezones derived from UTC | Session \#5 |
| Email is primary notification channel for V1 | Session \#5 |
| Manager mandatory questions: flight risk \+ engagement (visible LM/HOD only) | Session \#5 |
| **Manager open-ended questions: strengths and areas of improvement** | Session \#5 |
| One-time Q1 2026 exception: manager can adjust overall final rating this year only | Session \#5 |
| PTR owns core value rubric definitions | Session \#5 |
| HOD review collapsed into calibration (not a separate stage) | Session \#5 |
| Total rewards data extracted only after calibration is complete | Session \#5 |
| Annual review eligibility: joined on or before Oct 1; ≥1 rated quarter | Session \#5 |

### **Open Questions (Module 2\)**

Detailed list in Section 6\.

---

## **3.3 Modules 3–10: Not Yet Designed**

The following modules exist as placeholder sections in the master brainstorming document. No brainstorming has been conducted. No decisions have been made.

| Module | Notes |
| :---- | :---- |
| Module 3 — Calibration | High-level mechanics touched in M2; standalone design needed |
| Module 4 — Analytics & Reporting | **Dashboard confirmed to replace existing FN dashboard; detailed requirements TBD** |
| Module 5 — Skills & Competency Library | **Depends on V1/Phase 2 skills decision** |
| Module 6 — Core Values Assessment | Depends on rubric content; PTR to produce |
| Module 7 — Notification Engine | Email first (V1); ClickUp (V2) |
| Module 8 — PIP & Performance Exit | **Phase 2** |
| Module 9 — Probation | **Phase 2** |
| Module 10 — Promotion & Career Pathing | **Phase 2** |

---

# **4\. DECISION REGISTER**

| \# | Decision | Module | Status | Source |
| :---- | :---- | :---- | :---- | :---- |
| D01 | Platform go-live January 2027 | All | **Confirmed** | Session \#1 6 Aug |
| D02 | OKR and performance platforms remain separate permanently | M1 | **Confirmed** | Session \#1 6 Aug |
| D03 | Linear module-by-module development approach | All | **Confirmed** | Session \#2 10 Aug |
| D04 | Figma for UI prototyping | All | **Confirmed** | Session \#2 10 Aug |
| D05 | Batch goal submission (not individual) | M1 | **Confirmed** | Session \#2 10 Aug |
| D06 | Goal count: minimum 2, no maximum; warnings below 3 and above 5 | M1 | **Confirmed** | Session \#2 10 Aug |
| D07 | Auto-save for goal drafts | M1 | **Confirmed** | Session \#2 10 Aug |
| D08 | Copy from last quarter: pre-filled draft, not auto-submitted | M1 | **Confirmed** | Session \#2 10 Aug |
| D09 | Manager batch approval | M1 | **Confirmed** | Session \#2 10 Aug |
| D10 | Single consolidated notification per employee submission | M1 | **Confirmed** | Session \#2 10 Aug |
| D11 | Day 30 is NOT a hard lock — changes require 2-level approval | M1 | **Confirmed** | Session \#3 12 Aug |
| D12 | Approval delegation: manual by PTR only; never automatic | M1 | **Confirmed** | Session \#3 12 Aug |
| D13 | **Probation goal module: Phase 2** | M9 | **Confirmed** | Session \#3 12 Aug |
| D14 | **2025 data migration from Revolut confirmed; 2024 data parked** | M1 | **Confirmed** | Session \#3 12 Aug |
| D15 | Annual appraisal flow: Option D selected | M2 | **Confirmed** | Session \#3 12 Aug |
| D16 | Annual rating formula: Goals 50% \+ Skills 25% \+ Core Values 25% | M2 | **Confirmed** | Sessions \#1–5 Multiple |
| D17 | No system-recommended ratings; completion % shown as reference | M1, M2 | **Confirmed** | Sessions \#2–3 Multiple |
| D18 | Single final grade field; no dual grading (Contribution/Impact \+ Final) | M2 | **Confirmed** | Session \#2 10 Aug |
| D19 | Q1–Q3 ratings auto-populated into annual appraisal as read-only | M2 | **Confirmed** | Sessions \#1–4 Multiple |
| D20 | Equal quarterly weight: 25% each (applicable quarters only) | M1, M2 | **Confirmed** | Sessions \#2–3 Multiple |
| D21 | Missing quarter: zero score counts in average | M2 | **Confirmed** | Session \#3 12 Aug |
| D22 | Full-quarter absence: PTR assigns “O” rating; excluded from average | M2 | **Confirmed** | Session \#3 12 Aug |
| D23 | Q1 2026 \= “Performing” for all (transition year) | M2 | **Confirmed** | Session \#3 12 Aug |
| D24 | Rating timeline: Self-eval → Manager review → Calibration → Close 15 Feb → Arrears 28 Feb | M2 | **Confirmed** | Sessions \#3–5 Multiple |
| D25 | Parallel blinded review: simultaneous; manager cannot see employee self-review until manager submits own | M2 | **Confirmed (Locked Session \#4)** | Session \#4 18 Aug |
| D26 | Annual goals score is READ-ONLY; manager overrides only the final overall grade | M2 | **Confirmed** | Session \#3 12 Aug |
| D27 | Dual reporting rejected: real-time direct manager only | M2 | **Confirmed** | Session \#4 18 Aug |
| D28 | Cross-functional goal cascading excluded from V1 | M1 | **Confirmed** | Session \#4 18 Aug |
| D29 | “Process,” “Priority,” “Type” goal UI tags removed | M1 | **Confirmed** | Session \#4 18 Aug |
| D30 | Performance reviews annual cycle (not quarterly); goal tracking remains quarterly | M2 | **Confirmed** | Session \#4 18 Aug |
| D31 | Skills weighting at 25% (conditional) | M2, M5 | **Tentative** | Session \#5 21 Aug |
| D32 | No extensions for late manager reviews (annual) | M2 | **Confirmed** | Session \#5 21 Aug |
| D33 | HOD/HRBP update ratings during active calibration window; PTR after close | M2, M3 | **Confirmed** | Session \#5 21 Aug |
| D34 | SLT final calibration approval (from Project Red) | M2, M3 | **Confirmed** | Session \#5 21 Aug |
| D35 | Audit log required for all calibration rating changes | M2, M3 | **Confirmed** | Session \#5 21 Aug |
| D36 | Rating visibility gated until full calibration complete | M2 | **Confirmed** | Session \#5 21 Aug |
| D37 | UTC system time; user timezones derived from UTC | All | **Confirmed** | Session \#5 21 Aug |
| D38 | Email is primary notification channel for V1; ClickUp V2 | M7 | **Confirmed** | Session \#5 21 Aug |
| D39 | Manager mandatory questions: flight risk \+ engagement (LM/HOD only) | M2 | **Confirmed** | Session \#5 21 Aug |
| D40 | Annual review eligibility: joined on or before Oct 1; ≥1 rated quarter | M2 | **Confirmed** | Session \#5 21 Aug |
| D41 | PTR owns core value rubric definitions | M6 | **Confirmed** | Session \#5 21 Aug |
| D42 | HOD review collapsed into calibration (not a separate stage) | M2, M3 | **Confirmed** | Session \#5 21 Aug |
| D43 | One-time Q1 2026 exception: manager can adjust overall final rating this year only | M2 | **Confirmed** | Session \#5 21 Aug |
| D44 | Probation employees eligible for full annual appraisal if joined by Oct 1 | M2 | **Confirmed** | Session \#5 21 Aug |
| D45 | Total rewards data: extracted only after calibration complete | M2 | **Confirmed** | Session \#5 21 Aug |
| D46 | Scorecard template system: Google-Forms-level flexible question bank | M2 | **Confirmed** | Session \#5 21 Aug |
| D47 | Calibration (HOD ↔ HRBP bell curve distribution AND HOD ↔ SLT calibration) occurs in Q1/Q2/Q3 quarterly check-in cycles — not Q4 annual appraisal only | M2 | **Confirmed** | Owner review 1 Sep 2026 |

---

# **5\. DECISION TIMELINE AND CHANGE LOG**

| Topic | Earlier Position | Later Position | What Changed / Sources | Status |
| :---- | :---- | :---- | :---- | :---- |
| Day 30 goal lock | Original brainstorming doc described as “hard lock after Day 30” | **Session \#3 confirmed: NOT a hard lock; post-Day-30 changes require 2-level approval** | Understanding clarified; governance added instead of lockout *(Source: Brainstorm doc vs. Session \#3)* | **Confirmed: 2-level approval, not hard lock** |
| Manager review visibility | Original doc stated “manager sees employee self-review before writing own” | Session \#4 LOCKED: parallel blinded — manager cannot see until own review submitted | Bias prevention mechanism added post-Sessions \#3–4 *(Source: Brainstorm M2 vs. Session \#4)* | **Confirmed: parallel blinded (Session \#4 lock)** |
| Annual goals score overridability | Original doc implied manager can override the calculated annual goals score | **Session \#3 confirmed: goals component is READ-ONLY; manager overrides final grade only** | Critical build spec correction *(Source: Brainstorm M2 vs. Session \#3)* | **Confirmed: READ-ONLY (session \#3)** |
| Q4 quarterly check-in | Initially conceived as a separate check-in event | Merged: Q4 rating happens inside annual review (no standalone Q4 check-in) | Reduces calibration rounds from 2 to 1 *(Source: Session \#3 Option D selection)* | **Confirmed** |
| Annual appraisal flow options | Options A, B, C, D discussed and evaluated | Option D selected (Session \#3) | Options A/B/C eliminated due to double-calibration or recency-bias concerns *(Source: Session \#3)* | **Confirmed** |
| HOD review stage | Original brainstorm doc included HOD review as a separate stage before calibration | Session \#5 collapsed it into calibration | Saves 3–5 calendar days; HOD authority maintained within calibration *(Source: Brainstorm M2 Stage 4 vs. Session \#5)* | **Confirmed: collapsed into calibration** |
| Delegation trigger | Session \#1 described delegation as potentially automatic when manager absent \>30 days | **Session \#3 confirmed: delegation is NEVER automatic; PTR initiates manually only** | Manager accountability principle enforced *(Source: Session \#1 vs. Session \#3)* | **Confirmed: manual only** |
| OKR visibility scope | Session \#1: employee sees department OKRs; RACI-based multi-dept OKRs unresolved | **Session \#2: department-level confirmed as V1 baseline; RACI edge case noted but not resolved** | **Baseline locked; edge case still open *(Source: Sessions \#1–2)*** | **Partly resolved — RACI edge case open** |
| Goal UI tags | Sessions \#1–2 included Process, Type, Priority fields in goal form | Session \#4: all three removed from UI | Users mislabeled goals; fields added no value *(Source: Sessions \#1–2 vs. Session \#4)* | **Confirmed: tags removed** |
| Quarterly rating necessity | Session \#2 (CK vs. Fahim debate): CK questioned value of quarterly ratings | Sessions \#3–5: quarterly ratings retained; PSP/PIP and annual calculation depend on them | Resolution through articulating downstream dependency *(Source: Session \#2 debate → Sessions \#3–5)* | **Confirmed: quarterly ratings retained** |
| **Skills inclusion (V1 vs Phase 2\)** | Sessions \#1–4 assumed Skills in V1 at 25% | **Session \#5: conditionally confirmed at 25% pending SLT/“L” discussion** | Risk of rushing skills library identified; SLT must decide *(Source: Sessions \#1–4 vs. Session \#5)* | **⚠ TENTATIVE — SLT decision pending** |
| Employee self-rating format | Session \#3 Option D flow described employee “selecting their final rating” | **Brainstorming doc confirmed: employee provides overall annual grade \+ per-pillar ratings** | Clarified to be both overall and per-pillar *(Source: Session \#3 vs. Brainstorm M2)* | **Confirmed** |
| Platform concurrent cycles | Session \#1 (Api Singha): “I cannot imagine it” — expressed uncertainty | **Session \#1 (Jawad): Lipsum sandbox proves feasibility; Sessions \#2–5 confirmed** | Resolved by concrete reference implementation *(Source: Session \#1)* | **Confirmed** |
| Late manager review handling | Not discussed before Session \#5 | Session \#5: NO extensions; force-move; HOD authority to assign ratings | Firm policy; payroll dependency cited *(Source: Session \#5)* | **Confirmed** |

---

# **6\. OPEN QUESTIONS AND DECISIONS NEEDED**

*Prioritised. P1 \= go-live blocker. P2 \= needed before design/build of that area. P3 \= needed before release.*

## **P1 — Go-Live Blockers**

**OQ-01: Will Skills be included in V1 (January 2027\) or deferred to Phase 2?** \- **Why it matters:** The 50/25/25 formula, the platform build scope, and the go-live date all depend on this answer. If Skills is deferred, the formula changes or defaults, and Modules 5 and 6 are partially descoped. \- **Affected modules:** M2, M5 \- **Options:** (A) Skills in V1 at 25% — assign owner today, complete library by Dec 2026\. (B) Defer Skills to Phase 2 — adjust formula to Goals 67% \+ Values 33%. (C) Defer Skills, default to “Performing” for all in 2026 — formula numerically unchanged. \- **If unresolved:** Platform build cannot be finalised. Template and scorecard configuration cannot proceed. \- **Owner:** SLT / “L” and Angie. Angie to initiate discussion.

**OQ-02: Who is the fallback owner for Core Value rubric definitions given Elvira has not attended any sessions?** \- **Why it matters:** The Core Values pillar (25% of annual rating) cannot be configured in the platform until rubric text exists for each value at each rating level. If no owner is assigned and producing content by December, the 25% values pillar cannot go live. \- **Affected modules:** M2, M6 \- **Options:** (A) PTR drafts rubrics unilaterally — fastest. (B) People Excellence / Culture team is formally directed to deliver. (C) Working group (PTR \+ HRBPs) produces a draft; Elvira reviews asynchronously. \- **If unresolved:** Values pillar blocked. Formula adjustment or values placeholder required. \- **Owner:** Angie / PTR Lead to decide today.

**OQ-03: Is the skills library sufficiently complete to support V1? Five functions by Q3 end — is that enough?** \- **Why it matters:** Even if SLT confirms Skills in V1, HRBP can only build 5 functions by end of Q3. With 13+ departments, much of the org may have no skill rubrics at launch. \- **Affected modules:** M5 \- **Options:** (A) Proceed with partial library — employees in unmapped roles get a default. (B) Expand resourcing to accelerate library completion. (C) Use decision in OQ-01 to defer Skills. \- **Owner:** Angie \+ HRBP lead.

## **P2 — Needed Before Design or Build**

**OQ-04: What is the manager review stage’s detailed format?** \- **Why it matters:** The entire manager evaluation section was not brainstormed in Session \#5. Build cannot begin on this stage without it. \- **Affected modules:** M2 \- **Sub-questions:** (a) Is manager narrative mandatory per pillar (Goals, Skills, Values) or one overall narrative? (b) If manager rating differs from employee self-rating by ≥2 tiers, is a mandatory comment required? (c) What tools exist for managers with 15+ direct reports? \- **If unresolved:** Manager review UI cannot be designed or built. \- **Owner:** PTR Lead \+ Angie.

**OQ-05: What are the exact self-review questions and prompts?** \- **Why it matters:** The question bank/library cannot be populated without agreed content. Self-review UI is partially blocked. \- **Affected modules:** M2 \- **Proposed prompts (Session \#4 — Ruweendra):** “What did I deliver this year?” / “How did I demonstrate FN Core Values?” / “What do I need to further improve on?” / “Is the company giving me the support I need to perform at my optimal level?” — plus proposed mandatory question: “Do I feel valued or heard in the company?” (Session \#5). \- **If unresolved:** Self-review section cannot be fully configured. \- **Owner:** PTR Lead.

**OQ-06: What is the calibration dashboard design (auto-flags, nine-box, distribution view)?** \- **Why it matters:** HRBP and HOD need a usable calibration interface. Which employees are auto-flagged? What does the distribution view look like? \- **Affected modules:** M2, M3 \- **Sub-questions:** (a) Which auto-flags to include in V1? (b) Nine-box: full 9-box, distribution view only, or deferred entirely to Phase 2? (c) Forced distribution: hard cap, guidance reference only, or none? \- **If unresolved:** Calibration dashboard cannot be designed. \- **Owner:** PTR Lead \+ Angie \+ HRBP.

**OQ-07: What is the appeal process?** \- **Why it matters:** Employees will dispute ratings. Without a defined process, HR has no policy to point to and the platform has no supporting workflow. \- **Affected modules:** M2 \- **Options:** (A) No formal appeal — calibration is the quality gate. (B) 7-day written feedback window; record maintained, rating NOT changed. (C) Formal appeal to HRBP — rating can change. \- **Brainstorming doc recommendation:** Option B (low ROI flag on A and C). \- **If unresolved:** Policy gap; cannot communicate to employees at rating release. \- **Owner:** Angie \+ PTR Lead.

**OQ-08: How are ratings released to employees?** \- **Why it matters:** The rating release mechanism determines how the manager communication step works and what the platform needs to support. \- **Affected modules:** M2 \- **Options:** (A) PTR batch-releases all on Feb 15\. (B) Managers release individually after 1:1 (within a window). (C) PTR sets window; managers can release any time within it; auto-releases at deadline (recommended). \- **If unresolved:** Manager communication flow and employee notification cannot be designed. \- **Owner:** PTR Lead.

**OQ-09: What is the merit increment export process to Total Rewards (Gordon)?** \- **Why it matters:** Gordon needs final rating data for merit increment calculations. This must be designed before the annual cycle closes. \- **Affected modules:** M2 \- **Questions:** Format (CSV vs. read-only platform access), owner, trigger (PTR manual vs. auto on calibration close). \- **If unresolved:** Risk to Feb 28 arrears payout. \- **Owner:** PTR Lead \+ TR (Gordon).

## **P3 — Policy and Edge Cases**

**OQ-10: What is the HRBP’s exact authority in calibration — can HRBP edit ratings or only challenge?** \- **Affected modules:** M2, M3

**OQ-11: Which calibration auto-flags to include in V1?** \- Proposed: consecutive Exceeding/Exceptional 2+ cycles; rating drop 2+ tiers; post-PIP rated Exceeding; self vs. manager gap ≥2 tiers; retention flag raised. \- **Affected modules:** M2, M3

**OQ-12: Manager absent during calibration — who represents their team?** \- Options: HOD steps in; PTR Admin attends; manager submits written notes pre-calibration. \- **Affected modules:** M2, M3

**OQ-13: Employee disputes final rating — policy and platform behaviour?** \- Related to OQ-07 (appeal). \- **Affected modules:** M2

**OQ-14: Employee on leave during self-review (Jan 1–14) — what happens?** \- Options: PTR extends; PTR assigns “not applicable”; employee excluded entirely. \- **Affected modules:** M2

**OQ-15: Employee resigns before self-review in January — appraisal completed or frozen?** \- Context: Session \#3 (Angie) excluded notice-period employees from goal tracking. \- **Affected modules:** M2

**OQ-16: Manager change during the January review period — who conducts the review?** \- Options: New manager reviews full year; previous manager completes if in progress; PTR assigns. \- **Affected modules:** M2

**OQ-17: Is there forced distribution / bell curve in the calibration system?** \- Current: Angie references a bell curve in Excel. Is this formalised in the platform? \- **Affected modules:** M2, M3

**OQ-18: Who exactly is the second approver for post-Day-30 goal changes?** \- Confirmed: manager \+ manager’s manager. Original doc also referenced HRBP. Clarify which. \- **Affected modules:** M1

**OQ-19: Multi-department OKR visibility for RACI-connected employees?** \- Current: department-level OKRs shown. Employees RACI’d to multi-dept OKRs: show additional or not? \- **Affected modules:** M1

---

# **7\. CONFLICTS AND AMBIGUITIES REQUIRING RESOLUTION**

*Format: Doc position | Meeting position | Resolution needed. Final decision to be completed by owner.*

---

## **C-01: Annual Goals Score — Manager Override Rights**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (original text)** | Implies manager can confirm or override the calculated annual goals score during manager review (Stage 3, Step 2). |
| **Session \#3** | **Confirmed: the 50% performance component is READ-ONLY. Manager cannot override the goals component. Manager can only override the FINAL overall annual grade.** |
| **Type of conflict** | Direct contradiction — original doc vs. session decision |
| **Why it matters** | Build spec must reflect one design. If built wrong, managers will expect an edit field that doesn’t exist (or vice versa). |
| **Decision needed** | Confirm: annual goals score component is READ-ONLY. Manager override applies to final overall grade only. Update the original doc language. |
| **Final decision:** | **☐ To be confirmed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_** |

---

## **C-02: Manager Review Visibility of Employee Self-Review**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (original text)** | “Manager sees employee self-review before writing own.” |
| **Session \#4** | Locked as parallel blinded: manager CANNOT see employee self-assessment until manager has submitted their own review. |
| **Type of conflict** | Direct contradiction — original doc superseded by session lock |
| **Why it matters** | This is a fundamental design principle affecting RBAC, UI flow, and session state logic. If built wrong, the bias prevention mechanism fails. |
| **Decision needed** | Confirm Session \#4 lock. Update the brainstorming doc to reflect parallel blinded review. Build spec must hard-block manager access to employee self-review until manager submits. |
| **Final decision:** | **☐ To be confirmed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_** |

---

## **C-03: Skills in V1 vs. Phase 2 — Unresolved in Sources**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (Module 2\)** | Skills included in V1 at 25%. Skills library owner must be assigned as a “go-live blocker.” |
| **Session \#5 (HUDDLE 2\)** | **“I will still raise a discussion point with L later on about the skills whether we want to still put it.” SLT decision pending. Conditionally confirmed at 25% subject to SLT.** |
| **Session \#5 (Fahim — noted in brainstorming doc)** | “The risk of rushing the skills library is higher than the benefit of having it in Year 1.” Options B (defer) or C (default Performing) preferred. |
| **Type of conflict** | Unresolved — two decision-makers have different leanings; SLT has not decided |
| **Why it matters** | **If Skills is deferred: formula changes, build scope changes, Skills and Competency Library module is descoped for V1. If Skills is included: library must be complete by Dec 2026 with only 5 functions targeted.** |
| **Decision needed** | SLT/L to decide. Angie to present options. Decision required immediately. |
| **Final decision:** | ☐ To be completed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ by: \_\_\_\_\_\_\_\_\_\_\_\_\_ |

---

## **C-04: Elvira / Core Values Rubric — Ownership Blocker**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (Module 2\)** | Elvira (People/Culture) is the proposed owner of Core Values behavioural anchors. Flagged as a go-live blocker. |
| **Reality (Sessions \#1–5)** | Elvira has been invited to all 5 sessions and has not substantively participated. She attended Session \#1 briefly but left early. No rubric content has been produced. |
| **Session \#5** | **PTR owns the rubric definitions. Angie and PTR will draft; HRBP reviews. But Elvira has not formally confirmed, denied, or delegated.** |
| **Type of conflict** | Incomplete ownership \+ dependency risk |
| **Why it matters** | The 25% Core Values pillar cannot be configured without rubric text. The global handbook definitions are fixed — rubrics for “Performing” and “Exceeding” per value must be written by a person who understands the values deeply. |
| **Decision needed** | (1) Is Elvira formally removed from ownership? (2) Who is the fallback? PTR alone or with a working group? (3) What is the deadline for producing rubric content? |
| **Final decision:** | ☐ To be completed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ by: \_\_\_\_\_\_\_\_\_\_\_\_\_ |

---

## **C-05: HOD Review Stage — Separate vs. Collapsed**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (Module 2, Stage 4\)** | HOD review is a separate stage before calibration. Details the process if retained (HOD can flag, not edit, before calibration). |
| **Session \#5** | “Collapse into calibration.” HOD involvement is only during calibration, not as a pre-calibration gate. |
| **Type of conflict** | Session decision supersedes doc — but doc stage has not been formally reviewed |
| **Why it matters** | Saves 3–5 calendar days. Affects the number of platform stages, the HOD workflow, and the January–February timeline. |
| **Decision needed** | Confirm Session \#5 decision to collapse HOD review into calibration. Delete Stage 4 from the design spec. |
| **Final decision:** | **☐ To be confirmed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_** |

---

## **C-06: Post-Day-30 Approver — Manager’s Manager vs. HRBP**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (Module 1\)** | Post-lock changes require “manager’s and manager’s \+1 and HRBP approval” (comment thread note). |
| **Sessions \#3–4** | Two-level approval: direct manager \+ manager’s manager (plus-two). HRBP is notified but not listed as an approver. |
| **Type of conflict** | Partial — HRBP’s role unclear (approver vs. notified party) |
| **Why it matters** | If HRBP is an approver, each post-lock change requires three approvals (manager \+ manager+1 \+ HRBP). If notified only, two approvals. Affects build and user experience. |
| **Decision needed** | Is HRBP a required approver or a notified party for post-Day-30 goal changes? |
| **Final decision:** | ☐ To be completed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |

---

## **C-07: Self-Review Deadline Late-Handling — Option A vs. B**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (Module 2, Stage 2\)** | Three options presented: (A) manager proceeds without self-review shown as “not submitted”; (B) auto-unblock at deadline regardless; (C) PTR Admin manually unblocks case by case. Recommendation: Option B. |
| **Session \#5** | **“Option A” confirmed.** |
| **Type of conflict** | Brainstorming doc recommendation (B) vs. session decision (A) |
| **Why it matters** | **Option A means managers proceed without employee self-review if employee misses deadline. Option B means system auto-unblocks. Both are workable; they need a single confirmed decision.** |
| **Decision needed** | Confirm Session \#5 decision: Option A. Manager proceeds without employee self-review if employee misses deadline. |
| **Final decision:** | **☐ To be confirmed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_** |

---

## **C-08: Employee Overall Self-Rating — Scope**

|  | Position |
| :---- | :---- |
| **Brainstorming doc (Module 2, Stage 2\)** | Three options: (A) Employee gives overall final annual grade only; (B) employee rates at pillar level only; (C) both. Session \#3 Option D described employee “selecting their final rating,” implying A or C. |
| **Session \#5** | **“Employee can indicate a final rating for themselves annually along with separate ones for goals, skills, and core values.” (Option C confirmed.)** |
| **Type of conflict** | Clarification — session decision (C) resolves the ambiguity |
| **Why it matters** | Determines how many rating fields appear in the self-review section and how calibration uses the data. |
| **Decision needed** | Confirm Option C: employee provides overall annual grade \+ per-pillar ratings (goals, skills, values). |
| **Final decision:** | **☐ To be confirmed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_** |

---

## **C-09: Terminology Inconsistency — “Milestone” vs. “Checklist Task” vs. “To-Do”**

|  | Position |
| :---- | :---- |
| **Sessions \#1–3** | Used “checklist task,” “to-do,” and “milestone” interchangeably. |
| **Session \#4** | Formally renamed: “milestone” \= the primary metric category. Sub-items within a milestone \= “checklist” items. “To-do” usage to be eliminated from UI. |
| **Type of conflict** | Terminology drift across sessions |
| **Why it matters** | Inconsistent terms in the platform UI confuse users; inconsistent terms in the build spec confuse developers. |
| **Decision needed** | Confirm Session \#4 naming: Milestone \= primary metric. Checklist \= sub-item within milestone. Update all documentation. |
| **Final decision:** | **☐ To be confirmed by: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_** |

---

# **8\. IMPLEMENTATION READINESS**

| Module / Capability | Readiness | Blocker |
| :---- | :---- | :---- |
| **Goal creation and approval UI** | **✅ Ready for design and engineering** | None |
| **Goal RBAC matrix** | **✅ Ready for engineering** | **None — matrix confirmed** |
| **Batch submission and batch approval** | **✅ Ready for engineering** | None |
| **Day 30 governance (2-level approval for post-lock)** | **✅ Ready for engineering** | Confirm HRBP role (C-06) |
| **Progress tracking (milestones, metrics, last-updated indicator)** | **✅ Ready for engineering** | None |
| **Quarterly check-in flow (Q1–Q3)** | **✅ Ready for engineering** | None |
| **Notification engine (email V1)** | **✅ Ready for engineering** | Content/templates needed |
| **OKR read-only reference panel (V1)** | **✅ Ready for engineering** | OKR API integration scoping needed |
| **Concurrent cycle management** | **✅ Ready for engineering** | None |
| **Dashboard (goal tracking, compliance)** | **✅ Ready for design** | **Detailed requirements not yet specified** |
| **Data migration from Revolut** | **✅ Ready to scope** | Jawad to scope; UAT before migration |
| **Annual appraisal framework (Option D, Q1–Q3 auto-population)** | **✅ Ready for engineering** | **Q4 merge and read-only component confirmed** |
| **Self-review UI (structure)** | **⚠ Partially ready** | Exact questions not finalized (OQ-05) |
| **Scorecard template system (question bank)** | **⚠ Partially ready** | Need dummy templates from Fahim/HUDDLE 2 |
| **Manager review stage (full design)** | **❌ Blocked — not brainstormed** | **Entire stage design deferred (OQ-04)** |
| **Skills module** | **❌ Blocked** | SLT decision (OQ-01); library completion (OQ-03) |
| **Core values module** | **❌ Blocked** | Rubric content not written (OQ-02; C-04) |
| **Calibration dashboard** | **❌ Blocked — not designed** | Auto-flags, nine-box, distribution (OQ-06) |
| **Rating release mechanism** | **❌ Blocked — not decided** | OQ-08 |
| **Appeal process** | **❌ Blocked — never discussed** | OQ-07 |
| **Forced distribution / bell curve** | **❌ Not discussed** | OQ-17 |
| **Nine-box grid** | **❌ Deferred** | Session \#5 — calibration module session needed |
| **Merit increment export to TR** | **❌ Not designed** | OQ-09 |
| **PIP & Performance Exit (M8)** | **❌ Phase 2** | **Deferred** |
| **Probation (M9)** | **❌ Phase 2** | **Deferred** |
| **Promotion & Career Pathing (M10)** | **❌ Phase 2** | **Deferred** |

---

# **9\. FAQ**

## **What does the Performance Platform do?**

It manages the full performance management lifecycle for FN Group: goal setting, quarterly check-ins, annual appraisals, calibration, and rating release. It replaces Revolut. It does **not** manage OKRs (those remain in a separate platform). PIP, probation, and promotion modules are planned for Phase 2\.

## **When does it go live?**

January 2027\. Non-negotiable. The annual appraisal cycle begins immediately after.

## **How does Goal Management work?**

At the start of each quarter, employees create 2–5 goals (minimum 2 required, warning above 5). Each goal has measurements (milestones and/or numeric metrics) and a weightage that must sum to 100%. Employees submit all goals as a batch. The manager receives one notification and reviews the full batch — they can approve, edit, or return the entire submission. Goals are soft-locked after Day 30: any post-deadline change requires approval from the manager AND the manager’s manager. Employees update progress throughout the quarter. In the last 15 days of the quarter, reminders prompt a final update. The manager then conducts a quarterly check-in (Q1, Q2, Q3), rates the quarter on a 5-tier scale, and releases the rating.

## **Is there a hard lock at Day 30?**

No. Day 30 is the standard deadline, but changes after that point are allowed — they just require 2-level approval (manager \+ manager’s manager). Missing the deadline entirely results in a zero score for the quarter, which counts in the annual average.

## **How is the annual rating calculated?**

**(Goals × 50%) \+ (Skills × 25%) \+ (Core Values × 25%) \= Annual Rating.**

The Goals component is the average of Q1–Q4 quarterly ratings (equal weight, 25% each, for applicable quarters). This component is **read-only** — the manager cannot override it. The manager can only override the final overall annual grade. Skills and Core Values are assessed during the annual appraisal.

## **What is “Option D” for the annual appraisal?**

The agreed annual review flow: 1\. Employee completes self-review (sees Q1–Q3 ratings; Q4 goal progress; rates goals, skills, values, and overall for the year). Manager review runs simultaneously — manager is blinded to employee’s self-review until manager submits own review. 2\. Manager rates Q4 goals. System auto-calculates the full-year annual goals score. Manager rates skills and core values. System generates a suggested final rating. Manager confirms or overrides with mandatory justification. 3\. HOD \+ HRBP calibration (HOD review is not a separate stage — it happens within calibration). SLT final calibration approval follows. 4\. Ratings released to employees post-calibration.

## **What does “parallel blinded review” mean?**

Employee self-review and manager review run at the **same time**. The manager cannot see the employee’s self-assessment until the manager has submitted their own evaluation. This is locked — it prevents managers from copying or being biased by what the employee wrote.

## **What if a manager misses the review deadline?**

For the annual review: **no extensions, no exceptions.** The system force-moves to the next stage. The HOD has authority to assign final ratings without the manager’s input. This is firm policy tied to the February payroll cycle.

## **Who can change ratings during calibration?**

During the active calibration window: HOD and HRBP can update ratings directly in the system (all changes audit-logged). After the calibration cycle closes: only PTR Admin can make rating changes (documented reason required).

## **What happens if an employee doesn’t submit goals?**

Zero score for that quarter. The zero still counts in the annual average with its applicable weight. The profile is flagged as incomplete.

## **What happens to an employee on leave for a full quarter?**

PTR Admin manually assigns an “O” (Leave) rating. The system excludes that quarter from the annual average. This does NOT happen automatically — PTR must do it.

## **What is Q1 2026?**

Q1 2026 is a transition quarter. All employees are pre-marked “Performing” by the system. No goals were set that quarter. One-time exception: managers may adjust the overall final annual rating this year to account for Q1 outperformance.

## **Are Skills included in the annual rating?**

Conditionally yes — at 25%. This was announced under Project NEXT but is **pending SLT confirmation**. If SLT removes Skills, the formula adjusts. A decision is required immediately.

## **Who owns the Core Values rubrics?**

PTR. The global handbook definitions of the core values are fixed. PTR must write the rubric text defining what “Performing” and “Exceeding” look like for each value. HRBP then reviews. **This content has not been written yet — it is a go-live blocker.**

## **Can employees see their ratings during the process?**

No. Rating visibility is fully gated until the entire calibration process (HOD \+ SLT) is complete. This is intentional — it fixes a known Revolut issue where ratings were visible prematurely.

## **Is there an appeal process?**

**UNRESOLVED.** This has not been discussed. A decision is needed before ratings are released in February 2027\.

## **Who can see what in the system?**

* **Employees:** own goals and ratings (post-release), own self-review.

* **Managers:** all direct reports — goals, progress, reviews, ratings.

* **Senior Managers and HODs:** their full reporting tree (view only).

* **HRBPs:** assigned departments (view, calibration input).

* **PTR Admin:** full org, all stages, override rights.

* **Nobody** can see their own rating at any stage until calibration is complete.

## **What happens to the current FN performance dashboard?**

It is **discarded**. All dashboard functionality is migrated into the new performance platform.

## **What about data from Revolut?**

Q2 and Q3 2025 Revolut data will be migrated into the new platform before January 2027 (required for the annual appraisal). Q4 2026 goals will be set in Revolut until December 15\. After December 15, all updates go to the new platform. Q4 check-in and the annual appraisal happen entirely in the new platform.

---

# **10\. GLOSSARY AND TERMINOLOGY MAP**

| Term | Definition | Notes |
| :---- | :---- | :---- |
| Annual Rating | Final performance rating combining Goals (50%), Skills (25%), Core Values (25%) | **Formula confirmed; skills inclusion pending SLT** |
| Audit Trail / Audit Log | Complete record of every edit, approval, and rating change with actor and timestamp | Mandatory — missing from Revolut |
| BAU | Business As Usual | Goal type category |
| Batch Approval | Manager approves all employee goals in one action (not per goal) | Replaces Revolut’s individual approval |
| Batch Submission | Employee submits all goals in one action; triggers one manager notification | Solves Revolut’s “who finished?” problem |
| Calibration | Cross-team rating normalisation session; HRBP facilitates; managers, HODs, SLT attend | Annual; produces final agreed ratings |
| Cascaded Goal | Goal linked to a manager’s goal; visual indicator shown in UI | Direct reporting line only; cross-functional cascade excluded |
| Checklist (Milestone sub-item) | Binary task within a milestone | Not the same as a standalone milestone |
| CK / Super-Admin | Ong Choon Khai; cross-department view access | Absent from most sessions |
| Copy from Last Quarter | Feature to copy prior goals as pre-filled drafts; requires re-review before submission | Available for BAU goal continuation |
| Cycle | A configured performance period (quarterly, monthly, biannual, annual) | Multiple can run concurrently |
| Day 30 | Standard goal-setting deadline within a quarterly cycle | Configurable; not a hard lock |
| Delegation | Manual assignment by PTR Admin of approval rights to a proxy manager | Never automatic |
| Developing | One of the 5 rating tiers (below Performing) |  |
| Dual Reporting | Secondary manager relationship | Excluded from V1 |
| Exceptional | Highest of the 5 rating tiers |  |
| Exceeding | Second-highest of the 5 rating tiers |  |
| FN Core Values | The 9 core values of FN Group assessed in annual appraisal | Rubric definitions pending |
| Go-live | January 2027 platform launch date | Non-negotiable |
| Goals Component | The 50% of the annual rating derived from Q1–Q4 quarterly ratings | READ-ONLY; not overridable by manager |
| Hard Lock | Full restriction on changes post-deadline | NOT used for Day 30; post-Day-30 changes allowed with 2-level approval |
| HiBob | HRIS platform used alongside the performance platform | Not the performance platform |
| HOD | Head of Department | Calibration authority in their department |
| HRBP | HR Business Partner | Facilitates calibration; views assigned departments |
| HUDDLE 2 | Transcript label for Angie Yunni (Malaysia office dial-in) | Session \#1 terminology |
| L / “El” | Senior executive whose input is needed on Skills inclusion | **Not yet consulted** |
| Late Update | Progress update permitted in first 7 days of the new quarter | Available for CPM, BI, Marketing |
| Leaver | Former employee whose profile is set to inactive | Only PTR Admin can access inactive profiles |
| Lipsum | Third-party platform referenced for concurrent cycle management | Jawad has sandbox access |
| Milestone | Primary metric category for goal measurement (binary checklist type) | Renamed from “to-do” and “checklist task” in Session \#4 |
| Metric | Numeric goal measurement (start → target) | Supports increasing and decreasing targets |
| Missing Quarter | A quarter where an employee had no goals submitted | Zero score; included in annual average |
| MVP | Minimum Viable Product | Current build target |
| “O” Rating | Leave rating assigned by PTR for full-quarter absence | Excludes that quarter from annual average |
| OKR | Objectives and Key Results | Managed in a separate platform; read-only reference in performance platform |
| Option D | Selected annual appraisal flow: parallel self-review and manager review, one calibration round | **Confirmed Session \#3** |
| Parallel Blinded Review | Self-review and manager review run simultaneously; manager cannot see employee’s until manager submits | Locked Session \#4 |
| Performing | Middle of the 5 rating tiers | Default for Q1 2026 (all employees) |
| **Phase 2** | Second development phase (post-Jan 2027 go-live) | Includes PIP, probation, promotion, nine-box, AI features |
| PIP | Performance Improvement Plan | **Phase 2 module** |
| Progress Update | Employee update to goal milestone/metric during the quarter | Real-time; mandatory in last 15 days |
| Project NEXT | Internal initiative under which 50/25/25 formula was announced | Context for skills weighting |
| Project Red | Internal initiative from which SLT calibration requirement originates | Referenced in Session \#5 |
| PSP | Performance Support Plan | **Phase 2** |
| PTR | People, Talent & Rewards (the HR function that owns this platform) | Super-admin access |
| Quarter Weighting | Each applicable quarter contributes equally (25%) to the Goals component | **Confirmed** |
| RBAC | Role-Based Access Control | Permission matrix controlling who can do what |
| Rating Release | The act of making ratings visible to employees | Gated until calibration complete |
| Revolut | The incumbent third-party performance management platform being replaced | Different from the fintech company |
| SLT | Senior Leadership Team (four members: Nasville, Giant, Gallet, L) | Final calibration approval |
| Scorecard Template | Configurable annual review form; different templates per employee group | Google-Forms-like flexibility |
| Skills Component | The 25% of the annual rating from skill assessments | Pending SLT decision for V1 |
| Submission Deadline | Day 30 of the quarter | Configurable; not a hard lock |
| Super-Admin | PTR Admin with full platform access and override rights |  |
| UAT | User Acceptance Testing | Required before data migration |
| Unsatisfactory | Lowest of the 5 rating tiers | **Triggers HRBP flag; Phase 2 → PIP** |
| V1 | Version 1 / the January 2027 launch build |  |
| V2 | Post-launch enhancement phase | OKR auto-population, external dashboard API, AI features |
| Weightage | Percentage weight assigned to a goal or measurement; must sum to 100% |  |

**Inconsistent terminology across sources:**

| Inconsistency | Preferred neutral term (pending final decision) |
| :---- | :---- |
| “Checklist task” / “to-do” / “milestone” | **Milestone (confirmed Session \#4) — update all documentation** |
| “Hard lock” vs. “lock” vs. “approval-based” | **2-level approval post-deadline** — “hard lock” terminology is incorrect |
| “HRP” / “HRBP” / “HVP” | **HRBP** (HR Business Partner) — transcript artifacts cause variation |
| “Plus-one” / “plus-two” / “+1” / “+2” | **Manager’s manager** — use this consistently in documentation |
| “Revolut” (the legacy platform) | Disambiguate: **“Revolut \[performance platform\]”** vs. “Revolut \[the fintech\]” |
| “Senior Manager” — sometimes refers to HODs, sometimes to middle layer | Clarify org-chart definition before RBAC is built |

---

# **11\. ALIGNMENT CHECKLIST**

## **Decisions the Team Can Proceed With Now**

* ✅ Begin Figma prototyping and engineering for the full Goal Management module (M1).

* ✅ Build RBAC for Goal Management.

* ✅ Build batch submission, batch approval, and the notification engine (email V1).

* ✅ Build progress tracking (milestones, metrics, last-updated indicator, mandatory last-15-days reminders).

* ✅ Build quarterly check-in flow (Q1–Q3 only).

* ✅ Build concurrent cycle management and configurable dates.

* ✅ Build annual appraisal framework: Option D flow, Q1–Q3 auto-population, parallel blinded review structure, Q4 rating inside annual review.

* ✅ Build self-review structure (questions TBD — build the framework first).

* ✅ Build scorecard template system (question bank/library; dummy templates needed from PTR).

* ✅ Configure UTC system time with per-user timezone display.

* ✅ Scope data migration with Jawad; plan Revolut freeze at December 15\.

* ✅ Build audit log for all goal edits, approvals, and calibration changes.

## **Questions That Must Be Answered Before Design or Development**

* ❌ Skills V1 vs. Phase 2 (OQ-01) — SLT decision required immediately.

* ❌ Core values rubric owner and content (OQ-02, C-04) — owner must be confirmed and content delivery timeline agreed.

* ❌ Manager review stage detailed design (OQ-04) — needs a dedicated brainstorming session.

* ❌ Exact self-review questions and prompts (OQ-05) — PTR to produce.

* ❌ Calibration dashboard design: auto-flags, nine-box, distribution (OQ-06) — needs a calibration module brainstorming session.

* ❌ Appeal process policy (OQ-07) — PTR to decide.

* ❌ Rating release mechanism (OQ-08) — PTR to decide.

* ❌ Merit increment export to TR / Gordon (OQ-09) — PTR \+ Gordon to align.

* ❌ Dummy scorecard templates to be shared with Aminul (action: Fahim \+ Angie).

## **Conflicts Requiring Resolution**

* ⚠ C-01: Annual goals score overridability — confirm READ-ONLY.

* ⚠ C-02: Manager review visibility — confirm parallel blinded (Session \#4 lock).

* ⚠ C-03: Skills V1 vs. Phase 2 — SLT decision.

* ⚠ C-04: Core values rubric ownership — Elvira situation; confirm fallback.

* ⚠ C-05: HOD review stage — confirm collapse into calibration.

* ⚠ C-06: Post-Day-30 approver — HRBP as approver vs. notified party.

* ⚠ C-07: Self-review late handling — confirm Option A.

* ⚠ C-08: Employee overall self-rating — confirm Option C (pillar \+ overall).

* ⚠ C-09: Terminology — confirm “milestone” / “checklist” naming across all documentation.

## **Sources or Meetings Still Needing Review**

* Module 2 brainstorming doc: Sections from “CONFIRMED CARRYOVER” onward (full WHO matrix, Stages 1–6 detailed design, Skills & Values section, all Edge Cases) — not yet formally walked through with the group.

* Modules 3–10: No brainstorming conducted.

* ClickUp channel communications referenced in brainstorming doc — not reviewed.

## **Next Stakeholder Actions**

| Action | Owner | Urgency |
| :---- | :---- | :---- |
| **Decide: Skills V1 vs. Phase 2** | Angie → SLT / “L” | **This week** |
| Assign and deadline Core Values rubric content | Angie / PTR | **This week** |
| Share dummy scorecard templates with Aminul | Fahim / Angie | **Before next session** |
| Schedule: Manager Review brainstorming session | Fahim | **Immediately** |
| Schedule: Calibration module brainstorming session | Fahim | **This sprint** |
| Confirm conflicts C-01 through C-09 | PTR Lead | **Before build review** |
| Jawad: scope data migration effort | Jawad | **This sprint** |
| PTR: draft Core Values rubrics | PTR Lead | **Oct 2026 target** |
| HRBP: complete skills library (5 functions by Q3 end) | HRBP lead | **Sept 30 target** |
| Gordon (TR): align on merit increment export format | PTR Lead \+ Gordon | **Before calibration design** |

---

# **12\. SOURCE COVERAGE AND CONFIDENCE**

## **Sources Reviewed**

| Source | Coverage | Notes |
| :---- | :---- | :---- |
| Master Brainstorming Document — Module 1 (Goal Management) | **✅ Full** | Complete content; all tables and decisions read |
| Master Brainstorming Document — Module 2 (Performance Review, pre-boundary) | **✅ Full** | “Questions to Answer Today” section fully reviewed |
| **Master Brainstorming Document — Module 2 (post-boundary, “Confirmed Carryover” onward)** | **✅ Read but labelled NOT YET REVIEWED** | Content documented; not treated as finalized per scope instructions |
| Master Brainstorming Document — Modules 3–10 | **✅ Read** | All are empty placeholder sections |
| Master Brainstorming Document — Parking Lot | **✅ Read** | **Items captured in open questions** |
| Master Brainstorming Document — Comments | **✅ Read** | **4 comment threads reviewed; 3 open (“Up for discussion,” “Needs revisiting,” “PARKED” re: Julious & Reza edge case)** |
| Session \#1 — Aug 6, 2026 (Gemini notes \+ full transcript) | **✅ Full** | 1h 47m session; Goal Management Stages 1 only; comprehensive summary extracted |
| Session \#2 — Aug 10, 2026 (Gemini notes \+ full transcript) | **✅ Full** | Goal Management Stages 2–9; comprehensive summary extracted |
| Session \#3 — Aug 12, 2026 (Gemini notes \+ full transcript) | **✅ Full** | Goal lifecycle \+ Annual Review flow (Options A–D); Option D selection; comprehensive |
| Session \#4 — Aug 18, 2026 (Gemini notes \+ structured notes; partial raw transcript) | **✅ Full (structured notes complete; raw transcript partial)** | Parallel blinded review locked; UI prototype review; goal architecture finalized |
| Session \#5 — Aug 21, 2026 (Gemini notes \+ full transcript) | **✅ Full** | Performance Review module; most comprehensive session; full extraction |
| Optional additional source (tab t.xn8fdtje9529) | **✅ Read** | Content included in the master document returned; no separate material identified |

## **Sources Not Accessible or Unclear**

* **ClickUp channel communications:** Referenced in the brainstorming document as a source for some decisions (noted as “Enhanced with full context from Sessions \#1–4, Gemini transcripts, and ClickUp channel”). The ClickUp channel itself was not directly reviewed — only its influence as reflected in the brainstorming doc.

* **Project Red documentation:** Referenced in Session \#5 as the basis for SLT final calibration approval. The actual Project Red document was not provided and not reviewed.

* **Project NEXT communications:** Referenced as the basis for the 50/25/25 formula announcement to employees. Not reviewed directly.

## **Key Areas with Strong Evidence**

* **Module 1 (Goal Management):** Comprehensive — 4 sessions \+ detailed brainstorming doc. High confidence in all confirmed decisions.

* **Annual appraisal formula and quarterly weighting:** Strong — confirmed across 4 sessions and brainstorming doc.

* **Parallel blinded review:** Strong — locked in Session \#4 with clear rationale.

* **Annual appraisal flow (Option D):** Strong — confirmed in Session \#3 with detailed discussion.

* **No extensions for late manager reviews:** Strong — firm position from HUDDLE 2 in Session \#5.

* **Data migration scope and timeline:** Moderate — confirmed direction; technical scope not yet fully assessed.

## **Key Areas with Weak, Conflicting, or Incomplete Evidence**

* **Skills inclusion (V1 vs. Phase 2):** Weak — conditional confirmation only; SLT decision pending.

* **Core values rubrics:** Weak — ownership decided but content not produced; dependency on Elvira still unresolved.

* **Calibration mechanics (auto-flags, nine-box, forced distribution):** Weak — mentioned in brainstorming doc but none decided; calibration module not yet brainstormed.

* **Manager review stage detailed format:** Very weak — one high-level session (Session \#5) that was deferred before completion.

* **Appeal process:** No evidence — never discussed.

* **Module 2 edge cases (post-boundary):** Only documented in the brainstorming doc with recommendations; not yet discussed with the group.

* **HRBP calibration authority (edit vs. challenge only):** Conflicting — Session \#5 gave HRBP edit access during active window, but brainstorming doc listed “edit authority: DECIDE.”

## **Assumptions Made**

1. “HUDDLE 2” in all session transcripts refers to Angie Yunni (the Malaysia office dial-in). This is consistent across all sessions.

2. “L” in Session \#5 refers to an SLT member (likely the CEO/founder or a specific SLT executive) whose name appears as an initial only in the transcript.

3. The nine FN Core Values referenced throughout are the same set described in the global handbook. Their exact names are not documented in these sources.

4. “Gordon” is the Total Rewards lead referenced as the finance data recipient.

5. The October 1 eligibility cutoff for annual appraisal (Session \#5) is consistent with the hiring timeline referenced across sessions.

6. The “Revolut” referenced throughout as the incumbent performance platform is FN Group’s internal instance of a performance tool, not the financial services company.

---

*End of document. This document is a synthesis of source materials as of 1 September 2026\. No product, policy, workflow, or technical decisions were made by the analyst. All decisions are sourced. All conflicts are preserved unresolved pending owner decisions. This document should be reviewed and confirmed decisions updated before distribution to design or engineering teams.*

# Module 1: Goal Management

**FN GROUP — PEOPLE & PERFORMANCE**

**Performance Platform**

Session 1 — Facilitator Run Sheet

**Goal Management**

*PTR Lead  ·  90 Minutes  ·  Internal Use Only*

**AGENDA**

| Time | Block | Focus | Duration |
| :---- | :---- | :---- | :---- |
| **0:00 – 0:20** | Opening | Pain points \+ platform research | 20 min |
| **0:20 – 1:25** | Goal Management | WHO → FLOW → RULES & EDGE CASES | 65 min |
| **1:25 – 1:30** | Close | Open items \+ owners \+ next session | 5 min |

**01  OPENING**

*0:00 – 0:20  |  20 minutes*

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Customer pain points** | [S.M. Fahim](mailto:fahim@nextventures.io) to share | 5-10 min max |
| **Revolut pain points** | [jawad](mailto:jawad@nextventures.io)to share | 5-10 min max |
| **Platform research** | [Aminul](mailto:aminul.islam@nextventures.io)to share | 5-10 min max |

**02  GOAL MANAGEMENT — WHO**

*0:20 – 0:30  |  10 minutes*

| Role in relation to employee | Create | Edit | Submit | Approve | View Only |
| :---- | ----- | ----- | ----- | ----- | ----- |
| **Employee** | Yes | Yes | Yes | No | No |
| **Manager** | Yes | Yes | Yes | Yes | No |
| **Senior Managers** | No | No | No | No | Yes |
| **HOD** | No | No | No | Yes | Yes |
| **HRBP (only relevant depts)** | No | No | No | No | Yes |
| **HRBP Lead (all depts)** | Yes | Yes | Yes | No | Yes |
| **PTR/Admin** | Yes | Yes | Yes | Yes | Yes |

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Employee submits, manager edits and approves** | Manager can edit everything during approval: Description, type, priority, weightage, measurements | Aligned \- no sending back to employee unless major changes/rework required (requires audit trail, who approved, who edited from what, etc) |
| **Manager’s own goals** | Manager goes through same goal creation process, approved by their immediate manager (HOD goals approved by SLT) | Aligned\! |
| **PTR Admin edit rights** | Can PTR Admin edit any goal at any stage, or only before the cycle opens? | Continue giving admin all access \- except editing your own mid quarter (we will allow past-quarter changes for all but needs both manager’s and manager’s \+1and HRBP approval) |
| **HRBP visibility** | Can HRBP see all goals across their population, or only flagged and escalated ones? | Okay with seeing only their departmental level stuff (no need edit access) \+ HRBP needs to have visualization \+ dashboard rights so they can do their jobs |

**03  GOAL MANAGEMENT — FLOW**

*0:30 – 1:00  |  30 minutes*

**Stage 1 — Cycle opens & OKR setup**

| Item | Details/Context | Status / Decision |
| :---- | :---- | :---- |
| **Goal window** | Opens Day 1, locks Day 30 | Build the system that allows flexibility \- if we want the date to change, we should be able to do that. Should also concurrently work with previous quarter’s check-in. Lock by day 30 \- afterwards, changes are possible but go through the 2 factor authentication (manager \+ manager \+1 or HRBP) |
| **OKR API feed** | Company \+ department OKRs fed from OKR platform: Read only context for employees/should it be functional? | OKR and Performance platform will be 2 separate platforms. It can only be read-only context: we don’t want the mechanisms to collide. The reference needs to be available for anyone to pull from and put into the performance platform \- does not necessarily have to write directly into the performance platform from the OKR platform. The read-only OKR has to be aligned with the RBAC set in the OKR platform. Allow them to carry forward from OKR directly into goals. RACI from the KRs should be able to see from the performance platform. |
| **Notifications** | Reminders at Day 7, 14, 25\. Configured by PTR Admin. Connect with ClickUp? | Enable to-do list for goal approval or other performance platform actions. Enable automated reminders that we can set based on cadence \- not only date but also timing. Integrate into Email, Platform, and ClickUp. |
| **Global Calendar** | Should all countries follow the same calendar? Special accommodation for Leaders (different deadline or approval chain)? | Need to be able to run multiple cycles at the same time but also within same cycle \- if needed, we can extend for a certain team/dept/group of people (simple interface). Frequency of the cycles need to be flexible. |
| **Q4 platform transition** | Q4 goal setting runs in Revolut. Can Q4 check-in be done on the new platform? DAR and Tech to confirm | Yes \- possible to do, we need to migrate data from Revolut (we can decide on when self-eval \+ Q4 \+ annual check-in would happen) |
| **Data migration** | H2 2025 \+ Q2 \+ Q3 2026 data currently in Revolut — must migrate into the new platform for Jan 2027 annual appraisal. Tech to scope migration effort alongside build. | Aligned on doing. |

**Stage 2 — Employee batch goal creation**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **OKR context panel** | Employee sees company \+ department OKRs as read-only reference when writing goals. No mandatory tagging/does mandatory tagging help? | V1: Reference Read-OnlyV2: Click on a button in OKR and then goals get created |
| **Goal count** | 3–5 goals per employee per quarter | Minimum 2 \- no max limit (do set logic less than 3, give them a warning, company requires 3, are you sure?If more than 5, are you sure you want to submit more than 5? We only require 2-5 as a minimum. |
| **Auto-save** | Goals auto-saved as drafts \- employee can return across multiple sessions | Yes \- make sure if you click outside the box, it doesn’t cancel out. |
| **Copy from last quarter** | Available as quick action (especially for BAUs) \- copies as drafts, employee must review and edit before submitting | Yes \- but pull me into the filled form (not submitted already) |
| **Manager/Team Cascade** | Optional: Employee can link goal to manager's cascaded goal, not mandatory | Yes \- make it powerful (Jayed can cascade all the way to Aminul) |
| **Goal fields** | Description, type (Outcome/Output), process type (OKR, BAU, PI) priority (High/Medium/Low), goal weightage, linked goals cascade | All of these \- map from revolut as well.When Angie cascades to Fahim, it should be showing up in Fahim’s dashboard for him to approve, there the linked goals will be filled with Angie’s goal name. |
| **Goal weightage** | Employee sets weight per goal \- must sum to 100% before submission | Yes |
| **Measurements** | Each goal: min 1 measurement. Milestones (binary checklist) \+ Metrics (numeric start→target). Multiple of each, mixed allowed per goal, custom formula, especially for decreasing numbers. Proof link \+ comments enabled. | Keep all of revolut but revamp keep less than, keep in between, and keep more and the others that don’t work. **Customized formulas for V2**. We are not doing integration.  |
| **Measurement weightage** | Each measurement has its own weight \- must sum to 100% per goal (can show overall % impact) | Yes |
| **Metric units** | Free text unit field or predefined list (%, number, days, currency)? Latter helps with data analysis. | Predefined list \- only admins can add on new ones. |
| **Batch submit** | All goals submitted in one action \- submit button locked until all goals filled with min 1 measurement | Employee: Draft goal in platform. Once done with drafting all goals, send them for manager approval. A manager able to approve in bulk \+ any changes they make should be visible from the employee's end.  |
| **One notification** | One notification to manager per employee submission \- not per goal (email/platform/clickup?) | Yes, batch goal submission and then only 1 notification to manager. This needs to be in To Do. |
| **AI goal writing assistant** | AI prompt to help employees write better goals \- nice to have, Phase 2 | V2 |

**Stage 3 — Manager batch approval**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Approval screen** | Manager sees full team queue \- one employee at a time, next button to move through queue | Fahim creates goals  \-\> goes to Angie \-\> Angie can only approve in batches \-\> Finds an error \-\> connects with Fahim offline \-\> Fahim changes \-\> Angie approves all goals together (not able to approve solo goals) \- it is flexible, we can come back |
| **Manager actions** | Approve all, edit description, edit type/priority, adjust goal weightage, adjust measurement weightage, add/remove measurements, add comments, send back whole submission | Yes |
| **Employee notified** | If manager edits anything \- employee notified of changes made | Yes |
| **Delegation** | If manager absent \- PTR Admin assigns delegate, same rights, audit logged | Manager does not change but the responsibility can be delegated to another manager |
| **Reminder Cadence** |  | **Manual Cadence:** Can use the platform to send mass email (first), clickup (later) out reminding employees to update goals. We should have options to select template, visibility (how many people finished vs didn’t) \- only to those who did not submit.  **Automated Cadence:** When system is there, we can decide. |
| **Acknowledge edits** | If manager edits — does employee acknowledge before Day 30 lock, or does manager approval auto-lock? | Notification to the employee but no need for the employee to acknowledge or approve. |
| **Send back scope** | Manager needs to be able to send back individual goals and/or entire submissions | Send back entire submissions \- not solo goals |

**Stage 4 — Day 30 lock**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Hard lock** | Day 30 hard lock — no exceptions without PTR Admin override | If within day 30-31, only the manager approves. If past day 30-31, then manager \+ manager’s manager. Notification to go to HRBP. Feature will be in cycle setting. |
| **No submission** | Employee didn't submit \- auto-lock, flagged incomplete, zero score for quarter, feeds into annual average | Yes |

**Stage 5 — Progress updates throughout quarter**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Real time updates** | Employee can update progress in real time or cadence (weekly/monthly/quarterly) milestones tick, metrics update current value | Yes |
| **Manager visibility** | Manager sees all progress updates in real time \- no need to wait for check-in | Manager can see if they go into employee profile but no notification or updates required whenever an update is logged. |
| **Manager adjustment** | Can manager adjust employee's progress update \- e.g. milestone marked complete but manager disagrees? | Yes |
| **Target change** | Metric target changes mid-quarter due to strategy shift \- who can change it and does it require approval? What happens if progress is already made towards a discarded goal? | Yes  |
| **Progress history** | Full timeline of every update shown, or latest value only? Update hygiene will impact visualization \- better to connect with their dashboards? | We can publish an API and they can connect their dashboard (V2) so the goals are updated automatically. |
| **Blocked goal** | Employee marks goal as Blocked \- immediate notification to manager? (Will this bring value vs we want them to reach out through chat?) | Not required |
| **End of Quarter scoring** | Last 15 days of the quarter, there will be automatic reminders for them to update the goal status and result. | Yes \- enable it and connect to the reminder cadence. |
| **Late update** | Possible first 1 week of new quarter. | Yes, required for CPM, BI, and MKT |

**Stage 6 — Quarterly check-in (Q1, Q2, Q3 only)**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Check-in window** | Opens Day 1 of following quarter, closes Day 15 | Yes but should be able to customize if required. |
| **Check-in format** | Follows Revolut check-in format — room familiar with structure | Yes |
| **What manager sees** | Goal completion % per goal \+ weighted overall completion % \- system shows data, manager makes rating call. No recommended rating. | Aligned \- show the percentage instead of recommended rating  |
| **Quarter rating** | Manager rates each quarter independently on 5-tier scale | Aligned on keeping each quarter’s rating |
| **Comment box** | Free text comment box per check-in  | Aligned |
| **No Q employee self-rating, only annual** | Employee does not self-rate at quarterly check-in \- self-rating at year-end only (can consider H1, H2?) |  |
| **No standalone check-in for Q4** | Q4 has no standalone check-in \- Q4 rating happens inside annual appraisal |  |
| **Stage independence** | Check-in runs independently per population \- senior leader delay does not block rest of org | Yes |
| **Rating visibility** | Quarterly rating visible to employee only when manager or PTR releases it \- not automatic | Aligned |
| **Quarter weightage** | Annual goals score — equal weight (25% each), progressive (Q4 heavier), or PTR-configurable? | Equal Weight |

**Stage 7 — Annual appraisal connection**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Q1–Q3 auto-populated** | All three quarter ratings locked and auto-populated into annual appraisal \- read only | \- Data migration needs to take place.\- Need to ensure that cycles are able to be set for monthly, quarterly, bi-annually, or annually (will be required to pull in H1 and H2 2025 data) |
| **Q4 inside annual** | Q4 rated by manager as first step of annual review \- no standalone Q4 check-in | Option A: Quarterly check-in first, give rating to employees. Then self review for employees based on the ratings (core values, skills, and goals) Then flow goes back to manager’s review and then manager will review only the overall performance \+ skill \+ core value and then go to calibration. Option B: Self review for employee (can see Q1, Q2, and Q3 rating \+ Q4 goals) across goals, core values, and skills. Afterwards move to manager review and then manager have to do 4 steps: Give Q4 rating Give annual goal rating  Go with final score across core value skills and then final grade  Go for calibration Option C: Q1 \+ Q2 \+ Q3 rating done \+ Q4 is annual (no separate rating for Q4) **Option D:**1\. Self Evaluation by Employee: Is able to see Q1, Q2, and Q3 ratings. Only able to see Q4 goals \+ progression. They will have to select a rating for skills, core values, and also their final rating.2\. Manager rates Q4 goals, sees employee’s self evaluation and then grades skills and core values. System automatically generates suggested final rating, manager provides final rating (visibility of what final rating employee gave) 3\. HRBP does calibration with managers, HODs, and SLT. |
| **Quarter weightage** | How Q1–Q4 ratings combine into annual goals score \- **decide in this session** | **2026:**Q1 \= All performing (25%) Q2 \= 25%Q3 \= 25% Q4 \= 25% 100% of the 50% that is coming from goals. **2027 and onward:**Q1 \= 25% Q2 \= 25%Q3 \= 25% Q4 \= 25% 100% of the 50% that is coming from goals. |
| **Missing quarter** | Zero score feeds into average, or excluded from calculation? | Take only the applicable quarter to count the score average. So, if I have Q2, Q3, and Q4 ratings \- we should average across that (33% each) but if I have Q2, Q3, and Q4 rating but I did not submit goals (got 0), it would still be across 33% each (with 33% excluded due to 0 score) |
| **Annual appraisal design** | Full appraisal form, self-review, calibration, rating comms | Year comes to an end. Employee fills out self evaluation. Manager gives Q4 goals rating. Sees employee self evaluation, grades across skills and core values. HRBP calibration with manager, HOD, and SLT. Merit increment and promotion nomination discussions. 15th Feb, we close 2026, and give the rating. Arrears from January to hit 28th February. |

**Stage 8 — Reporting & dashboards**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Real-time dashboard** | Connected to existing [FN Performance dashboard](https://performance.nextventures.io/) — real-time goal submission and approval compliance tracking | The FN performance dashboard will be discarded, the functionalities will be in the performance platform. \- Real time goal submission %\- Real time manager approval %\- HRBP access to the right things \- Manager access to the right things (including \-1 and \-2 and onward) More to come \- more to discuss. |
| **Export** | Dashboard data exportable \- format and access to be confirmed with Aminul (tech) | Aligned. |
| **Manager dashboard** | Manager sees team goal progress, submission status, check-in completion in real time | Aligned |
| **Manager’s Manager Dashboard** | Sees team goal progress, submission status, check-in completion, and cascades view of aforementioned for reportees that are managers | Aligned \- make it tree format |
| **HOD dashboard** | HOD sees department-level goal progress and compliance across all teams | Aligned |
| **PTR dashboard** | PTR sees org-wide compliance \- who has submitted, who is pending, who is overdue, adherence %, quality of goals | Aligned |

**Stage 9 — Goal history & leaver management**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Goal history** | All goal and rating history retained permanently in employee profile | Aligned |
| **Leaver profile** | If employee leaves \- rating history retained, profile set to inactive. Data not deleted at all \- always on record. | Aligned |
| **History visibility** | Who can see a leaver's historical data \- PTR only, or also previous managers? | Only PTR. |

**04  GOAL MANAGEMENT — RULES & EDGE CASES**

*1:00 – 1:25  |  25 minutes*

**Goal creation edge cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Late joiner** | Employee joins Day 25 — included in this quarter or auto-enrolled next? Currently we follow new joiner who joined on or before 1st day of the quarter. But it create question on how do we view probation staff goals? |  |
| **No submission** | Employee doesn't submit by Day 30 — does manager still see the incomplete draft? |  |
| **Probation employee** | Same goal cycle as confirmed employees, or separate probation framework? |  |

**Goal change edge cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Manager change** | New manager mid-quarter — inherits approved goals as-is, or can reopen and re-approve? | Inherits goals but can request edit (requires 2-level approval) |
| **Goal becomes irrelevant** | Org restructure mid-quarter — who initiates HRBP change request, how quickly must it resolve? | If goal becomes irrelevant and must be deleted, it can be deleted past the 30 day threshold but will require 2-level approval. |
| **Employee transfers** | Transfers to new team mid-quarter — goals transfer, stay with old manager, or restart? | Yes, can adjust goals \- requires 2-level approval. |

**Approval edge cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Day 29 submission** | Employee submits Day 29, manager hasn't approved by Day 30 — auto-lock as submitted or auto-reject? | Will show up as pending approval as not approve \- if past the 30 day mark, has to be 2-level approval \+ PTR can delegate elsewhere if required |
| **Manager goes on leave** | Approved goals then manager on leave before quarter ends — who does check-in and can they modify ratings? | PTR can delegate to anyone if required (can be in the team or outside of it) |

**Check-in edge cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Employee on leave during check-in** | On leave during check-in window — excluded from that quarter or window extends individually? | Given this is the check-in, employee is not required, manager can input check-in rating. |
| **Full quarter leave** | On leave entire quarter — zero score, excluded, or leave-adjusted? | Can be manually excluded by PTR with a note \- PTR can assign an OL rating.Employees in notice period can be excluded from goal setting. |
| **Target revised retroactively** | Strategy changed — can metric target be revised before check-in rating? | Yes, 2-level approval |

**Data migration edge cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Q2 \+ Q3 migration** | Revolut data must migrate for Jan 2027 annual appraisal to have complete history — Tech to confirm feasibility and effort | Aligned \- migration to happen before we launch |
| **Q4 goal setting in Revolut** | Q4 goals set in Revolut — how does Q4 data transfer to new platform for check-in and annual appraisal? | Q4, set goal in Revolut but check-in and annual appraisal from new platform (this needs to be communicated clearly with teammates) \- whatever you have update up to 15th december, do in revolut, past 15th dec you put in the new platform. |
| **Q4 check-in platform** | Can new platform be ready for Q4 check-in? If not, Q4 check-in stays in Revolut and migration scope expands | Yes, Q4 goal setting in Revolut. Progress update up to 15th dec in revolut. Past 15th dec in the new performance platform, afterwards Q4 check-in. |
| **Data integrity** | If migration happens — who validates that migrated Q2/Q3 data matches Revolut records? | UAT has to happen before data migration. Jawad, Fahim, Angie- they can split it. |

**05  SESSION CLOSE**

*1:25 – 1:30  |  5 minutes*

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Read back** | Scribe reads every decision made — room confirms or corrects | — |
| **Open items** | Every open item must have an owner and a due date before anyone leaves | — |
| **Final check** | "Does anyone have a decision made today they are not comfortable with? Last chance." | — |
| **Next session** | Performance Review — Skills library and Values framework owners must be in the room | — |

**06  WALK-OUT CHECKLIST**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **□** | WHO confirmed — permissions matrix filled for all 6 roles | — |
| **□** | OKR context panel confirmed — company \+ department, API fed, read only | — |
| **□** | Goal creation rules confirmed — 3–5 goals, batch submission, min 1 measurement | — |
| **□** | Two-layer weightage confirmed — goal weights \+ measurement weights both sum to 100% | — |
| **□** | Milestone and metric structure confirmed — multiple per goal, mixed allowed | — |
| **□** | Batch approval confirmed — manager edits everything, one approval action per employee | — |
| **□** | Day 30 lock confirmed — no submission \= auto-lock, zero score, flagged incomplete | — |
| **□** | Post-lock change process confirmed — HRBP approval required | — |
| **□** | Progress update model confirmed — real time against milestones and metrics | — |
| **□** | Rating visibility confirmed — manager or PTR releases, not automatic | — |
| **□** | Q1–Q3 check-in confirmed — manager rates, no employee self-rating, completion % only | — |
| **□** | Q4 platform decision made — new platform or Revolut for check-in | — |
| **□** | Data migration scope confirmed — Q2, Q3 Revolut data, Q4 goal data | — |
| **□** | Quarter weightage for annual score decided | — |
| **□** | Missing quarter and mid-year joiner handling decided | — |
| **□** | Goal history and leaver profile confirmed | — |
| **□** | Key edge cases resolved — manager change, goal change after lock, employee leave | — |
| **□** | Every open item has an owner and a due date | — |
| **□** | Session 2 date confirmed | — |

**07  DECISION LOG**

*Scribe completes in real time. Circulate to all attendees within 24 hours.*

| Module | Decision / Open Item | Type | Owner | Due |
| :---- | :---- | :---- | :---- | :---- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

# Module 2: Performance Review

**FN GROUP — PEOPLE & PERFORMANCE**

**Performance Platform**

**Session \#5 — Facilitator Run Sheet**

**Performance Review (Module 2\)**

PTR Lead  ·  90 Minutes  ·  21 August 2026  ·  Internal Use Only

*Enhanced with full context from Sessions \#1–4, Gemini transcripts, and ClickUp channel.*

| ✓ Confirmed | DECIDE | ⚠ CONTRADICTION | ⚑ LOW ROI / RISK | \+ NEW QUESTION |
| :---- | :---- | :---- | :---- | :---- |
| Decision locked — do not re-open | Must be decided in this session | Prior sessions conflict — resolve before build | High overhead vs. value — flagged | Added from gap analysis — not in original doc |

## **00  QUESTIONS TO ANSWER TODAY**

*20 decisions. Work through them in order. ✓ \= recommended answer ready. Blank \= needs the room.*

| \# | Question | Rec. | Status / Decision |
| :---- | :---- | :---- | :---- |
| **A** | **MUST DECIDE — no prior session signal** |  |  |
| 1 | Skills library owner \- who is assigned today? Does Job Architecture have something to do with this? (go-live blocker) | HRBP \+ TR | We are assuming we are going forward with Skills.HRBP: Responsible for JD creation and 3-5 skill creation.TR: Job mapping (the salary, band, grading)Aims to close 5 functions by this quarter.TR and HRBP meeting once every 2 weeks. |
| 2 | Core Values \- aligned on what they are but last time’s definitions could be even better \- who is going to own that? (go-live blocker) | PTR/People Excellence/HRBP? | PTR to own this and then we can review with HRBP later on. |
| 3 | HRBP in calibration \- who owns the task to change in the platform if ratings need to be changed as per HOD \<\> HRBP alignment? |  | During cycle, it should be the HOD (and this needs traceability and audit log) but after the cycle, it would be the PTR  |
| 4 | SLT in calibration \- to which extent are they being involved for general teams (outside the leadership team)? |  | After HOD \<\> HRBP calibration, the individual HODs are to sit with SLT and get a final calibration done with SLT (after which the HOD can make the changes in the platform) |
| 5 | Manager comments \- how many options should be enabled \+ who many should be mandatory? |  | Can discuss later during journey flow |
| 6 | Late manager review \- from a system standpoint, we should be able to extend that particular manager’s ones; however, what should the policy behind this be? What are the corner cases we are willing to allow \+ how does the communication escalation go \- would it be HOD \> HRBP \> PTR or HOD \> PTR  |  | Quarterly: We can incorporate an option in the platform.Annual: Force move to next level check if not done in time (manager \> HOD \> SLT) |
| **B** | **CONFIRM — recommendation ready, room should ratify** | **Rec.** |  |
| 7 | Overall self-rating \- does the employee give an overall grade or against each of the goals or each of the pillars (skills, goals, core values) |  | Has to be discussed during self-review journey |
| 8 | Late self-review \- strict adherence to a particular date or should be also enable exceptions for particular individuals? |  |  |
| 9 | HOD review \- separate stage before calibration, or collapse into calibration? |  | Collapse into calibration |
| 10 | Who changes ratings in calibration \- HRBP, HOD, or PTR Admin as sole executor? More back and forth if PTR \- instead, could be just the HOD? This needs to be clearly visible from the system, what was the manager’s grading, what change the HOD meant \- this would be needed for analysis as well. |  | HOD and HRBP can both have access but they can decide who changes but this needs to be done in the system prior to SLT meeting |
| 11 | Calibration V1 auto-flags \- what factors should the platform inform the HRBP and HOD about during their review to help land on better gradings? Attendance score, disciplinary scores, how long they’ve been in the company, the overall curve of the team, their own self review? |  |  |
| 13 | Rating release \- PTR sets window, auto-releases at deadline or manual? |  |  |
| 14 | Appeal \- how are we planning on incorporating this across the board? Within which stage should this be done in the timeline?  |  | **Annual:**Employee updates goalsManager reviews, vets, and rates.HOD \<\> HRBP calibrationHOD \<\> SLT calibrationPTR release to manager PTR release to employees Appeal |
| 15 | Employee acknowledgement \- do we go for a button or just get read receipt (but then we would have to look into how long they have been on the page) |  |  |
| 16 | Nine-box \- Culture \+ Performance, is this something we introduce in phase 2 (post annual review?) |  |  |
| 17 | Forced distribution \- what is the current philosophy? |  |  |
| **C** | **SCOPE DECISION — must resolve before anything in Skills can be confirmed** |  |  |
| 18 | Skills assessment \- does this have to go live in V1 (Jan 2027\) or we can do it for phase 2?  Will need El’s vision on this \- impacts overall rating. | Discuss |  |
| 19 | Skills rating scale \- 5-tier / 4-level proficiency / 3-level?  (only if Skills is V1) |  | HRBP working on this |
| 20 | Skills rating method \- per skill individually, or skill clusters?  (only if Skills is V1) |  | HRBP working on this |
| 21 | Core Values rating method \- rating scale, behavioural anchors, free text, or hybrid? |  | To discuss later |

## **CONFIRMED CARRYOVER — DO NOT REVISIT**

*All items below are fully decided across Sessions \#1–4. Re-open only if something has fundamentally changed.*

| Item | Detail | Status |
| :---- | :---- | :---- |
| **Final rating formula** | (Goals × 50%) \+ (Skills × 25%) \+ (Core Values × 25%) \= Annual Rating | **✓ Confirmed** |
| **Q1–Q3 quarterly ratings** | Auto-populated into annual appraisal — read only. Equal weight 25% each. | **✓ Confirmed** |
| **Q4 rating** | Rated by manager inside annual review as first step. No standalone Q4 check-in. | **✓ Confirmed** |
| **Annual appraisal flow (Option D)** | 1\. Employee self-review (sees Q1–Q3 ratings \+ Q4 goal progress, no Q4 rating yet \+ option to see goal details for each quarter) 2\. Manager rates Q4, reviews self-eval, grades Skills \+ Values, gives final rating **\- still up for discussion** 3\. HRBP calibration with managers, HODs, SLT | **✓ Confirmed** |
| **Rating timeline** | Self-eval → Manager review → Calibration → Close 15 Feb 2027 → Arrears 28 Feb 2027 **(we can plan later on)** | **✓ Confirmed** |
| **Missing quarter handling** | Applicable quarters only. Zero-score quarter still counts as 0\. Inapplicable quarter excluded from average. | **✓ Confirmed** |
| **Full-quarter absence** | PTR manually assigns "O" (Leave) rating — that quarter excluded. System does NOT auto-assign. | **✓ Confirmed** |
| **Q1 2026 \= "Performing" for all** | Transition quarter — all employees pre-marked "Performing" by system. Not rated manually. | **✓ Confirmed** |
| **Parallel blinded review** | Employee self-review and manager review run SIMULTANEOUSLY. Manager CANNOT see employee self-assessment until manager has submitted their own review. SESSION \#4 LOCK. **(need to decide)** | **🔒 Locked (Session \#4)** |
| **Single final grade field** | No separate Contribution/Impact and Final grade fields. One final grade only. | **✓ Confirmed** |
| **No system-recommended ratings** | System shows completion % as reference only. Manager applies independent judgment. No auto-grade. | **✓ Confirmed** |
| **Dual reporting rejected** | Only the real-time direct line manager conducts the review. Dotted-line managers give offline feedback; direct manager incorporates it. **(need to discuss)** | **✓ Confirmed** |
| **⚠ Annual goals score — manager edit rights** | ⚠ CONTRADICTION IN ORIGINAL DOC: Original text implies manager can override the annual goals score. Session \#3 confirmed: the 50% performance component is auto-calculated and READ-ONLY. Manager can only override the FINAL overall annual grade — not the goals component. Build spec must reflect this. | **Managers can only change the final annual grade \- not gradings per goals (not included in the new performance system)** |

## **AGENDA**

| Time | Block | Focus | Duration |
| :---- | :---- | :---- | :---- |
| 0:00 – 0:10 | Opening | Session \#4 recap \+ what we are deciding today | 10 min |
| 0:10 – 1:20 | Performance Review | WHO → FLOW → SKILLS & VALUES → EDGE CASES | 70 min |
| 1:20 – 1:30 | Close | Open items \+ owners \+ next session date | 10 min |

## **01  OPENING**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Recap from Session \#4** | Goals module feedback actioned. Parallel blinded review locked. Module mapping done. Confirm any changes since. | **In session** |
| **Contradiction resolution** | 1\. Parallel blinded review — update original doc language2. Annual goals score — confirm read-only; manager overrides final grade only | **Resolve before moving forward** |

## **02  PERFORMANCE REVIEW — WHO**

**Q1 / Q2 / Q3: Quarterly Check-in**

| Activity | Employee | Manager | Sr. Manager | HOD | HRBP (Dept) | PTR Admin |
| :---- | :---: | :---: | :---: | :---: | :---: | :---: |
| Open / trigger check-in window | I | I | I | I | I | **A/R** |
| Submit goal progress self-update(% complete \+ commentary) | **R** | **A** |  |  |  |  |
| Review and vet employee's updates | **C** | **A/R** | I |  |  | **C** |
| Add manager commentary/ coaching notes |  | **A/R** | **C** |  |  |  |
| Ensure departmental check-incompletion |  | **R** | **R** | **R** | **C** | **A/R** |
| Regular communications & progressupdates to team through platform |  |  |  |  | **R** | **A/R** |
| Assign Goal Rating in the system |  | **A/R** |  |  | **C** | **C** |
| Close/lock check-in cycle |  |  |  |  | I | **A/R** |
| HOD ↔ HRBP Calibration(bell curve distribution) |  |  |  | **R** | **A/R** | **C** |
| HOD ↔ SLT Calibration |  |  |  | **A/R** | **C** | **C** |
| Any rating changes post calibration to be done in the system |  |  |  | **A/R** | **C** | **R** |
| Exception handling |  |  |  |  | **C** | **A/R** |
| Result distribution to managers |  | I | I | **C** | **C** | **A/R** |
| Result distribution to employees |  | I | I | **C** | **C** | **A/R** |
| Quarterly PerformanceReport Creation |  |  |  | **C** | **C** | **A/R** |

**Q4 \+ Annual Check-In**

| Activity | Employee | Manager | Sr. Manager | HOD | HRBP (Dept) | HRBP Lead | PTR Admin |
| :---- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Trigger annual review cycle | I | I | I | I | I | I | **A/R** |
| Self-review: rate Goals, Skills,Core Values, **Final Overall Perforamnce Rating** \+ written narrative | **A/R** | I |  |  |  |  |  |
| Manager review: rate Goals, Skills,Core Values independently (blinded) |  | **A/R** | I |  |  |  |  |
| Manager: assign final overallperformance grade |  | **A/R** | **C** |  |  |  |  |
| Senior Manager: second-level review/ endorsement (if required) |  | **C** | **A/R** | I |  |  |  |
| HOD ↔ HRBP Calibration |  | **C** | **C** | **R** | **A/R** | **C** |  |
| HOD ↔ SLT Calibration |  |  |  | **A/R** | **C** | **R** | I |
| Any rating changes post calibrationto be done in the system |  |  |  | **A/R** | **C** | **C** | **R** |
| Finalize & lock annual cycle |  |  |  |  | I | **C** | **A/R** |
| Exception handling |  |  |  |  | **C** | **C** | **A/R** |
| Result distribution to managers |  | I | I | **C** | **C** | **C** | **A/R** |
| Result distribution to employees |  | I | I | **C** | **C** | **C** | **A/R** |
| Results review and appeal**(if required)** | **A/R** | **C** | **C** | **C** |  |  |  |
| Handle rating challenge / appeal | **R** |  |  | **C** | **R** | **A/R** | **C** |
| Make changes in platformas per appeal results |  |  |  |  | **C** | **C** | **A/R** |
| Yearly Performance Report Creation |  |  |  |  | **C** | **C** | **A/R** |

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Employee self-review** | Employee writes and submits self-review — self-rates Goals (full year), Skills, and Core Values. Sees Q1–Q3 ratings. Sees Q4 progress only (no Q4 rating yet). | **✓ Confirmed** |
| **⚠ Manager review visibility** | ⚠ CONTRADICTION: Original doc says "Manager sees employee self-review before writing own." Session \#4 LOCKED this as parallel blinded — manager CANNOT see until own review is submitted. Update build spec. | **⚠ CONTRADICTION — RESOLVE** |
| **HOD review** | HOD role — before calibration as a separate step, or only active during calibration? See Stage 4\. | **DECIDE** |
| **HRBP role in calibration** | HRBP facilitates — confirmed. Open: can HRBP EDIT ratings, or view \+ challenge for discussion only? | **DECIDE** |
| **SLT visibility** | SLT in calibration — individual ratings or department aggregates? Calibrators or observers? | **DECIDE** |

## **03  PERFORMANCE REVIEW — FLOW**

### **Stage 1 — Annual Review Cycle Opens**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Review window opens** | January 1, 2027\. (Platform should give the flexibility to adjust the date) \- every stage, we need to be able to adjust the date and time. Self review Manager review Manager calibration LT calibration SLT calibration | **✓ Confirmed** |
| **Population** | All confirmed, active employees with at least one rated quarter. | **✓ Confirmed** |
| **Framework published** | PTR Admin confirms 50/25/25 weightage and locks it before window opens. | **✓ Confirmed** |
| **Employee notification** | All employees notified when annual review window opens — instructions and deadlines included. Email \+ ClickUp through Platform.  | **✓ Confirmed** |
| **Scorecard Template** | During the setting, we should be able to set the template for groups of people or individuals. Right now, we have 50% goal setting, 25% for skills and value \- the scorecard template needs to be able to be adjusted. Even the questions should have the ability to be adjustable. Needs to be highly flexible in terms of whether we will grade based off goals, skills, values, and/or leadership capabilities and the % for each \- think like a google form. |  |

### **Stage 2 — Employee Self-Review**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **What employee sees** | Q1, Q2, Q3 ratings: locked and visible. Q4 goal progress visible (completion %). No Q4 rating yet. Q1 2026 shows "Performing" (transition quarter). | **✓ Confirmed** |
| **Self-review content** | Employee writes a full-year narrative on performance and provides ratings on Goals, Skills, and Core Values pillars. We run manager review and self-review starting at same time, manager can give internal deadline for self-review for team. **We can discuss questions asked to them later; however, there needs to be visibility restrictions there.** | **✓ Confirmed** |
| **Goals self-rating** | Employee self-rates Goals pillar for only annual but able to see Q1-Q3 but Q4 would be pending review so they can’t see that.  | **Only based on annual goals.** |
| **Skills self-rating** | Employee self-rates each skill. Framework and scale decided in Section 04\. | **Yes** |
| **Core Values self-rating** | Employee self-rates each of the 7 FN Core Values. Format decided in Section 04\. | **Yes** |
| **\+ Overall self-rating — employee gives an overall annual grade?** | Option A: Employee gives an overall suggested final annual grade (5-tier) — creates a direct calibration anchor. Option B: Employee rates at pillar level only (Goals / Skills / Values) — no overall grade. Option C: Both pillar ratings AND an overall grade. Context: Session \#3 Option D flow describes employee "selecting their final rating" — implying Option C or A. | **Employee can indicate a final rating for themselves annual along with separate ones for goals, skills, and core values.** |
| **Self-review deadline** | Proposed: January 14 — hard lock. PTR Admin override required after this date. | **To be discussed** |
| **⚠ Late self-review — critical for parallel blinded design** | If employee has NOT submitted by Jan 14, what happens? Option A: Manager proceeds without self-review (shown as "not submitted"). Option B: Auto-unblock at Jan 14 deadline regardless — manager sees "no self-review submitted" as a note. Option C: PTR Admin manually unblocks case by case. Recommendation: Option B — auto-unblocks at Jan 14 to preserve timeline. | **Option A.** |
| **\+ Self-review narrative prompts** | Proposed prompts (Session \#4 — Ruweendra): 1\. "What did I deliver this year?" 2\. "How did I demonstrate FN's Core Values?" 3\. "What do I need to further improve on?" 4\. "Is the company giving me the support I need to perform at my optimal level?" | **Will discuss later but the system should allow us to create questions if we want to and set the visibility to be customized** |
| **\+ Q1 2026 "Performing" visibility** | Q1 shows as "Performing" — employees may assume this reflects active evaluation of their Q1 work. Recommendation: add a tooltip or badge: "Transition Quarter — Standard Grade." | **Aligned with recommendation** |

**START FROM HERE TODAY**

### **Stage 3 — Manager Review**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **What manager sees** | Is able to see the employee’s self-review \+ self-rating before the manager has to submit their own rating. Q1–Q3 ratings auto-populated. Q4 goal progress. | **✓ Confirmed** |
| **Step 1 — Rate Q4 goals** | Manager rates Q4 goals. System auto-calculates full-year annual goals score (average of all applicable quarters × 50% weight).**Rough Work:**120% \+ 80% \+ 20% \=  Exceeding \+ Performing \+ Unsatisfactory \= 4 \+ 3 \+ 1 \= 8/3 \= 2.66666667 \= PerformingGoals: Performing (50%)Skills: Exceeding (25%)Core Values: Performing (25%)PerformingQ2 \+ Q3 \+ Q4 | **✓ Confirmed** |
| **Step 2 — Annual goals score** | Auto-calculated annual score of Goals visible to manager; however, should the manager be able to override the rating if required or should they just be allowed to override the final annual rating (making annual goals read-only) | **Manager should be able to override the annual goal rating if required and this would trigger a justification box**  |
| **Step 3 — Skills rating** | Manager rates employee on each skill. Scale and method decided in Section 04\. | **Aligned with El that skills will be included in 2026 cycle \- we have to create a skills library** |
| **Step 4 — Core Values rating** | Manager rates employee on each of the 7 FN Core Values. Format decided in Section 04\. | **Yes, copy Revolut’s flow for Core Values (we can revisit the rubric \- Fahim to work on)** |
| **Step 5 — Final annual rating** | System calculates suggested Final Annual Rating. Manager confirms or overrides with written justification (mandatory if overriding). | **✓ Confirmed** |
| **Manager narrative** | A: Mandatory per pillar (Goals, Skills, Values) \+ overall summary. B: One mandatory overall narrative only. C: Optional — manager may add comments. | **Separate comment boxes for each; however, only mandatory input is required for those in low rating or very high rating. Also, the bottom strengths and areas of development need to be mandatory.Comment and Justification both refer to the same box.** |
| **\+ Significant rating gap — mandatory comment?** | If manager rating significantly differs from employee self-rating: A: Mandatory flag \+ comment if gap is ≥2 tiers. B: Mandatory flag \+ comment if gap is ≥1 tier. C: Gap highlighted visually only — no mandatory comment. Context: HRBP uses self-rating discrepancy as the calibration trigger (Session \#3). | **Will discuss in calibration page later** |
| **\+ Retention flag — "Will we retain this person?"** | Session \#4 (Ruweendra): "Will we do what it takes to retain this person?" A retention/engagement signal — not part of the rating. Visible to HRBP and HOD in calibration. NOT visible to employee. Decide: include as a manager review question? Should there be other questions as well? | **A question bank is already there and we can make it so that it appears in specific places \- we can define the questions later** |
| **Manager deadline** | Proposed: January 28 — hard lock. | **We can review later** |
| **Late manager review** | A: Auto-escalate to HOD — HOD completes manager review. B: HRBP notified; PTR extends individually with justification. C: PTR Admin delegates to another manager. Must not block calibration window opening. | **A, B and C \- based on scenario.** |
| **\+ Large team efficiency** | Manager with 15+ direct reports A: Bulk rating tools — pre-fill Skills/Values from a template, then individualize. B: No special tools — workload planning is manager's responsibility. C: Extended deadline for managers with 10+ reports (e.g., Jan 31). | **We can enable delegation for them if they want \- overall, no one should have more than 18-20 direct for operations-based teams and no more than 7-9 for project-based teams (slice of pizza, Amazon)** |

### **Stage 4 — HOD Review**

**⚑ LOW ROI FLAG — Recommend collapsing into calibration.**

*Evidence from Sessions \#3 and \#4: HOD involvement is described as happening IN calibration — challenging manager ratings alongside HRBP. A separate HOD review gate before calibration adds 1–2 weeks to an already-compressed timeline. Recommendation: collapse into Stage 5\.*

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **⚑ HOD review step — separate stage necessary?** | Option A: YES — HOD formally reviews and approves all manager ratings before calibration opens (adds Jan 29–Feb 1 window). Option B: NO — HOD involvement is only during calibration. HOD challenges there. Recommendation: Option B — saves 3–5 calendar days. | **Option B.** |

### **Stage 5 — Annual Calibration (We will revisit in Module 3, Calibration)**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **HOD \<\> HRBP Calibration Participants** | A) HOD \+ relevant HRBP \+ HRBP LeadB) HOD \+ relevant HRBP \+ PTRC) HOD \+ relevant HRBP \+ HRBP Lead \+ PTRHRBPs will additionally challenge manager ratings where self-rating vs manager rating discrepancy is significant. | **We will revisit in Module 3, Calibration** |
| **HOD \<\> SLT Calibration participants** | A) HODs \+ SLT \+ HRBP LeadB) HODs \+ SLTC) HOD \+ SLT \+ HRBP Lead \+ relevant HRBPD) HODs \+ SLT \+ HRBP Lead \+ PTR This calibration finalizes gradings across the board; however, appeals can come forward in the future. | **We will revisit in Module 3, Calibration** |
| **Calibration opens** | After the manager review window closes Jan 28 — calibration opens immediately. | **We will revisit in Module 3, Calibration** |
| **Calibration view** | HRBP and HOD see all ratings across the department. Distribution curve visible. Manager ratings \+ employee self-ratings side by side. | We will revisit in Module 3, Calibration |
| **Rating changes in calibration** | A: HOD and HRBP can align, HOD can change in system. B: PTR Admin is the only one who formally changes ratings in the system; HRBP/HOD decisions are noted and PTR executes.C: HOD and HRBP can align, manager can be reached out to during the meeting, PTR admin to make changes afterwards. | **We will revisit in Module 3, Calibration** |
| **Calibration indicators — auto-flagged employees** | System surfaces employees for discussion: • Consecutive Exceeding/Exceptional for 2+ cycles • Rating dropped 2+ tiers from prior year • Post-PIP employee rated Exceeding • Self-rating vs. manager rating gap ≥2 tiers • Retention flag raised by manager Decide: which flags to include in V1? | **We will revisit in Module 3, Calibration** |
| **Forced distribution** | A hard distribution cap is high overhead at \~500 employees and creates disputes without clear value. A: Enforced curve — hard cap per rating band. B: Guidance only — distribution reference shown, no hard cap. C: No distribution model. Recommendation: Option B for V1. | **We will revisit in Module 3, Calibration** |
| **Calibration close deadline** | Must close before Feb 15\. Proposed: Feb 7 (allows manager comms before Feb 15 rating release deadline). | **We will revisit in Module 3, Calibration** |
| **\+ Nine-box grid (parked from Session \#4)** | Session \#4 explicitly parked nine-box for this session. A: Full 9-box (Performance × Potential) — requires "Potential" framework, which does not yet exist. B: Performance-only distribution view in calibration. C: Defer nine-box to Phase 2 entirely. Recommendation: Option C for V1. Build Option B (distribution view) as the calibration visual. | **We will revisit in Module 3, Calibration** |
| **\+ Promotion nominations** | A: Inside calibration session — managers nominate, HOD \+ HRBP discuss, SLT ratifies. B: After calibration closes — separate process triggered by final ratings. C: Tracked in a separate module (Phase 2). | **We will revisit in Module 3, Calibration** |
| **\+ Manager during calibration** | A: HOD steps in to represent their ratings. B: PTR Admin attends in place of manager. C: Manager submits written notes before calibration; ratings proceed without live representation. | **We will revisit in Module 3, Calibration** |
| **\+ Significant Q4 vs. Q1–Q3 trajectory** | Employee underperformed Q1–Q3 but exceptional Q4 (or vice versa). Calibration view should flag employees with significant trajectory shifts (e.g., 2+ tier movement in Q4 vs. prior average). Recommendation: yes — "trajectory flag" adds context without changing the calculation. | **We will revisit in Module 3, Calibration** |

### **Stage 6 — Rating Communication & Sign-Off**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Close date** | All 2026 ratings closed by 15 February 2027\. | **We can decide later** |
| **Arrears date** | Merit increment arrears processed 28 February 2027, effective January 2027\. | **We can decide later** |
| **How employee sees rating** | A: Manager communicates rating verbally in 1-1 first, then platform releases to employee. B: Platform releases rating directly; manager follows up in 1-1. C: Simultaneous — notification \+ manager 1-1 at the same time. Context from Session \#2: tiered publishing confirmed — manager sees first, then employee by hard deadline. | **We can decide when we do the project timeline** |
| **Rating release mechanism** | A: PTR batch-releases all ratings on Feb 15\. B: Manager releases to their employee individually after their 1-1 (within a window, e.g., Feb 8–14). C: PTR sets release window; managers can release any time within it, auto-releases at deadline. Recommendation: Option C for control \+ manager autonomy. | **We can decide when we do the project timeline** |
| **⚑ Employee acknowledgement** | ⚑ A formal "I acknowledge" button has low incremental value. System logs the timestamp of first view — that is the record. Recommendation: No formal button. | **We can just have the system logs \- I acknowledge button not required** |
| **⚑ Appeal / rebuttal window** | ⚑ Session \#3 — CK: "This will open up a lot of rooms to change ratings." A: No formal appeal — calibration is the quality gate. B: 7-day written feedback window — record maintained, rating NOT changed. C: Formal appeal to HRBP — CAN change rating. Highest risk to merit process. Recommendation: Option B. | **Appeal can happen offline; however, the admins should have access to the platform to change the rating and keep track of that in a separate stage.** |
| **\+ Merit increment export to Finance** | After calibration closes, TR (Gordon) needs final rating data for merit increments. A: PTR exports CSV after calibration close, shares with Finance. B: Platform gives TR a read-only view. C: PTR Admin triggers export; TR receives it automatically. Decide format, owner, and trigger before go-live. | **We will generate CSV \- TR should only be able to see the final grade and promotion yes/no \- no further information** |

## **05  PERFORMANCE REVIEW — RULES & EDGE CASES**

### **Self-Review Edge Cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Employee on leave during self-review (Jan 1–14)** | A: PTR extends individual window. B: PTR assigns "not applicable" for self-review; manager proceeds without it. C: Employee excluded from 2026 annual cycle entirely. | **B.** |
| **Employee resigns before self-review** | Resigns in January before submitting — appraisal completed or frozen? Context: Session \#3 (Angie) — exclude notice-period employees from goal tracking. Recommendation: PTR freezes the appraisal. | **Rather than removing the person from the cycle, we just deactivate so that the information stays** |
| **New employee — joins Q2 2026** | Only has Q2, Q3, Q4 data. Annual appraisal proceeds on available quarters. Q1 shows as "Not Applicable." | **Aligned** |
| **New employee — joins Q4 2026** | Only has Q4 data. Annual appraisal proceeds on available quarters. Q1, Q2, and Q3 shows as "Not Applicable." Still applicable for appraisal and bonus \- but prorated. | **Aligned** |
| **Employee on PIP during review** | PIP outcome feeds into annual rating, or noted as context only? PIP module is Phase 2\. Recommendation: PIP outcome is context for calibration, not a direct rating input in V1. | **During manager review time only, the words “PSP” or “PIP” should appear next to the name of the employee. It’s just additional context for now (read-only).** |

### **Manager Review Edge Cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Manager changes during review period (January)** | A: New manager reviews full year (has access to Q1–Q3 data \+ Q4 progress). B: Previous manager completes if already in progress — new manager inherits future cycles. C: PTR assigns a reviewer independently. Recommendation: Option A — new manager reviews full year with full historical context. | **A. The previous manager should lose visibility into that employee’s performance after the change. The footprints of the previous manager will remain stored.** |
| **Manager on leave during review window** | PTR can delegate to HOD or another manager — confirmed from Goal Management precedent. Delegatee can see employee self-review as acting reviewer. | **Aligned** |

### **Rating & Communication Edge Cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Leaver receives rating (notice period in Jan 2027\)** | A: Yes — completes full cycle including calibration. B: No — notice-period employees excluded. C: PTR decides case by case. Context: Session \#3 (Angie) excluded notice-period employees from goal tracking. Consistent approach: exclude from annual review. | **C. When we publish the rating, give an exclusion rules (if I want to publish now to all except Fahim, I should be able to exclude Fahim)**  |

# Module 3: Calibration

### **Calibration Edge Cases**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **HOD disagrees with manager rating** | A: HOD has final authority — manager's rating is advisory. B: PTR Admin executes with written record of calibration discussion. C: HOD raises it; if consensus — PTR Admin updates. No unilateral changes. Recommendation: Option C. | **DECIDE** |
| **Manager told employee rating verbally before calibration** | Policy position required: managers must be explicitly briefed that no rating communication is permitted before PTR releases. Include in manager briefing before annual cycle opens. | **DECIDE** |
| **Department has no calibration (HOD absent)** | HRBP leads calibration without HOD. PTR notes absence. Post-calibration rating changes require PTR Admin override with documented reason. | **DECIDE** |
| **SLT blocks a promotion nomination in calibration** | HOD nominates someone; SLT disagrees in calibration. Who has final authority — SLT, HOD, or is it escalated to CEO/founder? For 2026: most likely resolved by discussion. A formal escalation path is needed before go-live. | **DECIDE** |

# Module 4: Analytics & Reporting

# Overall Parking Lot

**Module 1:**  
\- Cascading goals   
\- Cascading OKR \- button  
\- Skills  
\- Operations vs project based weightage  
\- Probation goals \+ goal for those starting on day 1 of quarter’s 1st month

**Module 2:**

The platform should be able to take on new capabilities that are very specific to Leadership.

Manager comments \- how many options should be enabled \+ who many should be mandatory?

Overall self-rating \- does the employee give an overall grade or against each of the goals or each of the pillars (skills, goals, core values)

Late self-review \- strict adherence to a particular date or should be also enable exceptions for particular individuals?

Calibration V1 auto-flags \- what factors should the platform inform the HRBP and HOD about during their review to help land on better gradings? Attendance score, disciplinary scores, how long they’ve been in the company, the overall curve of the team, their own self review?

Nine-box \- Culture \+ Performance, is this something we introduce in phase 2 (post annual review?)

Only the real-time direct line manager conducts the review. Dotted-line managers give offline feedback; direct manager incorporates it.

# Meeting Notes \+ Recordings

[Performance Platform Brainstorming: \#1 - 2026/08/06 14:56 GMT+06:00 - Notes by Gemini](https://docs.google.com/document/d/1Q6dBBadhD8Nwd8uwgM8NHZCeGC27EhnUdBx0yywNrJU/edit?tab=t.xdob1zj6fqo3)  
[Performance Platform Brainstorming: \#2 - 2026/08/10 13:59 GMT+06:00 - Notes by Gemini](https://docs.google.com/document/d/12CyIgYbJy1KoRB2T3RA-FClEFETC9xlobhwAN_HBaFA/edit?tab=t.bvajctmb6n2h)  
[Performance Platform Brainstorming: \#3 - 2026/08/12 09:59 GMT+06:00 - Notes by Gemini](https://docs.google.com/document/d/1z_uEQ9UgtWbFmmwLj3cZicHdy6k1EeP2m8mJPrSoTeE/edit?tab=t.iydz1iqx809z)  
[Performance Platform Brainstorming: \#4 - 2026/08/18 10:02 GMT+06:00 - Notes by Gemini](https://docs.google.com/document/d/14cWxAZDfdV2PkmrWIJNbkZWirSsbnskSxR6IAn1CqQs/edit?tab=t.rut40j11mgj8)  
[Performance Platform Brainstorming: \#5 - 2026/08/21 10:00 GMT+06:00 - Notes by Gemini](https://docs.google.com/document/d/1K7VBd86tYEL3wN1atKTN45RQafvXpJgulLx_PLqGfTY/edit?tab=t.t6gfrvr86f28#heading=h.781jhyt3y36n)  
[Performance Platform Brainstorming: \#6 - 2026/09/01 12:29 GMT+06:00 - Notes by Gemini](https://docs.google.com/document/d/1xShVhs5Q_BD4hUZYykFte2s8Mvc_m169CcCRnjrJWYM/edit?tab=t.2n4ywvbysqzd#heading=h.9ovdjmf6g0zq)

# Module 5: Skills & Competency Library

## **Skills Assessment**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **⚠ Skills — V1 (Jan 2027\) or Phase 2?** | **Getting Skills right requires:** 1\. A skills library built per role family across 13+ departments2\. A rating method decided and configured3\. All of it built and tested before Jan 2027\. That is a significant amount of work in \~4 months.**Option A:** Keep Skills in V1 — assign owner today, build library by Dec 2026, go live Jan 2027 with full 50/25/25 formula.**Option B:** Defer Skills to Phase 2 — formula becomes Goals × 67% \+ Values × 33%.**Option C:** Defer Skills to Phase 2, but hold 25% weight — Skills defaults to "Performing" for all employees in 2026\. Formula numerically unchanged. | **✓ Confirmed: Skills module will remain in the current 2026 cycle. Skills V1 confirmed. Angie confirmed despite ROI concerns. (Session \#6, Sep 1, 2026\)Requires Revisiting** |
| **Skill timeline** | By the time we have to grade skills, would the performance platform be ready or would we have to run it through Revolut? |  |
| **Skills Library Owner** | Who owns the launching of Skills? Such as:\- The master skill library that people can choose from\- The skill rubric for each of the skills\- Ensuring that the right skills are mapped to the right roles \- The training in regard to how to grade skills |  |
| **Skills** | Would anyone be allowed to create their custom skills? What is the validation and standardization process afterwards? |  |
| **Skills rating scale** | A: Same 5-tier as previously used (Poor, Basic, Intermediate, Advanced, Expert)B: 4-level proficiency: Basic / Intermediate / Advanced / Expert C: 3-level: Developing / Proficient / Expert | **DECIDE** |
| **Skills weightage** | Equal weight across all skills or should there be the option to give weightage? | **DECIDE** |
| **Self-rating visibility in calibration** | Does employee's skill self-rating appear alongside manager's rating in calibration view? Recommendation: Yes. | **DECIDE** |

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Skills as prerequisite, not arbitrary measurement** | The team confirmed skills should be treated as a prerequisite based on the job role rather than an arbitrary measurement added late in the process. This shapes how the library is built (role-anchored, not generic) and how it is weighted. | **✓ Confirmed (Session \#6)** |
| **Default rating for unmapped roles at go-live** | If the skills library is incomplete at launch, what happens to employees in roles without a defined skill set? Option A: Default to "Performing" for all skills. Option B: Skills pillar excluded for unmapped roles (formula re-weighted). Option C: PTR manually assigns skill set from nearest equivalent role family. | **DECIDE** |

**02  SKILLS LIBRARY STRUCTURE**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Number of skills per role** | HRBP creating 3–5 skills per role (confirmed Session \#5, Q1). Is 3–5 sufficient for a meaningful annual assessment? Is there a minimum and maximum per role family? | **✓ Confirmed: 3–5 skills per role (Session \#5).** |
| **TR and HRBP coordination cadence** | TR and HRBP meeting once every 2 weeks for skills library build. Is this cadence sufficient given the Dec 2026 build deadline? | **✓ Confirmed: Fortnightly TR-HRBP syncs (Session \#5).** |
| **Priority functions for early completion** | What is the criteria for prioritization — headcount, complexity, or strategic importance? | **DECIDE — Owner: Angie \+ HRBP Lead** |

**03  SKILLS RATING FRAMEWORK**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Skills rating method** | Option A: Manager rates each skill independently (1 rating per skill). Granular; better for development conversations.Option B: Manager rates skill clusters (1 rating per cluster of related skills). Faster; less granular. | **DECIDE — HRBP working on this. Confirm in Thursday brainstorming session.** |
| **Skills weightage within the 25% pillar** | Equal weight across all skills assigned to the role, or priority skill per role weighted higher? Recommendation: equal weight in V1. Unequal weightage requires per-role configuration — high overhead. | **DECIDE — Recommendation: Equal weight in V1.** |
| **Behavioural rubric per skill** | Each skill needs a rubric — behavioural descriptors at each rating level.Option A: Narrative descriptor per level (e.g., "Demonstrates X in routine situations").Option B: Observable behavioural anchors (pass/fail or frequency scale).Option C: Proficiency statement only — no behavioural examples.Who writes the rubric text? HRBP per role family? PTR reviews? | **DECIDE — Content output required before platform build can begin.** |
| **Scorecard template flexibility** | Should the scorecard template be adjustable at the individual or group level? Session \#5 note: 'The scorecard template needs to be able to be adjusted — even the questions should have the ability to be adjustable. Highly flexible, like a Google Form.' This applies to Skills inclusion/exclusion and weightage per template. | **✓ Confirmed: Template must be flexible — enable/disable grading for skills per group. (Session \#5, \#6)** |

**04  SKILLS ASSESSMENT IN REVIEW CYCLE**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Employee skills self-rating — included?** | Employee self-rates each skill during annual self-review (same format as manager's rating). Discrepancy between self-rating and manager rating feeds calibration view. Recommendation: identical format for direct comparison. | **✓ Confirmed: Employee self-rates each skill. (Session \#5, Stage 2\)** |
| **Manager skills rating — Step 3 of manager review** | Manager rates employee on each skill after rating Q4 goals (Step 1\) and reviewing annual goals score (Step 2). Scale and method per Section 03\. Manager sees employee's self-rating before completing their own rating. | **✓ Confirmed: Skills included in 2026 cycle. Skills library to be created. (Session \#5, Stage 3\)** |
| **Self-rating visibility in calibration** | Does employee's skill self-rating appear alongside manager's rating in the calibration dashboard? Recommendation: Yes — enables direct comparison for HRBP and HOD challenge. | **DECIDE** |
| **Skills comment box** | Separate comment box for skills in manager review — distinct from goals and core values boxes. Mandatory input only required for: overriding system-calculated ratings, or assigning Unsatisfactory / very high (Exceptional) ratings. | **✓ Confirmed: Separate comment boxes for goals, skills, and values. Mandatory only for rating overrides and non-standard ratings. (Session \#6)** |
| **Skills mandatory comment trigger — exact conditions** | When exactly is the skills comment box mandatory?Option A: Only when manager overrides system-calculated rating.Option B: Only for Unsatisfactory or Exceptional ratings.Option C: Any time rating differs from employee self-rating by ≥ 2 tiers.Option D: A and B combined (override or non-standard rating). | **✓ Confirmed: Mandatory for rating overrides and non-standard ratings. (Session \#6) Exact trigger logic (A/B/C/D) to confirm in Thursday session.** |
| **Strengths and development areas — mandatory for skills?** | Session \#5 confirmed: bottom strengths and areas of development need to be mandatory. Does this apply per pillar (separate for Goals, Skills, Values) or as one overall narrative? | **✓ Confirmed: Strengths and development areas mandatory. Per pillar or overall — DECIDE.** |

**05  SKILLS IN CALIBRATION**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Skills in calibration view** | Are individual skill ratings visible in the calibration dashboard? Option A: Each skill rating visible individually (full granularity for HRBP/HOD).Option B: Only the aggregated Skills pillar score (25%) visible in calibration.Option C: Skills pillar score visible by default, individual skills expandable on click. | **DECIDE — Deferred to Module 3 Calibration session.** |
| **Skills gap as calibration auto-flag** | If employee self-rates significantly higher or lower on skills than manager — is this surfaced as an auto-flag? Consistent with calibration auto-flag framework (consecutive tiers, PIP employees, retention flags). | **DECIDE — Deferred to Module 3 Calibration session.** |
| **Skills rating changes in calibration — who executes?** | Post-calibration, if HOD and HRBP agree on a different skills rating: who makes the change in the platform? HOD? HRBP? PTR Admin? Must be traceable — audit log required. | **DECIDE — Deferred to Module 3 Calibration session.** |

**06  OPEN ITEMS & NEXT STEPS**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Thursday brainstorming session — Skills** | Dedicated brainstorming session for Skills and Core Values modules scheduled for Thursday, 1:30 PM – 2:30 PM (post Session \#6, Sep 1, 2026). Angie to prepare brainstorming content. Group to create Skill Module and link to platform. | Scheduled (Session \#6). Owner: Group / Angie for content prep. |
| **\+ Future replacement by leadership capabilities** | Skills module will remain for current cycle, pending potential replacement by leadership capabilities in future iterations of the platform. Is there a Phase 2 roadmap decision or dependency to note now? | \+ NEW — Acknowledge for Phase 2 planning. Not a V1 blocker. |
| **⚑ Skills ROI concern — on record** | ⚑ S.M. Fahim raised concerns regarding the return on investment of the skills module in its current form. The group overruled and confirmed Skills V1. This concern is logged for retrospective review after the first annual cycle — assess whether skills ratings drove meaningful development conversations. | **⚑ LOW ROI concern logged. Skills V1 confirmed despite concern. Retrospective recommended post-2026 cycle.** |
| **Skills module — 'not applicable' option** | If a skill assigned to a role family is not relevant to a specific employee's actual responsibilities, should there be a 'Not Applicable' option at the skill level? Who can mark N/A — manager? PTR Admin only? | **DECIDE in Thursday session.** |

# Module 6: Core Values Assessment

### **Core Values Assessment**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Values rating method** | A: Observable behaviour statements — 4 behavioural anchors per value (yes/no or frequency) B: Rating scale per value — same 5-tier or simpler 3-tier C: Free text evidence per value D: Hybrid — rating scale \+ one free-text evidence box per value Industry standard for defensibility: Option D. | **We will revamp the scoring for each core value between 1 to 5 and under each of the scores, there will be about 3-5 simple statements to help guide the grading.** |
| **⚑ Values weightage** | ⚑ Rating 7 individual values with different weights is high overhead. A: All 7 values weighted equally within the 25% pillar — simplest. B: Some values weighted higher (e.g., Integrity at 20%). C: Reduce to 5 core values in the platform — consolidate similar values. Recommendation: Option A for V1. | **14.28% per value out of 100** |
| **Values self-rating** | Employee self-rates each value in the same format as manager. Discrepancy feeds calibration. Recommend: identical format for direct comparison. | **Aligned** |

**01  CORE VALUES FRAMEWORK**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Core Values names and definitions — confirmed list** | The 7 FN Core Values need to be confirmed with exact names and one-line definitions before behavioural anchors can be written. Are the values from the existing rubric (Revolut-era) the same as the values to be used in V1? | **Core value names are aligned, we will be making them 1-5 rating but the description for each of the rating, that’s something we will have to work on.** |

**02  CORE VALUES RATING METHOD**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Values rating scale** | Should the rating scale for Core Values be the same 5-tier scale as the overall annual rating (Exceptional / Exceeding / Performing / Developing / Unsatisfactory)? Or a separate, simpler scale (e.g., 3-tier: Below / Meeting / Exceeding expectations)? | **1-5** |
| **Behavioural anchors per value** | Does each of the 7 values have behavioural descriptors at each rating level? What level of detail? Minimum 3 anchors per level per value \= 7 × 5 × 3 \= 105 anchor statements. Who writes this content? PTR? HRBP? Working group?Note: This is a significant content production task — must be assigned and delivered before Dec 2026\. | **The behavioral anchors or descriptions for each of the core values would be Fahim.** |
| **⚑ Values weightage within the 25% pillar** | ⚑ Rating 7 individual values with different weights is high overhead.Option A: All 7 values weighted equally within the 25% pillar — simplest.Option B: Some values weighted higher (e.g., Integrity at 20%, others at \~13%).Option C: Reduce to 5 values in the platform — consolidate similar ones.Recommendation: Option A for V1. | **14.3%** |

**03  CORE VALUES IN SELF-REVIEW**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Format of employee self-rating vs. manager rating** | Does the employee use the identical rating method as the manager (same scale, same fields)? Or a simplified version (e.g., manager uses 5-tier with anchors; employee uses 3-tier)? Recommendation: identical format for direct comparison. | **Identical format; however, the final core value grade will not be visible for the employee but it will be for the manager. Also, please include a final comment box on the core value (not for each, just 1 final one)** |
| **Values self-rating visibility to manager** | When does the manager see the employee's Core Values self-rating? Per Session \#6 reversal: manager CAN see employee self-review before submitting own rating. Does this apply to the Core Values pillar as well? | **Confirmed: Manager sees self-review before submitting their own rating.**  |

**04  CORE VALUES IN MANAGER REVIEW**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Core Values comment box** | Separate comment box for Core Values in manager review — distinct from Goals and Skills boxes. Mandatory only for overriding system-calculated ratings or assigning Unsatisfactory / Exceptional ratings. | **✓ Confirmed: Separate comment boxes for goals, skills, and values. Mandatory only for rating overrides and non-standard ratings. (Session \#6)1 overall comment box for values.** |
| **Manager override of system-calculated Core Values score** | Session \#6 reversal: manager CAN override the system-calculated annual goal rating with mandatory justification. Does the same override logic apply to the Core Values pillar score? Or is Core Values always manager-entered (no system calculation)? | **They cannot override \- it has to be based on the system calculation.** |
| **Rating gap flag — Core Values self vs. manager** | If manager Core Values rating differs significantly from employee self-rating: is this an automatic flag for the manager (requiring comment), or is it only surfaced in calibration for HRBP and HOD?Session \#5: gap handling deferred to calibration stage. | Only surfaced in calibration for HRBP and HOD as a flag (not when the manager is grading) |

**06  OPEN ITEMS & NEXT STEPS**

| Item | Detail | Status / Decision |
| :---- | :---- | :---- |
| **Thursday brainstorming session — Core Values** | Dedicated brainstorming session for Skills and Core Values modules scheduled for Thursday, 1:30 PM – 2:30 PM (post Session \#6, Sep 1, 2026). Angie to prepare content. Group to create Core Values Module and link to platform. | Scheduled (Session \#6). Owner: Group / Angie for content prep. |
| **⚠ ACTION: Rubric revision — Fahim** | Fahim to revise the existing Core Values rubric based on previous feedback (noted as ineffective by Angie in Session \#6). Output to be shared with Angie and team before the Thursday session. | **⚠ ACTION OPEN — Owner: Fahim. Due: Before Thursday session.** |
| **⚠ ACTION: Brainstorming content preparation — Angie** | Angie to organize and prepare core values content for the Thursday brainstorming session. This includes existing rubric materials, any Revolut reference, and the confirmed list of 7 values. | **⚠ ACTION OPEN — Owner: Angie (angie.yunni). Due: Before Thursday session.** |
| **Core Values pillar — calendar year or cycle alignment** | Are Core Values rated on the full calendar year (Jan–Dec 2026\) or on the performance cycle (Q2–Q4 for 2026 since Q1 is transition)? Does the transition year affect how Core Values are assessed? | **DECIDE — Clarify scope of Core Values assessment for the 2026 transition year.** |
| **\+ Core Values for employees in notice period** | Should employees in notice period (January 2027\) be included in Core Values assessment during the annual review cycle? Consistent with goal tracking policy: notice-period employees are deactivated, not deleted. | **\+ NEW — DECIDE. Consistent with leaver handling policy.** |

# Module 7: Notification Engine

# Module 8: PIP & Performance Exit

# Module 9: Probation

# Module 10: Promotion & Career Pathing

