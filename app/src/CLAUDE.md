# app/src Context

> **Last Updated:** 2026-03-23 | **Active Block:** Invoice PDF Generation

## 📦 Scope
Application source code including components, hooks, actions, and utilities.

## 🏗 Structure
- `actions/`: Server actions for CRUD (Supabase enabled).
- `components/`: UI components using shadcn/ui.
- `hooks/`: React hooks for shared logic.
- `utils/`: Utility functions (Supabase clients, etc.).
- `lib/gst/`: Indian GST engine — `engine.ts` (CGST/SGST/IGST), `validator.ts` (GSTIN), `pos.ts` (place of supply), `hsn.ts` (HSN/SAC lookup).

## 🔐 Authentication
- Use `utils/supabase/server.ts` for server-side auth checks in actions and layouts.
- Use `utils/supabase/client.ts` for browser-side interactions.

## 🔥 Next Active Block
Tax Invoice PDF — `@react-pdf/renderer`, Supabase Storage upload, Resend email with PDF attachment.

---
