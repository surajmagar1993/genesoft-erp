# Genesoft ERP

Genesoft is a modern, enterprise-grade ERP and CRM platform built with Next.js, Supabase, and Prisma. It provides a comprehensive suite for managing business operations in the Indian market, including integrated GST handling.

## 🚀 Features

### 🤝 CRM (Customer Relationship Management)
- **Leads & Deals**: Track sales pipeline from prospect to conversion.
- **Contacts & Companies**: Centralized repository for all business partners.
- **Tasks**: Activity management and follow-ups.

### 💰 Finance & Accounting
- **Accounts Payable**: Manage vendor bills, payments, and aging.
- **Accounts Receivable**: Track customer invoices and incoming payments.
- **GST Engine**: Integrated Indian GST calculations for all financial documents.
- **Chart of Accounts**: Comprehensive financial structure management.

### 🔔 Notifications (New!)
- **Cross-module Triggers**: Real-time notifications when leads are created or bills are generated.
- **Actionable Alerts**: Clickable notifications that lead directly to the relevant record.
- **Unread Tracking**: Per-user unread status and bulk "mark as read" capability.

### 📤 Bulk Data Management (New!)
- **Import/Export**: Bulk CSV import and export for Contacts & Products using `papaparse`.
- **Batch Processing**: High-performance insertion using Supabase-native array batching.
- **Client-Side Parsing**: Efficiently handle thousands of rows directly in the browser.


## 🛠 Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **ORM**: Prisma
- **Styling**: Tailwind CSS & Shadcn UI
- **Types**: TypeScript

## 🏁 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env.local` and provide your Supabase credentials.

3.  **Database Sync**:
    ```bash
    npx prisma generate
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.
