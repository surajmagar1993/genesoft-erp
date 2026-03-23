# app/src Context

## 📦 Scope
Application source code including components, hooks, actions, and utilities.

## 🏗 Structure
- `actions/`: Server actions for CRUD (Supabase enabled).
- `components/`: UI components using shadcn/ui.
- `hooks/`: React hooks for shared logic.
- `utils/`: Utility functions (Supabase clients, etc.).

## 🔐 Authentication
- Use `utils/supabase/server.ts` for server-side auth checks in actions and layouts.
- Use `utils/supabase/client.ts` for browser-side interactions.

---
