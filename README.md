# OneTap NFC Tools

A Progressive Web App (PWA) Admin Dashboard for managing physical NFC tags. Built using Next.js 16, Supabase, and the experimental Web NFC (`NDEFReader`) API. 

This project allows multiple admins to scan, write, read, and manage the lifecycle of physical NFC tags from any supported mobile device.

## Features

- **Web NFC Integration:** Natively interact with physical NFC tags directly from the browser (Android Chrome). Read serial numbers and write JSON payloads directly to NDEF tags.
- **PWA Dashboard:** Installable as a native app via Chrome on Android, providing a full-screen, app-like experience for field workers.
- **Multi-Admin Tracking:** Actions such as registering a tag, rewriting its contents, or revoking access are logged in a real-time activity feed, attributed directly to the authenticated admin.
- **Real-Time Synchronisation:** Leverages Supabase Channels to keep your Dashboard and Activity Feeds updated instantly when another admin changes a tag status in the field.
- **Modern UI:** Built with Tailwind CSS v4 and `shadcn/ui`, featuring engaging pulsing animations for NFC hardware interactions and a refined, semi-flat design aesthetic.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- **Database & Auth:** [Supabase](https://supabase.com/) (`@supabase/ssr`)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Components:** [shadcn/ui](https://ui.shadcn.com/) & [Lucide Icons](https://lucide.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **PWA Configuration:** `next-pwa`

---

## Getting Started

### Prerequisites
1. **Node.js** (v20+ recommended)
2. **pnpm** (Package manager)
3. **Supabase Project:** Create a free project at [supabase.com](https://supabase.com).

### 1. Database Setup
Once your Supabase project is created, run the SQL script located in `supabase/migrations/001_nfc_tags.sql` in your Supabase SQL Editor. This will:
- Enable UUID extensions.
- Create the `nfc_tags` and `activity_logs` tables.
- Provision Row Level Security (RLS) policies.

### 2. Environment Variables
Copy the provided `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase Project Settings > API.

### 3. Install & Run
Install the dependencies:
```bash
pnpm install
```

Run the development server:
```bash
pnpm dev
```
Navigate to `http://localhost:3000`. You will be redirected to `/login`.

### 4. Setting up an Admin Account
To log in, you must first create a user in your Supabase dashboard via **Authentication > Users > Add user**.

---

## Web NFC Requirements

**Important:** The Web NFC API is strictly constrained due to security reasons. 
To successfully use the `/scanner` routes to read and write physical tags, you **must**:
- Use an **Android Phone** with NFC hardware.
- Use **Google Chrome** (v89+).
- Serve the website over a **Secure Context (HTTPS)** or `localhost`. 

*(Desktop browsers and iOS Safari/Chrome currently do not support the Web NFC `NDEFReader` API).*
