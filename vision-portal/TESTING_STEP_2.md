# Build Order Step 2: Timetable Builder & Community Hub - Testing Guide

## What Was Implemented

✅ **Community Hub Search** - Search timetables by college name, course, and semester
✅ **Publish Schedule Flow** - Create and publish new community timetables with slots
✅ **Deep-Copy Clone Logic** - Clone community timetables to personal student_slots with no live link
✅ **Clone Counter** - Automatically increments clones_count when a timetable is cloned

## Files Created

- `src/types/database.ts` - TypeScript types for all database tables
- `src/lib/api/community.ts` - API functions for community hub operations
- `src/components/CommunityHub.tsx` - Search and clone interface
- `src/components/PublishSchedule.tsx` - Create and publish timetables
- `src/App.tsx` - Updated with navigation and routes

## Prerequisites

Before testing, ensure:

1. ✅ Database schema is applied (Build Order Step 1)
2. ✅ Supabase project is configured with correct environment variables
3. ✅ You have at least one test user account created in Supabase Auth

## How to Test

### Setup: Create a Student Profile

Since the app requires a student profile linked to the authenticated user, you'll need to create one manually first:

1. **Create a test user** in Supabase Dashboard → Authentication → Users → Add User
   - Email: `test@example.com`
   - Password: `testpassword123`

2. **Insert a student record** linked to this user:

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Get the user ID first
SELECT id FROM auth.users WHERE email = 'test@example.com';

-- Insert student profile (replace USER_ID_HERE with the actual UUID)
INSERT INTO students (user_id, name, college_name, course, semester, batch)
VALUES (
  'USER_ID_HERE',
  'Test Student',
  'College of Vocational Studies',
  'B.Sc Computer Science',
  1,
  'Batch A'
);
```

### Test 1: Publish a Community Timetable

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open the app** at http://localhost:5174

3. **Login** with your test user credentials (you'll need to implement auth UI or login via Supabase directly)

4. **Navigate to "Publish Schedule"** from the top navigation

5. **Fill in the form**:
   - College Name: `College of Vocational Studies` (should auto-fill from your student profile)
   - Course: `B.Sc Computer Science` (should auto-fill)
   - Semester: `1` (should auto-fill)
   - Section/Batch: `Section A` (optional)

6. **Add some class slots**:
   - Subject Name: `Data Structures`
   - Type: `Core`
   - Day: `Monday`
   - Start Time: `09:00`
   - End Time: `10:00`
   - Click **+ Add Slot**

7. **Add more slots** (e.g., Operating Systems on Tuesday, DBMS on Wednesday, etc.)

8. **Click "Publish to Community Hub"**

9. **Expected Result**: 
   - Success alert: "Timetable published successfully!"
   - Form resets
   - Slots cleared

10. **Verify in Database**:

```sql
-- Check the timetable was created
SELECT * FROM community_timetables 
WHERE course = 'B.Sc Computer Science';

-- Check the slots were created
SELECT ct.course, cs.* 
FROM community_slots cs
JOIN community_timetables ct ON cs.timetable_id = ct.id
WHERE ct.course = 'B.Sc Computer Science';
```

### Test 2: Search Community Timetables

1. **Navigate to "Community Hub"** from the top navigation

2. **Enter search criteria**:
   - College Name: `College of Vocational Studies`
   - Course: `Computer Science`
   - Semester: `1`

3. **Click "Search Timetables"**

4. **Expected Result**:
   - Shows "1 Result" (or however many you created)
   - Card displays:
     - Course and semester
     - College name
     - Creator name: "Test Student"
     - Cloned by: "0 students" (initially)
     - Upvotes: "0 upvotes"

5. **Click "▶ View Schedule"** to expand

6. **Expected Result**:
   - Shows all slots grouped by weekday
   - Each slot shows time, subject name, and type
   - Schedule matches what you published

### Test 3: Clone a Community Timetable (Deep Copy)

For this test, you'll need a **second student** to properly test the clone functionality:

1. **Create a second test user** in Supabase:
   ```sql
   -- Assuming you created another user test2@example.com in Auth
   SELECT id FROM auth.users WHERE email = 'test2@example.com';
   
   -- Insert second student profile
   INSERT INTO students (user_id, name, college_name, course, semester, batch)
   VALUES (
     'SECOND_USER_ID_HERE',
     'Test Student 2',
     'College of Vocational Studies',
     'B.Sc Computer Science',
     1,
     'Batch B'
   );
   ```

2. **Login as the second user** (or open in incognito mode)

3. **Navigate to Community Hub** and search for the timetable

4. **Click the "Clone" button** on the timetable card

5. **Confirm** the clone action in the dialog

6. **Expected Result**:
   - Success alert: "Successfully cloned! X classes added to your schedule."
   - The clones_count should increment from 0 to 1

7. **Verify the Deep Copy in Database**:

```sql
-- Check that student_slots were created for student 2
SELECT 
  ss.id,
  st.name as student_name,
  s.name as subject_name,
  ss.weekday,
  ss.start_time,
  ss.end_time
FROM student_slots ss
JOIN students st ON ss.student_id = st.id
JOIN subjects s ON ss.subject_id = s.id
WHERE st.name = 'Test Student 2'
ORDER BY ss.weekday, ss.start_time;

-- Verify subjects were auto-created
SELECT * FROM subjects 
WHERE college_name = 'College of Vocational Studies' 
  AND course = 'B.Sc Computer Science';

-- Check that clones_count was incremented
SELECT clones_count 
FROM community_timetables 
WHERE course = 'B.Sc Computer Science';
-- Should be 1
```

### Test 4: Verify No Live Link (Deep Copy Isolation)

This is the critical test to ensure edits to the original don't affect clones:

1. **As the original creator**, go to Community Hub

2. **Verify the timetable shows "Cloned by 1 students"**

3. **In the database, modify the original community_slots**:

```sql
-- Change a subject name in community_slots
UPDATE community_slots
SET subject_name = 'MODIFIED SUBJECT'
WHERE id = (
  SELECT cs.id 
  FROM community_slots cs
  JOIN community_timetables ct ON cs.timetable_id = ct.id
  WHERE ct.course = 'B.Sc Computer Science'
  LIMIT 1
);
```

4. **Check student_slots for student 2**:

```sql
SELECT s.name as subject_name
FROM student_slots ss
JOIN subjects s ON ss.subject_id = s.id
JOIN students st ON ss.student_id = st.id
WHERE st.name = 'Test Student 2';
```

5. **Expected Result**:
   - ✅ Student 2's slots still have the ORIGINAL subject names
   - ✅ No "MODIFIED SUBJECT" appears in student_slots
   - ✅ This confirms the deep copy worked - no live link exists

### Test 5: Multiple Clones Increment Counter

1. **Create a third student** (optional)

2. **Clone the same timetable** with the third student

3. **Check clones_count**:

```sql
SELECT clones_count 
FROM community_timetables 
WHERE course = 'B.Sc Computer Science';
-- Should be 2
```

## Edge Cases to Test

### 1. Empty Search Results
- Search for a non-existent college
- Expected: "No timetables found" message

### 2. Publishing Without Slots
- Try to publish with 0 slots added
- Expected: Alert "Please add at least one class slot"

### 3. Invalid Time Range
- Try to add a slot where end_time <= start_time
- Expected: Alert "End time must be after start time"

### 4. Clone Without Student Profile
- If you haven't created a student profile, try to clone
- Expected: Alert "Please complete your student profile first"

### 5. Duplicate Subjects
- Publish two different timetables with the same subject name
- Clone both
- Expected: Both should work, reusing the same subject record

## Database Verification Queries

```sql
-- Summary of all tables
SELECT 
  (SELECT COUNT(*) FROM community_timetables) as timetables,
  (SELECT COUNT(*) FROM community_slots) as community_slots,
  (SELECT COUNT(*) FROM student_slots) as student_slots,
  (SELECT COUNT(*) FROM subjects) as subjects,
  (SELECT COUNT(*) FROM students) as students;

-- Check RLS is working (run as different user)
SET request.jwt.claim.sub = 'USER_ID_HERE';
SELECT * FROM student_slots;
-- Should only return that user's slots

-- Check foreign key relationships
SELECT 
  ss.id,
  st.name as student,
  s.name as subject,
  ss.weekday
FROM student_slots ss
JOIN students st ON ss.student_id = st.id
JOIN subjects s ON ss.subject_id = s.id;
```

## Success Criteria

✅ Can create and publish a community timetable with multiple slots  
✅ Timetables are searchable by college, course, and semester  
✅ Cloning creates a complete deep copy in student_slots  
✅ Subjects are auto-created if they don't exist  
✅ clones_count increments correctly  
✅ Edits to community_slots DO NOT affect cloned student_slots  
✅ Multiple students can clone the same timetable  
✅ UI is responsive and user-friendly  

## Next Steps

After verifying all tests pass, you're ready for **Build Order Step 3: Onboarding Flow** - which will add authentication UI and the guided setup for new users.

## Troubleshooting

**Problem**: "Failed to create community timetable" error  
**Solution**: Check RLS policies are correctly set and the user has a student profile

**Problem**: Clone button doesn't work  
**Solution**: Ensure you're logged in as a different user than the creator

**Problem**: Subjects not being created  
**Solution**: Check the INSERT permission on the subjects table for authenticated users

**Problem**: Can't see other students' timetables  
**Solution**: Verify the "Anyone can view community timetables" RLS policy is active
