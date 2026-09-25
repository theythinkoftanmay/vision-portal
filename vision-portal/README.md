# Vision Portal

A crowdsourced community-timetable app for students.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Routing:** React Router
- **Data Fetching:** TanStack Query

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - Copy `.env.example` to `.env`
   - Add your Supabase project URL and anon key:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Verify connection:**
   - Open the app in your browser
   - Check that all status indicators show "Connected"

## Project Structure

```
src/
├── lib/
│   └── supabase.ts       # Supabase client configuration
├── App.tsx               # Main app component with routing
├── main.tsx              # Entry point with providers
└── index.css             # Tailwind imports
```

## Next Steps

- Set up Supabase database schema (see mvp.md for table structure)
- Build authentication flow
- Implement feature screens per the spec
