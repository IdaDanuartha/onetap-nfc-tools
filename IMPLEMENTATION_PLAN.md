# MISSION
You are an expert Next.js 14 (App Router), Supabase, and Web API developer. Your task is to build a PWA Admin Dashboard that interacts with physical NFC tags using the experimental Web NFC API (`NDEFReader`).

# DESIGN PHILOSOPHY & SKILLS
You possess a deep understanding of modern UI/UX design principles. Your design execution must be hyper-responsive, clean, and modern, comparable to leading contemporary SaaS platforms.
- **Modern Aesthetic:** Adhere to a minimalist "neo-flat" or "semi-flat" design aesthetic, avoiding heavy gradients and skeumorphism. Use subtle shadows for depth.
- **Typography:** Use a clean, legible sans-serif font (e.g., Inter or Geist). Adhere to a strict typographic scale for visual hierarchy.
- **Whitespace:** Maximize the use of whitespace. All elements must have ample room to breathe. Apply a consistent vertical and horizontal spacing scale (e.g., multiples of 4px).
- **Color Palette:** Use a clean, neutral core palette (greys, whites) with a single, clear primary accent color (e.g., Supabase Green or a deep cobalt blue). Use color semantically (green for success, red for errors, amber for waiting).
- **Fully Responsive (Mobile-First Approach):** Build all layouts and components with a "Mobile-First" mindset.
  - Breakpoints must be clean and consistent.
  - UI must adapt gracefully, for example, the sidebar becomes a full-width bottom navigation or a drawer on smaller screens.
  - Form fields must be wide and touch-friendly on mobile, but align efficiently on desktop.
  - Use Tailwind CSS responsive utility classes (e.g., `flex-col md:flex-row`, `p-4 md:p-8`).
- **UI Elements (Customized `shadcn/ui`):** Utilize `shadcn/ui` components as your base, but ensure they are configured to look cohesive. Apply a consistent corner radius (e.g., `rounded-lg`). All interactive elements (buttons, inputs, links) must have clear states (hover, focus, active).
- **Scanner UI:** The NFC scanning interface is the highest-priority mobile component. It must be designed to be extremely clear and simple, with high-visibility feedback (e.g., a simple spinner with "Ready to Scan" and dynamic status updates like "Tag Scanned Successfully!").

# CONSTRAINTS & REALITY CHECK
- Web NFC ONLY works on Android Chrome. You must implement robust error handling and feature detection (`if ('NDEFReader' in window)`). Do NOT hallucinate iOS support.
- Use Tailwind CSS for styling and `shadcn/ui` for components.
- State management: React Hooks / Zustand.
- Database & Auth: Supabase Client (`@supabase/ssr`).

# PHASE 1: Supabase Database & Auth Setup
1. Define the schema in `supabase/migrations`. Create a `nfc_tags` table:
   - `id` (UUID, PK)
   - `serial_number` (String, Unique) - The physical NFC tag serial.
   - `payload_data` (JSONB) - Data written to the tag.
   - `status` (Enum: 'active', 'inactive', 'compromised')
   - `last_scanned_at` (Timestamp)
   - `assigned_to` (UUID, FK to users)
2. Setup Row Level Security (RLS) ensuring only authenticated admins can read/write to this table.
3. Implement Supabase Auth (Email/Password) on the Next.js frontend.

# PHASE 2: Core Web NFC Module (The Hardware Bridge)
Create a dedicated utility service `lib/nfc-service.ts`.
1. **Feature Detection:** Function to check if `NDEFReader` is supported and prompt the user if they are on an unsupported device/browser.
2. **Detect/Read (`readTag`):**
   - Instantiate `const ndef = new NDEFReader()`.
   - Request `ndef.scan()`.
   - Handle `reading` event to extract `serialNumber` and decode `message` records (TextDecoder).
3. **Write (`writeTag`):**
   - Accept a JSON object or string.
   - Use `ndef.write({ records: [{ recordType: "text", data: payload }] })`.
4. **Delete/Clear (`clearTag`):**
   - Write an empty NDEF record (`ndef.write({ records: [{ recordType: "empty" }] })`) to clear the tag.

# PHASE 3: Dashboard UI & Integration
1. **NFC Scanner Component:** A modal or dedicated page that invokes `nfc-service.ts`.
   - Implement the high-visibility, simple scanning UI with clear status updates.
2. **Tag Registration Flow:**
   - Admin taps an unregistered NFC tag.
   - App reads `serialNumber`.
   - Admin inputs contextual data in a form (e.g., assigning the tag to a room/item).
   - App calls Supabase RPC or direct insert to save the `serialNumber` + context into the `nfc_tags` table.
   - App simultaneously writes a secure/encrypted identifier (Payload) back into the physical NFC tag.
3. **Advanced Analytics View:**
   - Table view fetching from Supabase: show all registered tags, last scanned times, and active status.
   - Real-time updates using Supabase Subscriptions (`channel.on('postgres_changes')`) so the dashboard updates live when a tag is scanned in the field.

# PHASE 4: PWA Implementation
1. Configure `next-pwa` in `next.config.mjs`.
2. Generate `manifest.json` and standard icons.
3. Configure the service worker to cache the UI shell, but explicitly BYPASS cache for Supabase API calls to ensure real-time tag data accuracy.