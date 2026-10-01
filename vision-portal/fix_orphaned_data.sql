-- Fix orphaned data caused by mismatched student IDs
-- Auth UID (correct): b3952cab-fe36-4852-b9ae-6c644265b33c
-- Wrong student ID: c00b1e7a-ec09-42aa-ab0e-7040a04aed2c

-- Run check_orphaned_data.sql first to see what needs fixing!

-- ============================================================================
-- OPTION 1: Reassign orphaned data to the correct student ID
-- ============================================================================

-- Update student_slots to point to correct student
UPDATE student_slots
SET student_id = 'b3952cab-fe36-4852-b9ae-6c644265b33c'
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- Update attendance to point to correct student
UPDATE attendance
SET student_id = 'b3952cab-fe36-4852-b9ae-6c644265b33c'
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- Update schedule_exceptions to point to correct student
UPDATE schedule_exceptions
SET student_id = 'b3952cab-fe36-4852-b9ae-6c644265b33c'
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- Update community_timetables created_by to point to correct student
UPDATE community_timetables
SET created_by = 'b3952cab-fe36-4852-b9ae-6c644265b33c'
WHERE created_by = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- Delete the wrong student record (cascades will be handled by foreign keys)
DELETE FROM students
WHERE id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- ============================================================================
-- OPTION 2: Clean slate - delete everything and start fresh
-- ============================================================================
-- Uncomment these if you want to just delete all orphaned data:

-- DELETE FROM student_slots WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';
-- DELETE FROM attendance WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';
-- DELETE FROM schedule_exceptions WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';
-- DELETE FROM community_timetables WHERE created_by = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';
-- DELETE FROM students WHERE id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- ============================================================================
-- Verify the fix
-- ============================================================================

SELECT 'Remaining students:' as status;
SELECT id, user_id, name FROM students;

SELECT 'Student slots count:' as status;
SELECT student_id, COUNT(*) FROM student_slots GROUP BY student_id;

SELECT 'Community timetables by creator:' as status;
SELECT created_by, COUNT(*) FROM community_timetables GROUP BY created_by;
