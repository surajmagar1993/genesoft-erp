# Architectural Decisions Log

## [2026-03-20] Supabase Integration
- **Context**: Transitioning from static/mock data to real Supabase auth and storage.
- **Decision**: Use `@supabase/ssr` for Next.js App Router integration.
- **Rationale**: Preferred way to handle cookies and server-side sessions in Next.js 15.
- **Status**: Implementation in progress.

---
