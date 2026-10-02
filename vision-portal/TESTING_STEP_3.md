# Multi-Step Onboarding Flow - Testing Guide

**Implemented:** 2026-10-01  
**Build Order Step:** 3 of 8

## What Was Implemented

✅ **4-Step Onboarding Wizard**
- Step 1: Create Profile (name, college, course, semester, batch)
- Step 2: Search Community Hub (auto-populated with profile data)
- Step 3: Clone Selected Timetable (deep copy to student_slots)
- Step 4: Add Custom Electives (SEC/VAC/GE and lab batches)

✅ **Skip Logic**
- Students with existing student_slots bypass onboarding entirely
- Goes directly to main app if onboarding already completed

✅ **Navigation**
- Progress indicator (Step 1 of 4, Step 2 of 4, etc.)
- Back/Next/Skip buttons between steps
- Can skip cloning and go straight to manual entry

## Files Created

### New Components
- `src/components/onboarding/OnboardingWizard.tsx` - Main orchestrator
- `src/components/onboarding/Step1Profile.tsx` - Profile form
- `src/components/onboarding/Step2Search.tsx` - Community search
- `src/components/onboarding/Step3Clone.tsx` - Clone confirmation
- `src/components/onboarding/Step4Electives.tsx` - Add electives form

### New API Functions
- `src/lib/api/onboarding.ts`
  - `hasCompletedOnboarding(studentId)` - Check if student has any slots
  - `addStudentSlots(studentId, slots[])` - Add custom electives
  - `getStudentInfo(studentId)` - Get college/course for subject creation

### Modified Files
- `src/components/ProtectedRoute.tsx` - Added student_slots check
- `src/App.tsx` - Updated to use OnboardingWizard

## How to Test

### Test 1: Fresh Sign-Up → Full Onboarding Flow

**Steps:**
1. Start dev server: `npm run dev`
2. Open http://localhost:5174
3. Click "Sign Up" and create a new account:
   - Email: `newuser@test.com`
   - Password: `testpass123`
4. Should automatically redirect to `/onboarding` showing Step 1

**Step 1: Create Profile**
5. Fill in the form:
   - Name: `Test Student`
   - College: `College of Vocational Studies`
   - Course: `B.Sc Computer Science`
   - Semester: `1`
   - Batch: `Batch A` (optional)
6. Click "Next: Find a Timetable"
7. Progress indicator should show "Step 2 of 4"

**Step 2: Search Community Hub**
8. Form should be auto-populated with your college/course/semester
9. Click "Search Timetables"
10. If timetables exist, you'll see results cards
11. **Option A:** Select a timetable and click "Next: Clone This Template →"
12. **Option B:** Click "Skip to Create Own" to go directly to Step 4

**Step 3: Clone Timetable** (if you selected one)
13. See confirmation screen with info about what cloning does
14. Click "Clone This Timetable"
15. Should see success message: "Successfully Cloned! X classes added to your schedule"
16. Click "Next: Add Your Electives →"
17. Progress indicator should show "Step 4 of 4"

**Step 4: Add Electives**
18. Add a custom elective:
    - Subject Name: `Machine Learning Lab`
    - Subject Type: `SEC`
    - Day: `Monday`
    - Start Time: `14:00`
    - End Time: `16:00`
19. Click "+ Add Class"
20. See it appear in "Added Classes" list
21. Add another elective (e.g., VAC or GE)
22. Click "Finish Setup & Add 2 Classes"
23. Should redirect to main app home page (`/`)

**Verify in Database:**
```sql
-- Check student record
SELECT * FROM students WHERE user_id = 'YOUR_AUTH_UID';

-- Check student_slots (should have cloned + custom slots)
SELECT ss.*, s.name, s.type 
FROM student_slots ss
JOIN subjects s ON ss.subject_id = s.id
WHERE ss.student_id = 'YOUR_STUDENT_ID'
ORDER BY weekday, start_time;

-- Should see: cloned core subjects + your custom SEC/VAC electives
```

### Test 2: Returning User with Slots → Skip Onboarding

**Steps:**
1. Sign out and sign back in with the account you just created
2. Should go **directly to `/` (main app)**
3. Should **NOT** see `/onboarding`
4. This confirms skip logic works

**Verify:**
- No redirect loop
- User lands on home page with nav (Community Hub, Publish Schedule)

### Test 3: Skip Cloning → Manual Entry Only

**Steps:**
1. Create another test account
2. Go through Step 1 (create profile)
3. On Step 2, click "Skip to Create Own" (don't search/select)
4. Should jump directly to Step 4
5. Progress shows "Step 4 of 4"
6. Add at least one class manually:
   - Subject: `Data Structures`
   - Type: `core`
   - Day: `Tuesday`
   - Time: `09:00 - 11:00`
7. Click "Finish Setup & Add 1 Class"
8. Should redirect to main app

**Verify in Database:**
```sql
-- Should only see manually added slots (no cloned ones)
SELECT COUNT(*) FROM student_slots WHERE student_id = 'STUDENT_ID';
-- Count should match number you manually added
```

### Test 4: Edge Case - Profile Exists but No Slots

This simulates a user who created a profile manually (via old onboarding) but didn't complete the new flow.

**Setup:**
1. Create a student record manually in Supabase SQL Editor:
```sql
-- First, create a test auth user in Supabase Dashboard (Authentication > Users)
-- Then insert student record:
INSERT INTO students (id, user_id, name, college_name, course, semester, batch)
VALUES (
  'NEW_AUTH_UID',  -- Use the auth UID from the user you just created
  'NEW_AUTH_UID',
  'Manual Student',
  'Test College',
  'B.Sc CS',
  1,
  NULL
);
```

**Test:**
2. Sign in with that test user
3. Should redirect to `/onboarding`
4. Should **start at Step 2** (not Step 1)
5. Profile fields should be pre-filled
6. Complete Steps 2-4 normally
7. Should redirect to main app

**Verify:**
- Step 1 was skipped because profile already exists
- User could still complete onboarding from Step 2

### Test 5: Back Navigation

**Steps:**
1. Start fresh onboarding
2. Complete Step 1 → reach Step 2
3. Click "← Back" button
4. Should return to Step 1
5. Profile form should still have your previous data
6. Modify a field (e.g., change semester)
7. Click "Next" again
8. Step 2 search should reflect the updated semester

**Expected:**
- Back button works at every step
- Data persists when going back/forward
- Can edit profile and re-search

### Test 6: Mobile Responsiveness

**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone SE" (375px width)
4. Go through entire onboarding flow
5. Check:
   - Progress indicator is readable
   - Forms stack vertically (1 column)
   - Buttons are large enough to tap
   - No horizontal scrolling

## Common Issues & Troubleshooting

### Issue: "Please complete your student profile first"
**Cause:** Step 2 tried to search before Step 1 created student record  
**Fix:** This shouldn't happen - check that Step 1 properly sets studentId

### Issue: Clone fails with "Failed to clone"
**Cause:** RLS policy or network issue  
**Fix:** Check browser console for error details, verify RLS policies

### Issue: Can't add electives - "Failed to create student slots"
**Cause:** Subject creation failed or student_id is null  
**Fix:** Check that addStudentSlots API is receiving correct studentId

### Issue: Stuck in infinite redirect loop
**Cause:** ProtectedRoute logic may be misconfigured  
**Fix:** Check ProtectedRoute's student_slots query

### Issue: Build errors about missing imports
**Cause:** Import paths might be wrong  
**Fix:** Ensure all imports use correct relative paths (../../lib/api/...)

## Verification Checklist

After testing, verify these in Supabase Dashboard:

- [ ] Students table has record with correct college/course/semester
- [ ] Student_slots table has entries for that student
- [ ] Subjects table has entries matching the slots (auto-created)
- [ ] Cloned slots have correct subject_id links
- [ ] Custom electives have correct subject_type (SEC/VAC/GE)
- [ ] Community_timetables clones_count incremented (if cloned)

## Next Steps

After confirming onboarding works:

1. **Build Order Step 4:** Today View - Daily timetable rendering and attendance logging
2. **Build Order Step 5:** Attendance Calculations & Summary Screen
3. **Build Order Step 6:** Schedule Exceptions (one-off cancellations/makeup classes)
4. **Build Order Step 7:** Assignments Tracker

## Known Limitations (MVP)

- No localStorage persistence - refreshing mid-onboarding resets to Step 1
- Can't edit profile after Step 1 without going back
- No way to re-run onboarding once completed (would need manual DB cleanup)
- Search is manual (click button) not auto-search
- No pagination on search results (shows all matches)
