# Goals Module — Requirements Checklist

## Source Discipline

This checklist is derived **strictly from the supplied Goal Management Planning document and Performance Platform Brainstorming meetings #1, #2, and #3**.

- `[x]` = explicitly aligned/confirmed in the source material.
- `[ ]` = not a checkbox-style implementation status; it means the requirement is listed for implementation.
- **V2 / Phase 2 / Shelved / Parking Lot** items are kept separate and are **not treated as V1 requirements**.
- Where the source material contains unresolved or contradictory decisions, this document preserves that status rather than inventing a resolution.
- No additional product behavior has been added from general knowledge.

---

# 1. Goal Cycle Management

## 1.1 Cycle flexibility

- [ ] Support flexible goal-cycle frequencies.
- [ ] Support **monthly** cycles.
- [ ] Support **quarterly** cycles.
- [ ] Support **biannual** cycles.
- [ ] Support **annual** cycles.
- [ ] Support multiple goal cycles running concurrently.
- [ ] Allow concurrent cycles to have independent configurations.
- [ ] Allow different teams/regions/departments to operate on separate cycles/windows.
- [ ] Do not hard-code a single company-wide cycle schedule.

Source: Brainstorming #1 and #3. The team explicitly required flexible frequencies and concurrent cycles with independent settings. fileciteturn8file0L69-L76 fileciteturn8file10L747-L749

## 1.2 Goal-setting window

- [ ] Support configurable goal-setting windows rather than hard-coding the duration.
- [ ] Support opening and locking cycles within a defined period.
- [ ] Allow the specific lock/deadline day to be configured per cycle.
- [ ] Preserve the ability to use a 30-day model as the current/default model discussed in the meetings.

Source: Brainstorming #1 and #2. fileciteturn8file11L817-L821 fileciteturn9file6L718-L722

## 1.3 Population-specific cycle handling

- [ ] Allow multiple cycles to operate for different teams/regions.
- [ ] Allow a cycle to be extended for a specific team.
- [ ] Allow a cycle to be extended for a specific department.
- [ ] Allow a cycle to be extended for a group of people.
- [ ] Provide a simple interface for such extensions.

Source: Goal Management Planning. fileciteturn9file5L583-L593

## 1.4 Eligibility

- [ ] Determine quarterly goal eligibility based on joining date.
- [ ] Employees joining after the start of a quarter are ineligible for that quarter.
- [ ] Such employees begin goal setting in the following quarter.
- [ ] Probation status does not change this joining-date rule according to the latest meeting decision.
- [ ] Mirror the existing Revolut eligibility and scheduling capabilities where required.

Source: Brainstorming #3. fileciteturn8file8L628-L634; next-step requirement to mirror existing eligibility/scheduling capabilities. fileciteturn8file8L594-L600

## 1.5 Cycle hard-lock / post-lock configuration

The source material contains **two stages of discussion**:

### Earlier configuration discussion
- [ ] Provide flexible locking windows.
- [ ] Provide an option for a hard-lock workflow or approval-based workflow after the initial period.
- [ ] Allow the hard-lock date to be configured per cycle.

Source: Brainstorming #1. fileciteturn8file1L98-L100; fileciteturn9file10L1005-L1007

### Later decision
- [ ] Do **not** treat Day 30 as an absolute hard lock for goal changes.
- [ ] Allow post-Day-30 goal modifications through the additional approval process.
- [ ] Goal additions, deletions, and goal-post/target modifications after Day 30 require two-tier approval from the direct manager and manager's manager.
- [ ] Notify HRBP for post-Day-30 changes where specified in the planning/meeting notes.

Source: Brainstorming #3. fileciteturn8file10L739-L746

> **Note:** The supplied documents contain earlier "hard lock" language and later discussion rejecting a true hard lock. This checklist therefore preserves both the historical requirement and the later decision instead of silently choosing one.

---

# 2. Goal Creation

## 2.1 OKR reference

- [ ] Display company/department OKRs as read-only reference while employees write goals.
- [ ] Respect OKR RBAC permissions.
- [ ] Use department-level OKRs as the primary reference point.
- [ ] Keep OKR and performance platforms separate.
- [ ] Do not automatically populate goals from OKRs in V1.

Source: Brainstorming #1 and #2. fileciteturn8file0L60-L68 fileciteturn8file6L464-L467

### V2
- [ ] Consider direct OKR-to-goal creation/population from the OKR platform.

Source: Brainstorming #2. fileciteturn8file6L464-L467

## 2.2 Goal count

- [ ] Require a minimum of **2 goals** before submission.
- [ ] Do not enforce a maximum number of goals.
- [ ] Warn employees when they have fewer than 3 goals.
- [ ] Warn employees when they have more than 5 goals.
- [ ] Allow the employee to continue after the warning.

Source: Goal Management Planning and Brainstorming #2. fileciteturn9file5L618-L624 fileciteturn8file6L468-L474

## 2.3 Draft auto-save

- [ ] Automatically save goals as drafts.
- [ ] Allow employees to return to drafts across multiple sessions.
- [ ] Prevent clicking outside a field from cancelling entered information.

Source: Goal Management Planning. fileciteturn9file2L234-L239

## 2.4 Copy previous quarter

- [ ] Provide a "copy from last quarter" action.
- [ ] Copy previous goals into draft state.
- [ ] Do not submit copied goals automatically.
- [ ] Pull the employee into the populated form so they can review/edit before submission.

Source: Goal Management Planning. fileciteturn9file2L240-L246

---

# 3. Goal Fields

The following fields were explicitly identified for the V1 goal structure:

- [ ] Goal description.
- [ ] Goal type:
  - [ ] Outcome
  - [ ] Output
- [ ] Process type:
  - [ ] OKR
  - [ ] BAU
  - [ ] PI
- [ ] Priority:
  - [ ] High
  - [ ] Medium
  - [ ] Low
- [ ] Goal weightage.
- [ ] Linked goal / cascaded goal reference.

Source: Goal Management Planning. fileciteturn9file2L253-L263

## Goal field mapping

- [ ] Map V1 goal fields from the existing Revolut structure.
- [ ] Keep the V1 field structure familiar to users of the current system.

Source: Brainstorming #2. fileciteturn8file8L826-L829

---

# 4. Goal Weightage

- [ ] Allow employees to assign weightage to each goal.
- [ ] Require total goal weightage to equal **100%** before submission.

Source: Goal Management Planning. fileciteturn9file2L264-L266

---

# 5. Measurements

## 5.1 Measurement requirement

- [ ] Every goal must have at least **1 measurement**.
- [ ] Prevent submission when a goal has no measurement.

Source: Goal Management Planning. fileciteturn9file2L267-L274

## 5.2 Measurement types

- [ ] Support milestones.
- [ ] Support metrics.
- [ ] Support multiple measurements within a goal.
- [ ] Allow milestones and metrics to be mixed within the same goal.
- [ ] Milestones are described as binary checklists.
- [ ] Metrics are described as numeric start-to-target measurements.

Source: Goal Management Planning. fileciteturn9file2L267-L274

## 5.3 Measurement logic

- [ ] Keep the existing Revolut measurement structures.
- [ ] Revamp "keep less than".
- [ ] Revamp "keep between".
- [ ] Revamp "keep more than".
- [ ] Address measurement behavior for decreasing numbers.

Source: Goal Management Planning. fileciteturn9file2L267-L276

### V2
- [ ] Customized formulas are a V2 item.
- [ ] Complex measurement integrations/formulaic systems are deferred to V2.

Source: Goal Management Planning and Brainstorming #2. fileciteturn9file2L275-L276 fileciteturn8file8L833-L839

## 5.4 Measurement weightage

- [ ] Allow each measurement to have its own weight.
- [ ] Require measurement weights to sum to **100% per goal**.
- [ ] Support showing overall percentage impact.

Source: Goal Management Planning. fileciteturn9file2L277-L282

- [ ] Default to equal weighting across metrics when no different configuration is specified.

Source: Brainstorming #2. fileciteturn8file8L829-L832

## 5.5 Measurement units

- [ ] Use a predefined list of measurement units.
- [ ] Existing Revolut measurement units are to be mapped into the new platform.
- [ ] Examples discussed include %, number, days and currency.
- [ ] Only admins can add new units.

Source: Goal Management Planning and Brainstorming #2. fileciteturn9file2L283-L287 fileciteturn8file8L833-L839

## 5.6 Proof links and comments

- [ ] Enable proof links.
- [ ] Enable comments.

Source: Goal Management Planning. fileciteturn9file2L267-L274

> The documents do **not** specify a separate milestone-specific "notes/evidence" workflow.

---

# 6. Goal Submission

## 6.1 Batch submission

- [ ] Employee submits all goals in one action.
- [ ] Do not require individual goal submission.
- [ ] Submit button remains unavailable until the goal requirements are fulfilled.
- [ ] Submission requires minimum 2 goals.
- [ ] Submission requires 100% total goal weight.
- [ ] Submission requires at least 1 measurement per goal.

Source: Goal Management Planning and Brainstorming #3. fileciteturn9file0L15-L29 fileciteturn8file7L540-L552

## 6.2 Submission notification

- [ ] Send one consolidated notification to the manager per employee submission.
- [ ] Do not send one notification per goal.
- [ ] Notification should appear in the manager's To-Do area.
- [ ] Notification channels discussed include email/platform/ClickUp.

Source: Goal Management Planning. fileciteturn9file0L24-L29

---

# 7. Manager Approval

## 7.1 Approval view

- [ ] Manager sees the team approval queue.
- [ ] Manager can move through employees in the queue.

Source: Goal Management Planning. fileciteturn9file0L35-L47

## 7.2 Batch approval

- [ ] Manager approves all goals for an employee together.
- [ ] Remove the need to approve goals individually.

Source: Brainstorming #2. fileciteturn9file9L911-L914

## 7.3 Manager editing

Manager can:

- [ ] Edit goal description.
- [ ] Edit goal type.
- [ ] Edit priority.
- [ ] Adjust goal weightage.
- [ ] Adjust measurement weightage.
- [ ] Add measurements.
- [ ] Remove measurements.
- [ ] Add comments.
- [ ] Approve the submission.

Source: Goal Management Planning. fileciteturn9file0L48-L53

## 7.4 Employee notification after manager edits

- [ ] Notify the employee when the manager edits the employee's goals.
- [ ] Make manager changes visible to the employee.

Source: Goal Management Planning and Brainstorming #2. fileciteturn9file0L54-L61 fileciteturn8file8L855-L857

## 7.5 Return/send-back

- [ ] Manager can return the entire submission for revisions.
- [ ] Employee fixes the submission.
- [ ] Employee resubmits the submission.
- [ ] Do not use individual-goal return as the standard process.

Source: Brainstorming #2 and #3. fileciteturn9file6L707-L711 fileciteturn8file7L548-L552

## 7.6 Activity log

- [ ] Maintain an activity log for changes.
- [ ] Maintain an activity log for approvals.
- [ ] Track who performed the action.
- [ ] Track the timestamp.

Source: Brainstorming #1. fileciteturn8file0L51-L59 and fileciteturn9file10L1002-L1004

---

# 8. Goal Locking and Post-Day-30 Changes

## 8.1 Day-30 behavior

The documents contain both an earlier "hard lock" decision and a later change in direction.

### Earlier documented behavior

- [ ] Day-30 hard lock was specified.
- [ ] No-submission by Day 30 results in auto-lock.
- [ ] No-submission is flagged incomplete.
- [ ] No-submission receives a zero score for the quarter and feeds into the annual average.
- [ ] PTR Admin override was specified for exceptions.
- [ ] The hard-lock date is configurable per cycle.

Source: Goal Management Planning. fileciteturn9file0L81-L94

### Later meeting decision

- [ ] Goals should **not** be treated as absolutely hard locked after Day 30.
- [ ] Goal changes after Day 30 remain possible through an additional approval process.

Source: Brainstorming #3. fileciteturn8file8L640-L641

## 8.2 Post-Day-30 modifications

The following changes were explicitly discussed:

- [ ] Modify goal target/goal post.
- [ ] Add a goal.
- [ ] Delete a goal.
- [ ] Require two-tier approval from the direct manager and manager's manager.
- [ ] Notify HRBP where required.
- [ ] Maintain the change in the activity/audit history.

Source: Brainstorming #3 and Goal Management Planning. fileciteturn8file10L739-L746 fileciteturn9file4L537-L550

## 8.3 Day-29 submission edge case

- [ ] If an employee submits on Day 29 and the manager has not approved by Day 30, the submission remains pending approval.
- [ ] If approval happens after the Day-30 threshold, the additional approval process applies.
- [ ] PTR may delegate elsewhere if required.

Source: Goal Management Planning. fileciteturn9file4L551-L560

---

# 9. Goal Changes Due to Organizational Changes

## 9.1 Manager change

- [ ] Transfer goals to the new manager.
- [ ] New manager inherits the goals.
- [ ] New manager can request/edit goals.
- [ ] Changes requiring post-Day-30 modification follow the two-level approval process.

Source: Goal Management Planning and Brainstorming #3. fileciteturn9file4L530-L536 fileciteturn8file10L734-L741

## 9.2 Team change

- [ ] Transfer goals when an employee moves to a new team.
- [ ] Allow goals to be adjusted.
- [ ] Post-Day-30 adjustment requires two-level approval.

Source: Goal Management Planning. fileciteturn9file4L546-L550

## 9.3 Goal becomes irrelevant

- [ ] A goal that becomes irrelevant can be deleted after Day 30.
- [ ] Deletion after Day 30 requires two-level approval.

Source: Goal Management Planning. fileciteturn9file4L537-L545

---

# 10. Delegation

- [ ] Provide approval delegation for manager absence.
- [ ] Delegation is manual.
- [ ] Do not automatically delegate approval responsibility.
- [ ] Delegation can assign approval responsibility to another manager/peer/senior manager as described in the meetings.
- [ ] Delegation must be audit logged.
- [ ] Delegation access is restricted to designated administrative roles.
- [ ] The manager's original responsibility remains identifiable.

Source: Brainstorming #1, #2 and #3. fileciteturn8file1L92-L100 fileciteturn8file8L699-L702 fileciteturn8file10L745-L746

---

# 11. Progress Updates

## 11.1 Employee progress

- [ ] Allow real-time progress updates.
- [ ] Allow progress updates according to a cadence.
- [ ] Cadence examples explicitly discussed: weekly, monthly, quarterly.
- [ ] Allow employees to update milestone progress.
- [ ] Allow employees to update metric current values.
- [ ] Do not require a formal manager sign-off for every quarterly progress update.

Source: Goal Management Planning and Brainstorming #3. fileciteturn9file1L155-L177 fileciteturn8file2L188-L192

## 11.2 Manager visibility

- [ ] Managers can see employee progress updates in real time.
- [ ] Managers do not need to wait for the check-in to see progress.
- [ ] Managers can view progress through the employee profile.
- [ ] The planning document says no notification/update is required for every logged progress update.

Source: Goal Management Planning. fileciteturn9file1L162-L167

## 11.3 Manager progress adjustment

- [ ] Managers can adjust employee progress updates.
- [ ] Manager adjustments are recorded in an activity log.
- [ ] Activity history records who performed the adjustment.

Source: Goal Management Planning and Brainstorming #2. fileciteturn9file1L168-L171 fileciteturn9file6L728-L731

## 11.4 Blocked goals

- [ ] No blocked-goal workflow is required.

Source: Goal Management Planning. fileciteturn9file1L185-L189

## 11.5 Progress history

- [ ] Maintain progress history/activity information.
- [ ] The source discusses a full timeline of updates and the effect of update hygiene on visualization.
- [ ] The source also identifies a future API/dashboard connection for automatic updates.

Source: Goal Management Planning. fileciteturn9file1L178-L184

### V2
- [ ] API connection for external dashboards and automatic goal updates.

Source: Goal Management Planning. fileciteturn9file1L178-L184

---

# 12. End-of-Quarter Goal Updates

- [ ] Automatically remind employees during the last 15 days of the quarter to update goal status/results.
- [ ] Connect the reminders to the reminder cadence.
- [ ] Require actual-result updates during the last 15 days.
- [ ] Support late updates after the cycle closing window where required.
- [ ] Late update access was explicitly required for CPM, BI and MKT in the planning document.

Source: Goal Management Planning. fileciteturn9file1L190-L198

---

# 13. Last Updated Indicator

- [ ] Show a "last updated" indicator for goal progress.
- [ ] The indicator is intended to help managers identify stale goal progress.
- [ ] The indicator should show the last time a goal was updated by an employee.

Source: Brainstorming #3. fileciteturn8file2L188-L192 and next-step implementation item. fileciteturn8file8L599-L603

---

# 14. Notifications and Reminder Cadence

## 14.1 Notification engine

- [ ] Provide an in-platform notification engine.
- [ ] Support email notifications.
- [ ] Support ClickUp notifications/integration as specified.
- [ ] Support notifications for goal-cycle updates, submissions and approvals.

Source: Brainstorming #1. fileciteturn8file1L111-L116

## 14.2 Submission notifications

- [ ] One consolidated notification per employee batch submission.
- [ ] Do not send one notification for each goal.

Source: Goal Management Planning. fileciteturn9file0L24-L29

## 14.3 Reminder cadence

- [ ] Support manual reminder cadence.
- [ ] Allow managers to send mass emails/reminders.
- [ ] Allow control over reminder template.
- [ ] Allow control over timing.
- [ ] Allow control over recipient list.
- [ ] Initial implementation preference is email.
- [ ] ClickUp was discussed as a later integration in the planning document, while broader platform notes also identify ClickUp notifications as a requirement.

Source: Brainstorming #2 and Goal Management Planning. fileciteturn8file8L862-L865 fileciteturn9file0L62-L71

---

# 15. Goal Access / Roles

The goal-management role structure explicitly discussed:

## Employee

- [ ] Create goals.
- [ ] Edit goals.
- [ ] Submit goals.
- [ ] View own goals.

## Manager

- [ ] Create goals.
- [ ] Edit goals.
- [ ] Approve goals.

## Senior Manager

- [ ] View goals.
- [ ] No goal edit/create/submit authority was specified for senior managers in the role discussion.

## HRP / HRBP

- [ ] View goals according to the defined access structure.

## HOD

- [ ] Access within their department.

## Super-admin / PTR administrative access

- [ ] View-all access where specified.
- [ ] Administrative delegation access where specified.

Source: Brainstorming #1. fileciteturn8file4L359-L368 and role discussion transcript. fileciteturn9file13L1213-L1234

---

# 16. Goal History and Employee Records

- [ ] Retain all goal history permanently in the employee profile.
- [ ] Retain rating history.
- [ ] Do not delete historical data when an employee leaves.
- [ ] Set leaver profile to inactive.
- [ ] Restrict leaver historical data visibility to PTR.

Source: Goal Management Planning. fileciteturn9file3L440-L451

---

# 17. Reporting and Goal Dashboards

## 17.1 Real-time dashboard

- [ ] Replace the existing FN performance dashboard functionality with the new platform.
- [ ] Show real-time goal submission percentage.
- [ ] Show real-time manager approval percentage.
- [ ] Provide appropriate HRBP access.
- [ ] Provide appropriate manager access.

Source: Goal Management Planning. fileciteturn9file3L405-L421

## 17.2 Manager dashboard

- [ ] Show team goal progress.
- [ ] Show submission status.
- [ ] Show check-in completion in real time.

Source: Goal Management Planning. fileciteturn9file3L422-L425

## 17.3 Manager's-manager dashboard

- [ ] Show team goal progress.
- [ ] Show submission status.
- [ ] Show check-in completion.
- [ ] Show the corresponding view for reportees who are managers.
- [ ] Use a tree-format view.

Source: Goal Management Planning. fileciteturn9file3L426-L432

## 17.4 HOD dashboard

- [ ] Show department-level goal progress.
- [ ] Show compliance across teams.

Source: Goal Management Planning. fileciteturn9file3L433-L435

## 17.5 PTR dashboard

- [ ] Show organization-wide compliance.
- [ ] Show who has submitted.
- [ ] Show who is pending.
- [ ] Show who is overdue.
- [ ] Show adherence percentage.
- [ ] Show goal quality.

Source: Goal Management Planning. fileciteturn9file3L436-L439

## 17.6 Export

- [ ] Dashboard data should be exportable.
- [ ] Export format and access were left for technical confirmation.

Source: Goal Management Planning. fileciteturn9file3L405-L421

---

# 18. Goal Audit Trail

- [ ] Maintain comprehensive audit logs for goal edits.
- [ ] Maintain audit logs for approvals.
- [ ] Track who performed each action.
- [ ] Track the timestamp for each update.
- [ ] Track manager edits.
- [ ] Track delegation.
- [ ] Track progress adjustments.

Source: Brainstorming #1 and #2. fileciteturn8file0L51-L59 fileciteturn8file5L387-L415

---

# 19. Data Migration Relevant to Goals

- [ ] Migrate required historical performance/goal data from Revolut.
- [ ] Q2 and Q3 Revolut data were identified for migration.
- [ ] Q4 goal data was identified for migration in the planning checklist.
- [ ] Migration must happen before the relevant annual appraisal.
- [ ] UAT must happen before migration.
- [ ] Validate a 20% sample after migration.

Source: Goal Management Planning and Brainstorming #3. fileciteturn9file3L440-L451 fileciteturn8file3L250-L254

---

# 20. Explicitly Shelved / Deferred / Not V1

These items appeared in the source material but were **not confirmed as V1 requirements**.

## 20.1 Goal cascading

- [ ] **Do not treat full goal cascading as a V1 requirement.**
- [ ] Cascading was moved to the parking lot due to complexity.

Source: Brainstorming #2. fileciteturn8file8L818-L825

## 20.2 Direct OKR → Goal population

- [ ] **Do not treat automatic OKR-to-goal population as a V1 requirement.**
- [ ] V1 uses a read-only OKR reference panel.
- [ ] Direct population was discussed as V2.

Source: Brainstorming #2. fileciteturn8file6L464-L467

## 20.3 Complex/custom formulas

- [ ] **Do not treat customized formulas as V1.**
- [ ] Custom formulas were explicitly designated V2.

Source: Goal Management Planning. fileciteturn9file2L275-L276

## 20.4 AI goal-writing assistant

- [ ] **Do not treat AI goal-writing as V1.**
- [ ] It was identified as a Phase 2/V2 nice-to-have.

Source: Goal Management Planning. fileciteturn9file2L303-L307

## 20.5 Probation-specific goal workflow

- [ ] **Do not build a separate probation goal workflow in the current phase.**
- [ ] Probation goal logic was deferred to Phase 2.

Source: Brainstorming #3. fileciteturn8file2L173-L177

## 20.6 Blocked-goal workflow

- [ ] **Do not build a dedicated blocked-goal notification/workflow.**
- [ ] The planning document explicitly marks this as not required.

Source: Goal Management Planning. fileciteturn9file1L185-L189

---

# 21. Items Explicitly Marked as Open / Not Fully Decided

These should **not be converted into requirements without a later decision**.

- [ ] Exact handling of the difference between number-based goals that can exceed 100% and milestone goals that are typically capped at 100%.
- [ ] Exact handling/accommodation for target changes when progress has already been made toward the old target.
- [ ] Exact check-in window configuration beyond the documented ability to customize it.
- [ ] Dashboard export format and access level.
- [ ] Final technical scope/effort for data migration.
- [ ] Any additional probation-specific process.
- [ ] Any future cascading-goal functionality.
- [ ] Any custom measurement/formula functionality.

Source: Goal Management Planning. fileciteturn9file6L732-L736; fileciteturn9file1L172-L184; fileciteturn9file3L419-L421; fileciteturn9file11L1113-L1117

---

# 22. Goal Lifecycle — Source-Based Summary

The documented lifecycle is:

**Cycle / eligibility**

→ **Employee drafts goals**

→ **Auto-saved draft**

→ **Employee completes goal requirements**

→ **Batch submission**

→ **Pending manager approval**

→ **Manager reviews**

→ **Manager edits OR returns submission**

→ **Employee revises and resubmits if returned**

→ **Manager approves**

→ **Goal progresses through the quarter**

→ **Employee updates milestones / metric values**

→ **Manager views and may adjust progress**

→ **Last-15-day result update/reminder**

→ **Quarterly check-in / rating process**

→ **Goal and rating history retained**

Source: Goal Management Planning and Brainstorming #3. fileciteturn8file7L540-L554 fileciteturn9file0L15-L29 fileciteturn9file1L155-L198

---

# 23. Source-of-Truth Boundaries

The following should **not be silently added to the Goals requirements because they were not explicitly established as such in the supplied documents**:

- [ ] "Not Started / On Track / At Risk / Behind / Completed" automatic goal-status system.
- [ ] Milestone-specific "In Progress / Completed" status labels.
- [ ] Milestone-specific notes/evidence workflow beyond the documented proof links/comments.
- [ ] Automatic goal-health calculations.
- [ ] Automatic goal-status transitions.
- [ ] A maximum number of goals.
- [ ] A cycle-level toggle for every individual goal field.
- [ ] A cycle-level toggle for every measurement type.
- [ ] Any functionality not represented in the source material above.

