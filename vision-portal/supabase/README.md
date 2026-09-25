# Supabase Database Setup

## Migration File

The initial schema is defined in `migrations/20260925_initial_schema.sql`.

## Tables Created

1. **students** - User profiles with college, course, and semester info
2. **subjects** - Global/local subject catalog
3. **community_timetables** - Shared schedule headers (publicly readable)
4. **community_slots** - Slots in community templates (publicly readable)
5. **student_slots** - Personal weekly schedule (private per student)
6. **schedule_exceptions** - Date-specific overrides (private per student)
7. **attendance** - Daily attendance logs (private per student)
8. **assignments** - Assignment tracker (private per student)

## Row Level Security (RLS) Policies

✅ **Community tables** (`community_timetables`, `community_slots`):
- Publicly readable by all authenticated users
- Only editable/deletable by their creator

✅ **Private student tables** (`student_slots`, `schedule_exceptions`, `attendance`, `assignments`):
- Only accessible by the student who owns them
- Complete isolation per student

✅ **Students table**:
- Users can only view and edit their own profile

✅ **Subjects table**:
- Publicly readable
- Any authenticated user can insert new subjects

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `migrations/20260925_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl+Enter`
7. Wait for "Success. No rows returned" message

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (you'll need your project ref from dashboard)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

## How to Verify Tables in Supabase

### Method 1: Table Editor (Visual)

1. Go to your Supabase dashboard
2. Click **Table Editor** in the left sidebar
3. You should see all 8 tables listed:
   - students
   - subjects
   - community_timetables
   - community_slots
   - student_slots
   - schedule_exceptions
   - attendance
   - assignments
4. Click on each table to see its columns and structure

### Method 2: SQL Editor (Query)

1. Go to **SQL Editor** in your Supabase dashboard
2. Run this query to list all tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

3. To check RLS policies are enabled:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

4. To view all RLS policies:

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

5. To see table structures with foreign keys:

```sql
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### Method 3: Quick Verification Checklist

Run these queries one by one to verify everything:

```sql
-- 1. Check all tables exist (should return 8 rows)
SELECT COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'students', 'subjects', 'community_timetables', 'community_slots',
    'student_slots', 'schedule_exceptions', 'attendance', 'assignments'
  );

-- 2. Check RLS is enabled on all tables (should return 8 rows with rowsecurity = true)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'students', 'subjects', 'community_timetables', 'community_slots',
    'student_slots', 'schedule_exceptions', 'attendance', 'assignments'
  );

-- 3. Check total number of RLS policies (should return > 30 policies)
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public';

-- 4. Check indexes are created (should return > 15 indexes)
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';
```

## Expected Results

✅ **8 tables** created  
✅ **RLS enabled** on all tables  
✅ **30+ policies** protecting data access  
✅ **15+ indexes** for query performance  
✅ **5 triggers** for automatic timestamp updates  
✅ **Foreign key relationships** properly established

## Next Steps

After verifying the database:

1. Test authentication in the app
2. Create a test student profile
3. Verify RLS policies prevent unauthorized access
4. Move to Build Order step 2: Timetable Builder & Community Hub
