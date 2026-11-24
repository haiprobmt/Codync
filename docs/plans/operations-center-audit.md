# Operations Center — repository audit findings

Date: 2026-11-24  
Repository: `haiprobmt/Codync`  
Status: initial audit complete for the desktop read-only overview; external collector integration remains unverified.

## Executive decision

The first increment should be a desktop-only read-only Operations Overview. It can be implemented entirely from the existing desktop BotStore mirrors and host event stream. No host API, schema migration, cloud service, new database, or new orchestration engine is required.

The overview is a new desktop lens over existing Codync state, not a second source of truth.

## Verified existing building blocks

| Concern | Verified location | Finding |
|---|---|---|
| Product ownership | `AGENTS.md`, `docs/architecture/overview.md` | Rust host owns product logic and persistence; clients render host state. |
| Desktop entry point | `apps/desktop/src/renderer/views/ChatWindow.tsx` | Chat window already owns the roster sidebar and sheet-based workflows. |
| Desktop model | `apps/desktop/src/renderer/store/app-model.ts` | `AppModel` aggregates computers, BotStores, roster, selection and approvals. |
| Host mirror | `apps/desktop/src/renderer/store/bot-mirror.ts` | BotStore mirrors bots, entries, connection, computer health and permissions. |
| Live synchronization | `apps/desktop/src/renderer/store/bot-sync.ts` | Catch-up and event stream update the mirror; React views subscribe to Observable stores. |
| Work lifecycle | `apps/desktop/src/shared/work.ts` | Shared work model already defines waiting, working, needsYou, done, failed and stopped. |
| Work execution | `host/src/chat/work/` | Tasks, threads, reports, failures, worktrees and task status are already managed by the host. |
| Work UI | `apps/desktop/src/renderer/views/AllWorkView.tsx`, `views/chat/WorkRows.tsx` | Existing task rows/actions can be reused rather than reimplemented. |
| Approvals | `AppModel.approvals`, existing decision/permission cards | Access approvals and task-level permission cards already exist, but should not be conflated into one new approval mechanism. |
| Styling | `docs/guides/desktop-styles.md`, `views/chat-window.css` | Use existing tokens and shared controls; no second design system. |
| Mobile clients | `apps/ios/Kit/Sources/CodyncUI`, `apps/android/` | Native clients have their own BotStore/chat/task surfaces. This first increment is a desktop overview only; no shared host capability changes. |
| TUI | `host/src/tui/` | Existing terminal UI is a separate compact client. No TUI-specific dashboard is needed for this first desktop-only increment. |

## Important model distinctions

1. A bot chat is a durable transcript; an ACP session can be replaced or resumed underneath it. Do not call each session a separate conversation.
2. Background work is represented by a task in a bot's work box and a thread bot. The thread transcript is fetched separately. The user sees task work through existing `bot.work` and `LiveWork` UI.
3. Bot runtime state, task state, and computer connection state are different dimensions. The dashboard must show them separately and must not infer a bot heartbeat from a connected computer.
4. `needsYou` means a task is waiting for user action; a failed task is a terminal work result. They should not be presented as the same state.
5. Bot sections are a roster grouping mechanism, not a business project model. Do not map AFS or PVCFC onto section IDs.

## First increment delivered on the feature branch

- Added an Operations entry point to the expanded and compact desktop sidebar.
- Added a read-only Operations Overview sheet.
- Displays connected computer count, visible bot count, working task count, waiting task count, bots needing attention and failed task count.
- Lists bots ordered by attention and active work, reusing existing `LiveWork` rows.
- Links back into existing bot details, task cards and thread views.
- Displays computer connection status and bot count.
- Uses existing host-backed mirrors and subscriptions; no additional polling or persistence.
- Adds styles to the existing desktop chat stylesheet and uses the existing component system.

### Deliberate limitations

- It is a desktop-only overview, not yet a full product navigation area.
- It does not yet show projects, meetings, source conversations across external apps, collector freshness, daily brief history, or job-search results.
- It does not claim that external collectors are healthy merely because their Codync bot is connected.
- It does not show a collector's last successful sync because the current repository's generic bot mirror does not expose that semantic.
- It does not merge Codync access approvals with agent task permission cards into one action surface.
- It does not persist dashboard-specific state.

## External collector integration — unresolved dependency

The user's Teams, Outlook, Zalo and Gmail collectors are described as separate read-only bots. Their export format and current storage are not represented by the Codync repository files inspected for this increment.

Before building cross-source conversation search or source coverage, inspect the running collectors and determine:
- Whether they store original messages or only summaries.
- Whether stable provider message and conversation IDs are preserved.
- Whether pagination cursors and sync windows are available.
- Whether attachments are retained or only referenced.
- How project labels are assigned and corrected.
- Whether a structured JSON/JSONL output or supported API can be exposed safely.

Do not design an ingestion adapter against guessed payloads. Keep the existing collector bots unchanged until this contract is confirmed.

## Validation status

- Repository architecture and ownership rules inspected.
- Existing desktop entry point, store model, live mirror, work model, and reusable work UI inspected.
- Source changes committed to `feat/operations-center-extension`.
- Build, TypeScript typecheck, unit tests, Playwright, and visual end-to-end checks have not been run in this environment. These are required before merging.
- The current GitHub PR remains draft; do not merge until checks pass and the feature is reviewed on the actual desktop app.

## Next implementation steps

1. Run desktop `npm run typecheck` and `npm test`; fix any issues.
2. Run the desktop app in the repository's documented sandbox and inspect expanded/compact sidebar behavior, empty state, multiple computers, failed tasks, needs-you tasks, and task/thread navigation.
3. Adjust visual density and responsive layout based on a real desktop run.
4. Confirm the collector output contract with the user before adding external-source ingestion.
5. Only then proceed to project spaces and evidence-backed intelligence.
