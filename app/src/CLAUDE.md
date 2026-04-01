> **Last Updated:** 2026-04-01 | **Active Block:** Notifications & Cross-Module Triggers Completed

## 📦 Scope
Application source code including components, hooks, actions, and utilities.

## 🏗 Structure
- `actions/`: Server actions for CRUD (Supabase enabled).
  - `notifications.ts`: Global notification system (scoping, read/unread).
  - `sales/quotes.ts`: CRUD for Quotations (Tenant-scoped).
- `components/`: UI components using shadcn/ui.
  - `notifications-dropdown.tsx`: Interactive notification UI.
- `hooks/`: React hooks for shared logic.
- `utils/`: Utility functions (Supabase clients, etc.).
- `lib/gst-engine.ts`: Indian GST engine (shared).

## 🔥 Next Active Block
Real-time UI updates & WebSocket-based live notifications.

---

[Previous context archived]
