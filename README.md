# Apartment Manager Pro

A full-stack apartment management app built with React, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Features

- **Owner Dashboard** — configure your apartment, manage floors & units, track tenants and rent payments
- **Tenant Portal** — tenants can log in and submit payments (M-Pesa or manual)
- Carry-forward payment logic (overpayments roll into the next month)
- Real-time payment sync between the owner dashboard and tenant portal
- Auth via Supabase (email/password + Google OAuth)

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com) and run the migrations in `supabase/migrations/` against your database.

### 3. Configure environment variables

Copy `.env` and fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally

```bash
npm run dev
```

## Tech Stack

- [React 18](https://react.dev) + [TypeScript](https://typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) (Postgres + Auth + RLS)
- [React Router](https://reactrouter.com)
- [TanStack Query](https://tanstack.com/query)
