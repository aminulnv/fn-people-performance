# NEXT OKR — Notification architecture

Share this with an engineer building notifications on another platform. It describes **how notices are produced, stored, delivered, and opened** in NEXT OKR, and the rules that keep a blast from reaching the wrong people.

**Live app:** https://okr.nextventures.io

---

## One-line model

A domain event writes **one inbox row per recipient**. That row is the source of truth. Email, browser push, and ClickUp are mirrors of the same row, each with its own opt-in and kill switch. The inbox never depends on a channel succeeding.

```
Domain action (comment, cycle, reminder, survey, …)
        │
        ▼
Publisher in that domain
  1. Decide who (roles, policy, audience) — never “everyone” by default
  2. Drop the actor (you do not notify yourself)
  3. Insert Notification row (type, title, body, payload, actionUrl, dedupeKey)
  4. Fan out, best-effort, after the row exists
        │
        ├── In-app inbox     (the row itself; bell + Home)
        ├── Device push      (Web Push / OS notification)
        ├── ClickUp Chat DM  (work chat, same copy + deep link)
        └── Email            (only when that type or the user’s channels ask for it)
```

If push or ClickUp fails, the person still has the inbox item. If email is off, the inbox item still exists.

---

## Why this shape

| Decision | What it buys |
|---|---|
| Inbox row first | Read/unread, history, and deep links survive channel outages. |
| Domain owns “who” | A comment notifier knows Accountable vs mentioned. A generic sender does not. |
| Shared delivery helpers | Push and ClickUp are one function. Publishers do not each talk to ClickUp. |
| Namespaced `type` string | New product areas add a type. They do not fork the inbox. |
| `dedupeKey` on the row | A quarter activation or a weekly reminder cannot double-fire for the same person. |
| Relative `actionUrl` | Clicking a row opens the exact KR, comment, survey, or tracker — not a homepage. |
| Broadcast scope | A laptop pointed at a copy of production cannot email the company. |
| Payload kept on the row | The inbox can show actor, context, and CTA later, and can hide rows whose target was deleted. |

The notification package does **not** import OKR, auth, or survey code. Those modules call the notification path. That one-way dependency is the rule that keeps the inbox from becoming a second product.

---

## Runtime flow

### 1. Something happens

Examples: someone is @mentioned, a blocker is tagged, a quarter goes live, a survey is assigned, a personal reminder is due.

The write that saved the comment (or cycle, or survey) is already committed. Notification delivery is **best-effort after that**. A flaky ClickUp call must not roll back the comment.

### 2. The domain publisher picks recipients

Recipients come from the domain, not from a global “notify all users” list.

| Kind of event | Who gets it |
|---|---|
| @mention | The people named in the text, except the author |
| Planning comment | Accountable stakeholders on that KR, objective, or scope |
| Blocker tagged | The people tagged on the blocker |
| Blocker resolved | The person who reported it |
| Feedback filed | Users who hold triage permission |
| Survey assigned | That assignee |
| Quarter activated / lock / reflection | The audience for that broadcast, then passed through the broadcast guard |
| Check-in reminder | People whose personal or platform schedule is due, on the channels they turned on |
| Horizontal alignment request | The people named on that department’s notification policy |
| Welcome | The user who just received platform access |

Inactive users are skipped. The actor is removed from the list.

### 3. One row per recipient

Table: `notification`.

| Column | Role |
|---|---|
| `recipient_id` | Owner. Inbox queries and “mark read” are scoped to this user only. |
| `type` | Stable id, e.g. `okr.cycle_activated`, `kr_comment_mention` |
| `priority` | `high` / `normal` / `low` |
| `title`, `body` | What the inbox shows. Plain text. |
| `payload` | Structured context: actor, resource id, CTA label. Not HTML. |
| `action_url` | In-app path (`/weekly-tracker?...`) or an `https://` link. Sanitized before render. |
| `dedupe_key` | Optional. Same key is not inserted twice. |
| `group_key` | Optional. Related rows can collapse in the bell. |
| `is_read`, `read_at` | Inbox state |
| `email_status` | `pending` → `sent` or `skipped` (also `digest_queued` for a future digest) |

Indexes: `(recipient_id, is_read, created_at DESC)` for the bell, `(dedupe_key, created_at)` for duplicate checks.

### 4. Side channels mirror the row

Shared helper: `notifyUserSideChannels(userId, { title, body, actionUrl, notificationId })`.

It runs **device push and ClickUp in parallel**. Either can fail without failing the other. The inbox row is already saved.

Email is **not** automatic on every type. Publishers send mail only when:

- the event is an email event (cycle activation, check-in reminder, blocker mail), and
- that user’s channels or the platform policy allow it, and
- for company-wide mail, the broadcast guard allows that address.

### 5. The person sees it

- **Bell and Home** load `GET /api/notifications` (session required, rate limited). Newest 40 live rows, plus an unread count.
- Opening a row marks it read and navigates to `actionUrl`.
- While the tab is open, the app refetches about every 45 seconds and raises an OS notification for rows it has not seen yet (no second push round-trip).
- With the tab closed, **Web Push** (VAPID) delivers to browsers the user subscribed in Settings.
- **ClickUp** gets a DM from the platform account, with the same title, body, and a link back into the app.

Mark-read is `PATCH /api/notifications/:id` and only updates a row whose `recipient_id` is the signed-in user. `POST /api/notifications/read-all` does the same for the whole inbox.

---

## Channels

| Channel | When it fires | User control | Failure mode |
|---|---|---|---|
| In-app inbox | Every published row | Always on for delivered rows | None. This is the record. |
| Web Push | After the row, if VAPID is configured and the user has a subscription | Settings → device notifications. Off until they subscribe. | Logged. Stale subscriptions are reported so the user can re-enable. |
| Foreground OS popup | Tab open, permission granted, new inbox id | Same browser permission | Skipped. Inbox still updates on the next fetch. |
| ClickUp Chat | After the row, if the ClickUp integration is on and the user maps to a ClickUp member | Check-in reminders: explicit ClickUp toggle. Other mirrors follow the integration flag. | Skipped with a reason. Inbox remains. |
| Email | Only types that opt in | Reminder schedules choose email. Platform settings can turn blocker emails off. | `email_status` becomes `skipped`. Inbox remains. |
| Google Calendar | Weekly check-in reminder only | User’s reminder channels include calendar | Books or removes a 15-minute block. Not an inbox row by itself. |

Announcements are a separate product (`announcement` + `announcement_receipt` for delivered / read / dismissed / acknowledged). Publishing one also writes `admin.announcement` inbox rows so the bell shows them. Receipts stay the audit of who was asked to acknowledge.

---

## Where features plug in

Two processes publish. They share the same table and the same side-channel idea.

| Process | Publishes |
|---|---|
| Next.js server (`apps/web`) | Comments, mentions, blockers, sheet mentions, feedback, reminders, announcements, alignment |
| Nest API (`apps/api`) | Quarter activation, cycle lock, reflection open, survey assigned, platform welcome |

A new notice is a small publisher next to the feature, not a new inbox.

Pattern every publisher follows:

1. Build the recipient list in domain terms.
2. Remove the actor and inactive users.
3. `notification.create` (or `createMany`) with `type`, copy, `payload`, `actionUrl`, `dedupeKey`.
4. Call the side-channel helper. Do not await it on the user’s critical path when the product action must succeed either way.
5. For company-wide sends, use the broadcast guard (below).

### Catalog (what is wired today)

**Collaboration**

| Type | Trigger |
|---|---|
| `kr_comment_mention` / `sp_comment_mention` | @mention on a KR or Special Project thread (weekly or planning) |
| `kr_weekly_check_in_comment` / `sp_weekly_check_in_comment` | Comment on a weekly check-in |
| `kr_planning_comment` / `obj_planning_comment` / `scope_planning_comment` | Planning comment to Accountable (and scope discussion) |
| `sheet_comment_mention` | @mention in the company planning sheet |
| `blocker_tagged_mention` | Tagged on a KR or Special Project blocker |
| `blocker_resolved_reporter` | Blocker the reporter raised was resolved |
| `blocker_discussion_message` / `blocker_discussion_added` | Reply, or added to a blocker thread |
| `blocker_meeting_scheduled` / `blocker_meeting_cancelled` | Meeting on a blocker |
| `horizontal_alignment_request` | Alignment request, recipients from the department policy |

**Platform**

| Type | Trigger |
|---|---|
| `okr.cycle_activated` | Quarter set live. Optional “notify everyone” in cycle admin. |
| `okr.cycle_lock_reminder` | Lock scheduled, reminded, or locked |
| `okr.cycle_reflection_open` | Reflection opens, audience chosen in the dialog |
| `okr.checkin_reminder` | Personal schedule or platform reminder schedule |
| `okr.personal_reminder_invite` | Invited onto someone else’s reminder. Inbox can Accept / Decline inline. |
| `admin.announcement` | Admin publishes an announcement |
| `survey.assigned` | Survey assigned |
| `auth.platform_access_granted` | Invite approved / access granted |
| `feedback_received` / `feedback_status_changed` / `feedback_reply` / `feedback_reporter_replied` | Feedback triage loop |

Deep links are part of the type, not an afterthought. A KR mention opens Weekly Tracker or Planning on that comment. A survey opens that survey. A cycle notice opens Weekly Tracker. Paths are built by shared helpers and rejected if they are protocol-relative or carry credentials.

---

## Safety rails

These are the parts worth copying even if the channel list differs.

### Broadcast isolation

Company-wide in-app rows and email go to **all active, invited users only when** the process is production (`NODE_ENV=production`) on the production database.

Everywhere else (local Docker, a laptop, a non-production process) the audience collapses to `PLATFORM_DEVELOPER_EMAILS`.

Extra switches:

| Control | Effect |
|---|---|
| `CYCLE_ACTIVATION_NOTIFY=false` | No activation broadcast at all |
| `BROADCAST_NOTIFY_ALL_USERS=0` | Blocks the full audience even on a production deploy |
| Uncheck “Notify everyone” in Quarters | That activation does not broadcast |
| `skipBroadcastEmail()` | Last line of defense before SMTP for cycle / announcement-class mail |

A full send is two checks: who is queried, and who is allowed to receive mail. Either one failing closed is enough.

### Dedupe

`dedupe_key` is per recipient and per event, for example:

- `cycle-activation:{cycleId}:{userId}`
- `checkin_reminder:{userId}:{cycleId}:{weekNumber}`
- `feedback-received:{feedbackId}:{recipientId}`
- `announcement:{announcementId}:{recipientId}`

A retry or a double click finds the existing row and does not insert another. Reminders can force a resend only from an explicit test action, which deletes that key first.

### Dead targets do not stay in the inbox

Mention and comment rows store `krId` or `objectiveId` in `payload`. The inbox query drops rows whose KR or objective no longer exists. Deleting a KR also deletes its mention rows. People do not click through to a missing page.

### Action URLs are sanitized

In-app paths must start with a single `/`. External links must be `https` with no userinfo. Anything else is dropped before the bell renders it. ClickUp and email receive an absolute URL built from the public app origin plus that safe path.

### Policies sit above the publisher

- Platform settings can disable blocker-resolved email and blocker-tagged email without removing the inbox row.
- Horizontal alignment has a per-department list of who should be notified. The publisher reads that policy. It does not hardcode names.
- Planning-comment notifications can be turned off as a product flag.
- Check-in reminders default **off**. A person opts into email, push, ClickUp, and/or calendar. Platform admins run a separate schedule for people who should be reminded by policy.

### Inbox is per user

List, mark read, and mark all read all filter on the session user. There is no admin “open someone else’s bell” on these routes.

---

## Read path (what the UI actually does)

```
Bell / Home / Device bridge
    → GET /api/notifications          (session, 120 req/min/IP)
        → drop rows whose KR/objective is gone
        → enrich: actor, “Key result · title”, CTA label
        → optional inline action (reminder invite)
    → user opens a row
        → PATCH read
        → router.push(sanitized actionUrl)
```

Enrichment reads `payload.actor` when the publisher stored it, and falls back to parsing a mention title for older rows. CTA labels (“View in Weekly Tracker”, “Open in Planning”) come from the type and the payload, so the row teaches where it goes.

The bell groups items and can filter to unread. Home shows a short preview of the same query.

There is a separate live stream for **blocker discussion unread** (`/api/me/blocker-discussions/stream`). That is thread state inside My Blockers. It is not the notification inbox.

---

## Shared contract vs what ships

`packages/notifications` is the contract every publisher is written toward:

- `NotificationEvent` — type, recipients, payload, actor, dedupe, group, priority, action URL
- `NotificationTypeRegistration` — label, category, default channels, default email mode, templates
- `NotificationChannel` — `send` / `sendBatch` so a new channel is an adapter, not a rewrite
- Registry rejects a duplicate type at startup

Production delivery today is implemented in the app publishers and the side-channel helpers, not by one central `publish()` that fans out by itself. The engine class records the type and strips the actor from recipients. Routing, copy, and channel choice live next to the feature that knows the audience.

That split is intentional for a product this wide: the OKR module must not wait on a generic template to know who “Accountable” is. The cost is discipline. Every new type must still write the row, set a dedupe key, and call the shared side-channel helper instead of inventing a fourth ClickUp client.

Tables that support the contract and are already in the schema:

| Table | Use |
|---|---|
| `notification` | Inbox rows |
| `notification_preference` | Per user, per type (or `default`): in-app, email mode, push. Resolution order when a preference exists: type override → user default → type default. |
| `notification_schedule` | Named cron schedules an admin can enable |
| `user_reminder` | Personal weekly check-in: weekday, local time, channel flags |
| `push_subscription` | Browser push endpoints per user |
| `announcement` / `announcement_receipt` | Admin broadcasts with acknowledgement |

Email modes on the preference model are `immediate`, `daily_digest`, `weekly_digest`, and `off`. Immediate mail is what ships for the types that send email. Digest aggregation is the next step on the same `email_status` column (`digest_queued`), not a second inbox.

---

## Adding a notice on this platform

1. Pick a type id: `module.event_name` (or the existing snake form used by comment types).
2. In the feature’s server module, resolve recipients. Exclude the actor.
3. Insert the row with title, body, payload (ids + actor), relative `actionUrl`, and a dedupe key.
4. Call `notifyUserSideChannels` for push + ClickUp.
5. Send email only if this type should email, and run broadcast mail through the guard if the audience is “the company”.
6. Add the deep link to the navigation samples so a click can be tested without waiting for a real event.
7. If the target can be deleted, store its id in `payload` and teach the inbox filter to drop dead rows.

No new bell, no new table, no new push stack.

---

## Comparison checklist

Score the other platform against these. A system that misses the first six will feel worse in production even if it has more channels.

| # | Question | NEXT OKR |
|---|---|---|
| 1 | Is there one stored inbox item per recipient, independent of email/push? | Yes. `notification` row. |
| 2 | Can a channel fail without losing the notice or rolling back the product write? | Yes. Row first, side channels best-effort. |
| 3 | Does the feature decide recipients, instead of a global fan-out? | Yes. Publishers are per domain. |
| 4 | Is “notify yourself” suppressed? | Yes. Actor excluded. |
| 5 | Can the same event be retried without a second row? | Yes. `dedupe_key`. |
| 6 | Does a click land on the exact object? | Yes. Sanitized `actionUrl`. |
| 7 | Can a dev environment email the whole company? | No. Broadcast guard. |
| 8 | Do deleted objects disappear from the inbox? | Yes. Live-id filter + delete cleanup. |
| 9 | Can a person turn channels off per reminder without losing the product? | Yes. Email / push / ClickUp / calendar flags. |
| 10 | Can an admin change who hears a class of event without a deploy? | Yes for alignment policy, blocker email, cycle “notify” checkbox, reflection audience. |
| 11 | Is work chat (ClickUp) the same copy as the inbox, not a second message written by hand? | Yes. Same title, body, and link. |
| 12 | Is mark-read authorized to the recipient only? | Yes. `recipient_id` = session. |

---

## What not to copy by accident

- Do not build a second inbox per channel. ClickUp and email are delivery. The row is the product.
- Do not put HTML in the inbox body. Links go in `actionUrl`.
- Do not send company-wide mail from a route handler that skips the broadcast guard.
- Do not let the notification package import domain modules. The arrow points the other way.
