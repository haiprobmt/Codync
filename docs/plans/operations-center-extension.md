# Operations Center — Codync-native extension plan

Status: proposed implementation plan  
Target repository: `haiprobmt/Codync`  
Target branch: `main` (changes developed on a feature branch)  
Strategy: extend Codync in place; do not create a separate application or replace the host.

## 1. Product decision

Build the Operations Center as a set of capabilities inside Codync. Codync remains the orchestrator and the source of truth for bots, conversations, task execution, approvals, routines, artifacts, and machine connectivity.

This is not a second agent runtime. It is an operational layer over the existing host-owned state and APIs.

### Non-goals

- No standalone Next.js/FastAPI application.
- No second PostgreSQL/Redis/Kafka stack.
- No replacement for Codync's Rust host, SQLite store, ACP runtime, routines, work queue, memory, or relay.
- No automatic sending of email, Teams, or Zalo messages.
- No automatic Fabric writes or deployment.
- No new orchestration engine in the first release.

## 2. Existing capabilities to reuse

The current repository already provides important building blocks:

| Existing capability | Existing implementation | Operations Center use |
|---|---|---|
| Bot roster and configuration | Host bot store/API; desktop and mobile bot stores | Agent inventory and bot profiles |
| Conversations and transcripts | Host SQLite `entries`; `history`, `threadEntries`, conversation APIs | Conversation explorer |
| Global revisions and event stream | Host store revision + `GET /events` SSE/channel catch-up | Live dashboard updates |
| Background tasks and threads | `host/src/chat/work/` | Execution center and task tracking |
| Approvals and decision cards | Existing notice/permission entries and decision flow | Attention and approval inbox |
| Routines and follow-ups | Host routines subsystem | Scheduled collection and brief workflows |
| Artifacts and files | Host chat artifacts/files | Deliverables and evidence |
| Bot collaboration | Team MCP and `message_bot` | Existing bot-to-bot coordination |
| Memory | Host SQLite memory tables / codync-mem | Long-lived confirmed context |
| Computer and remote connectivity | Host, cloud relay, desktop SSH | Machine health and remote bot visibility |

Important architectural rule from `docs/architecture/overview.md`: the Rust host owns product logic and persistence. Clients are views over host state. Any new behavior must be implemented in the host and exposed through additive host methods/events, then rendered consistently by desktop, iOS, Android, and TUI where applicable.

## 3. User's initial operational workspace

Seed the first workspace with the user's current operating context, but keep it editable and avoid hard-coding customer-specific names in product logic.

### Projects

- AFS (Gradion)
- PVCFC SF2 (Olytix)

### Current bot roles

- Teams collector — AFS
- Outlook collector — AFS and PVCFC SF2
- Zalo collector — PVCFC SF2 (seven groups)
- Gmail / Google Calendar collector
- Project aggregator — scheduled summaries
- Project assistant — daily brief and weekly report
- Execution bot — code, DAX, Fabric scripts, and documentation; works on branches/backups
- Job Search bot — career opportunity discovery and scoring
- Codync lead/orchestrator — receives requests, delegates, monitors, and manages bot machines

These are user-configured bot roles, not built-in product identities. The application must support arbitrary names, roles, sources, and projects.

## 4. Product modules and delivery order

### M0 — Operations overview (first usable increment)

Use existing host state; do not add a new persistence model unless the implementation proves it is required.

- Agent roster with online/busy/degraded/offline state.
- Distinguish host connectivity, agent process state, and task/business state.
- Running, waiting, needs-you, done, failed, and stopped task counts from existing work queues.
- Recent conversations and latest activity.
- Pending approval/decision cards.
- Routine schedule and latest run outcomes.
- Recent artifacts and execution failures.
- Filter by bot and existing bot section.
- Clear last-updated and stale-data indicators.

Acceptance:
- Overview reflects host events without polling every screen.
- Counts reconcile with the existing bot/task/conversation views.
- No new source of truth is created for existing states.

### M1 — Project spaces

Add a first-class project concept only after mapping it against current bot sections and workspaces.

A project should have:
- Stable ID, name, description, status, color/icon.
- Linked bots (many-to-many).
- Optional linked folders/repositories.
- Project-specific pinned context and confirmed facts.
- Project activity view composed from linked bot entries, tasks, routines, and artifacts.

A bot may participate in multiple projects. A section remains a presentation/grouping feature and must not be silently redefined as a project.

### M2 — Conversation explorer

Build on existing transcripts and history APIs.

- Search/filter by bot, project, date, sender, and content.
- Show original message, author, timestamp, attachments, and thread/task context.
- Navigate from an entry to its bot, task, artifact, or project.
- Preserve the distinction between user-visible chat messages and internal trace/tool entries.
- Show source coverage and last synchronization time where external collectors provide it.
- Never claim complete history if a collector only exported a partial window.

### M3 — Project intelligence

Add structured, evidence-backed records for:
- Work items / action items
- Issues and risks
- Decisions and commitments
- Meetings and outcomes
- People and ownership
- Dependencies / waiting-for relationships

Every AI-proposed record must include:
- Status: proposed, confirmed, rejected, superseded.
- Evidence references to one or more existing conversation entries or artifacts.
- Extractor/model metadata and confidence.
- Created/updated timestamps and actor.
- Human verification history.

Do not promote an inferred statement to a confirmed decision or commitment without user confirmation. Conflicting evidence must remain visible.

### M4 — Execution center

Extend the existing work/thread/task and artifact experiences:
- Queue and execution status.
- Start/end time and duration.
- Result, failure, retry, stop, and waiting reason.
- Thread transcript and relevant trace.
- Git repository, branch, commit, and diff links when the bot reports them.
- Generated DAX, SQL, Python, scripts, and documentation artifacts.
- Human review state.

Keep Fabric write/deploy actions out of scope. The execution bot may prepare scripts and artifacts; the user remains responsible for running privileged Fabric operations.

### M5 — Attention and approvals

Unify existing approvals, decisions, failures, stale collectors, blocked tasks, and upcoming deadlines into one attention view.

- Group duplicate alerts.
- Provide source/evidence and a safe next action.
- Separate information, warning, critical, and approval-required states.
- Any external side effect remains behind the existing permission model and explicit user approval.

### M6 — Cross-source intelligence and search

Only after the above data model is stable:
- Link related evidence across Teams, Outlook, Zalo, Gmail, and calendar exports.
- Add semantic retrieval if full-text search is insufficient.
- Support questions such as “What is still waiting on the business for AFS?”
- Return evidence links and clearly label inference vs confirmed fact.

### Later — SaaS readiness

Keep future multi-user/workspace boundaries in mind, but do not add billing, organization administration, hosted multi-tenancy, or a new cloud data plane to the personal MVP.

## 5. Architecture constraints

### Source of truth

- Host SQLite remains authoritative for local bot, chat, task, routine, approval, and artifact state.
- Existing host global `rev` and event stream remain the synchronization mechanism.
- Do not mirror all existing host state into a second database.
- Add tables/migrations only for genuinely new first-class entities (for example projects and verified intelligence records).
- Cloud D1 remains responsible for account/computer ownership and relay metadata; do not put conversation content there.

### Host API and event model

- Add additive host API methods and event types.
- Preserve catch-up-then-live semantics and revision ordering.
- Make writes idempotent where clients may retry.
- Keep authorization checks in the host; clients must not enforce permissions alone.
- Avoid putting message bodies, secrets, or private content into analytics events.

### External collector integration

The external Teams/Outlook/Zalo/Gmail collectors are not assumed to be native Codync connectors. First inspect how the user's current collector bots expose data.

Preferred integration order:
1. Reuse an existing supported host/agent connector if it already emits the required structured data.
2. Otherwise define a small, versioned import contract for collector output.
3. Accept append-only JSONL/batch import as the initial adapter if no event API exists.
4. Add webhook/streaming delivery only after reliability, authentication, retries, and idempotency are proven.

An imported source record must retain provider, external ID (when available), source conversation ID, sender, occurred-at time, ingestion time, and sync coverage/cursor. Never treat a collector's summary as a raw source message.

### Cross-client behavior

Codync's repository guidelines require host-owned logic and consistent behavior across desktop, iOS, Android, and TUI. Any shared product feature must be implemented and validated across affected clients in the same change. If a surface cannot reasonably display a dense dashboard, provide an appropriate compact view with the same underlying actions and information.

## 6. Proposed domain model

Do not add all tables in one migration. Introduce only the model required by each milestone.

### Projects

- `projects(id, name, description, status, color, icon, created_at, updated_at)`
- `project_bots(project_id, bot_id, role, created_at)`
- Optional repository/folder associations should use a separate relation table.

### Evidence-backed intelligence

- `intelligence_records(id, project_id, record_type, title, body, status, confidence, extractor, created_at, updated_at)`
- `intelligence_evidence(record_id, entry_id, artifact_id, evidence_role)`
- `intelligence_history(id, record_id, actor_type, actor_id, action, before_json, after_json, created_at)`
- `project_people(id, project_id, display_name, external_identity_json)`
- `work_item_links(source_item_id, target_item_id, relationship_type)`

Use existing task/work records where possible. Do not create a parallel task system if existing work queue semantics can represent the same concept. If a durable project action item needs lifecycle semantics different from an agent execution task, document that distinction before adding it.

### Source coverage

For imported external data only:
- `source_connections` (provider, account/label, status, configuration reference; never store raw credentials)
- `source_sync_runs` (started/ended, status, cursor, counts, error category)
- `source_records` or a clearly documented mapping to existing entries (external IDs, source metadata, coverage window)

Avoid copying raw content unnecessarily if it can be represented safely in the existing transcript model.

## 7. UI/UX direction

- Reuse Codync's existing design tokens, components, navigation, and platform conventions.
- Do not introduce a second brand or an unrelated dashboard shell.
- Desktop is the primary dense Operations surface.
- Mobile focuses on attention, project brief, approvals, and quick task status.
- TUI exposes compact status and keyboard-accessible task/approval operations.
- Keep the existing chat as the primary way to ask Codync to act.

Proposed desktop navigation additions (subject to current navigation review):
- Overview
- Projects
- Activity / Conversations
- Work (existing task/thread model, enhanced)
- Approvals (existing cards, unified inbox)
- Agents (existing roster/details, enhanced)

Do not add a new top-level page if an existing screen can be extended coherently.

## 8. Implementation milestones and acceptance

### Milestone 0 — Repository and UX audit

- Map existing desktop, iOS, Android, and TUI navigation.
- Identify existing task, approval, activity, conversation, artifact, and routine surfaces.
- Identify existing search/history behavior and limits.
- Produce a screen-by-screen gap analysis.
- Confirm how current external collector bots export structured data.
- No product behavior changes in this milestone.

### Milestone 1 — Overview from existing state

- Compose current host state into a read-only Operations overview.
- Reuse current APIs/events and existing state models.
- Add tests for aggregation and stale/unknown states.
- Update all affected clients in the same change.
- Add feature analytics (feature use/outcome/failure category only; never content).

### Milestone 2 — Project entity and bot associations

- Add SQLite migration and store methods.
- Add host API methods/events with authorization and validation.
- Add project management UI across affected clients.
- Add tests for migrations, association changes, deletion, and sync.
- Do not overload bot sections as project IDs.

### Milestone 3 — Evidence-backed project records

- Add proposed/confirmed/rejected lifecycle.
- Link records to existing entry IDs and artifacts.
- Add human verification and audit history.
- Test conflicting evidence and source deletion/retention behavior.

### Milestone 4 — Collector adapter

- Confirm the actual collector output format first.
- Implement versioned, authenticated, idempotent import.
- Add sync coverage, cursor, retry, and failure reporting.
- Test duplicate batches, out-of-order records, partial sync, and replay.

### Milestone 5 — Search and cross-source linking

- Start with existing indexed/search capabilities.
- Add semantic search only when retrieval evaluation demonstrates a need.
- Every answer must provide clickable source evidence and distinguish confirmed facts from AI inference.

## 9. Definition of done

- Host owns all new product logic and durable state.
- No second application or duplicate agent runtime is introduced.
- Existing bot/chat/task/routine/approval behavior remains unchanged.
- All new APIs are additive and authorized in the host.
- Migrations are reversible or have a documented safe recovery strategy.
- Duplicate events/import batches do not duplicate records.
- Desktop, iOS, Android, and TUI are updated or explicitly documented as unaffected.
- Unit/integration tests cover observable behavior.
- Relevant end-to-end flows are run on affected clients; unavailable checks are reported.
- Feature analytics contain no message content, email bodies, names, or secrets.
- No credentials or private source data are committed.

## 10. Immediate next engineering task

Before implementation, complete Milestone 0. In particular, inspect:
1. Desktop navigation and existing overview/activity surfaces.
2. iOS and Android bot list, chat, details, task, and approval surfaces.
3. TUI capabilities.
4. Host APIs and SQLite models already covering work, approvals, routines, artifacts, and conversation search.
5. Actual export/storage mechanism used by the user's Teams, Outlook, Zalo, and Gmail collector bots.

Then propose the smallest cross-client change that creates measurable value. Prefer reusing current host state over adding schema.
