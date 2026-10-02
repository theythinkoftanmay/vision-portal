# Build Order Step 4: Today View - Testing Guide

## What Was Implemented

✅ **Today's Schedule Display** - Shows classes scheduled for today based on weekday
✅ **Schedule Exception Handling** - Cancelled classes are hidden, extra classes are shown
✅ **Attendance Status Buttons** - Mark classes as Attended / Missed / Cancelled
✅ **Quick Mark All Action** - One-click button to mark all classes as attended
✅ **Real-time Status Updates** - Attendance is saved to database and UI updates immediately
✅ **Data Integrity** - Attendance keyed to (student_id, subject_id, date, start_time)

## Files Created/Modified

- `src/components/TodayView.tsx` - Main Today View component with class cards and status buttons
- `src/lib/api/today.ts` - API functions for fetching schedule and marking attendance
- `src/App.tsx` - Added TodayView as the home route ("/")

## How Today View Works

### Schedule Logic
1. Fetches all `student_slots` matching today's weekday (0=Sunday, 6=Saturday)
2. Fetches `schedule_exceptions` for today's date
3. **Cancelled exceptions**: Regular slots are removed from the list
4. **Extra exceptions**: Makeup/extra classes are added to the list
5. Fetches existing `attendance` records for today to show current status
6. Sorts classes by start time

### Attendance Logic
- Each class has 3 status buttons: **Attended**, **Missed**, **Cancelled**
- Clicking a button upserts to the `attendance` table
- **Upsert behavior**: Updates existing record or inserts new one
- **Unique constraint**: (student_id, subject_id, date, start_time) prevents duplicates
- "Mark All as Attended" bulk-upserts all classes at once

## How to Test

### Prerequisites
1. ✅ Complete Steps 1-3 (Database schema, Community Hub, Onboarding)
2. ✅ Have a student profile with student_slots in the database
3. ✅ Ensure you have classes scheduled for today's weekday

### Setup Test Data

If you don't have classes scheduled for today, you can either:

**Option A: Add test slots for today's weekday**

Run this in Supabase SQL Editor (replace values as needed):

```sql
-- Check what weekday today is (0=Sunday, 1=Monday, ... 6=Saturday)
SELECT EXTRACT(DOW FROM CURRENT_DATE) as todays_weekday;

-- Get your student_id
SELECT id, name FROM students WHERE user_id = auth.uid();

-- Get a subject_id (or create one)
SELECT id, name FROM subjects LIMIT 5;

-- Add a test class for today (replace STUDENT_ID, SUBJECT_ID, and weekday)
INSERT INTO student_slots (student_id, subject_id, weekday, start_time, end_time)
VALUES (
  'YOUR_STUDENT_ID',
  'YOUR_SUBJECT_ID',
  1,  -- Replace with today's weekday number from query above
  '09:00:00',
  '10:00:00'
);

-- Add another class
INSERT INTO student_slots (student_id, subject_id, weekday, start_time, end_time)
VALUES (
  'YOUR_STUDENT_ID',
  'YOUR_SUBJECT_ID',
  1,  -- Same weekday
  '11:00:00',
  '12:00:00'
);
```

**Option B: Test on a different day**

Change your computer's system date to match a day when you have classes scheduled (e.g., if your slots are for Monday, set your system to Monday).

### Test Cases

#### 1. View Today's Schedule
- Navigate to the home page ("/")
- Should see "Today's Schedule" with today's date
- Should see all classes scheduled for today's weekday
- Classes should be sorted by start time

**Expected**: If today is Thursday (weekday 4), only Thursday classes appear.

#### 2. Mark Attendance - Single Class
- Click "Attended" button on a class
- Card should turn green with "✓ Attended" badge
- Button should be highlighted
- Refresh page - status should persist

**Database check**:
```sql
SELECT * FROM attendance 
WHERE student_id = 'YOUR_STUDENT_ID' 
AND date = CURRENT_DATE;
```

#### 3. Change Attendance Status
- Mark a class as "Attended"
- Then click "Missed" on the same class
- Card should turn red with "✗ Missed" badge
- Status should update (not duplicate)

**Database check**: Should still be 1 record per class (upsert behavior)

#### 4. Mark All as Attended
- Click "✓ Mark All as Attended" button at the top
- Confirmation dialog should appear
- All classes should turn green simultaneously
- Should see success message with count

**Database check**: All today's classes should have attendance records with status='attended'

#### 5. Cancelled Status
- Mark a class as "Cancelled"
- Card should turn gray with "⊘ Cancelled" badge
- These won't count toward attendance percentage (future feature)

#### 6. No Classes Today
- If today's weekday has no scheduled classes
- Should see: "No classes today! 🎉 Enjoy your day off"

#### 7. Schedule Exceptions (Advanced)

**Test Cancelled Class**:
```sql
-- Cancel a specific class for today
INSERT INTO schedule_exceptions (student_id, subject_id, date, exception_type, start_time, end_time)
VALUES (
  'YOUR_STUDENT_ID',
  'YOUR_SUBJECT_ID',
  CURRENT_DATE,
  'cancelled',
  '09:00:00',
  '10:00:00'
);
```
- Refresh Today View
- That class should NOT appear in the list

**Test Extra Class**:
```sql
-- Add a makeup/extra class for today
INSERT INTO schedule_exceptions (student_id, subject_id, date, exception_type, start_time, end_time)
VALUES (
  'YOUR_STUDENT_ID',
  'YOUR_SUBJECT_ID',
  CURRENT_DATE,
  'extra',
  '14:00:00',
  '15:00:00'
);
```
- Refresh Today View
- Extra class should appear with "+ Extra Class" badge

### Edge Cases

1. **Multiple classes same subject different times**: Should all appear separately
2. **Past vs Future classes**: Today View shows ALL today's classes regardless of time
3. **Unauthenticated user**: Should redirect to /auth (ProtectedRoute)
4. **No student profile**: Should show "Please complete your profile first"

## Database Verification Queries

```sql
-- Check today's schedule for a student
SELECT 
  ss.id,
  ss.weekday,
  ss.start_time,
  ss.end_time,
  s.name as subject_name,
  s.type as subject_type
FROM student_slots ss
JOIN subjects s ON s.id = ss.subject_id
WHERE ss.student_id = 'YOUR_STUDENT_ID'
AND ss.weekday = EXTRACT(DOW FROM CURRENT_DATE);

-- Check attendance records for today
SELECT 
  a.id,
  a.date,
  a.start_time,
  a.status,
  s.name as subject_name
FROM attendance a
JOIN subjects s ON s.id = a.subject_id
WHERE a.student_id = 'YOUR_STUDENT_ID'
AND a.date = CURRENT_DATE
ORDER BY a.start_time;

-- Check schedule exceptions for today
SELECT *
FROM schedule_exceptions
WHERE student_id = 'YOUR_STUDENT_ID'
AND date = CURRENT_DATE;
```

## Success Criteria

- ✅ Today's classes load correctly based on weekday
- ✅ Attendance buttons work and persist to database
- ✅ Mark All as Attended updates all classes at once
- ✅ Status changes update existing records (no duplicates)
- ✅ Cancelled classes are hidden from Today View
- ✅ Extra classes appear with proper badge
- ✅ UI updates immediately after marking attendance
- ✅ No loading spinner gets stuck

## Next Steps

After Step 4 is verified, continue with:
- **Step 5**: Attendance Summary Screen (subject-wise %, overall %, warnings)
- **Step 6**: Schedule Exceptions UI (add/edit cancelled and extra classes)
- **Step 7**: Assignments Tracker
