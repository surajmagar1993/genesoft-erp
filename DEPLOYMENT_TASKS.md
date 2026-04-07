# 🚀 Deployment Compliance Checklist

This task list adapts the Genesoft ERP project for standard Node.js hosting platforms.

> [!NOTE]
> **Status**: Planned (to be executed later)
> **Reference**: [Implementation Plan](file:///Users/user/.gemini/antigravity/brain/7e355fcb-accc-475d-8558-36eba3016bc8/implementation_plan.md)

## 📋 Required Actions

### 1. Root Configuration
- [ ] **Create `package.json`** at the project root with:
    - `"name": "genesoft-erp"`
    - `"version": "1.0.0"`
    - `"workspaces": ["app"]`
    - `"scripts": { "build": "npm run build --workspace=app", "start": "npm run start --workspace=app" }`

### 2. File Safety & Compliance
- [ ] **Create `.gitignore`** at the project root to exclude:
    - `node_modules/`
    - `.next/`
    - `.env.*` (sensitive files)
- [ ] **Create `DEPLOYMENT_AUDIT.md`** to serve as the final compliance report.

### 3. Verification Steps
- [ ] Run `npm install` at the root.
- [ ] Run `npm run build` at the root to verify delegation to `/app`.
- [ ] Run `PORT=3001 npm start` and check port binding.

---
*Created on: 2026-04-07*
