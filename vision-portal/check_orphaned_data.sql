-- Check for orphaned data referencing the wrong student ID
-- Your auth UID: b3952cab-fe36-4852-b9ae-6c644265b33c
-- Wrong student ID: c00b1e7a-ec09-42aa-ab0e-7040a04aed2c

-- 1. Check all students
SELECT 'Students' as table_name, id, user_id, name
FROM students;

-- 2. Check student_slots for the wrong ID
SELECT 'student_slots' as table_name, COUNT(*) as orphaned_count
FROM student_slots
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- 3. Check attendance for the wrong ID
SELECT 'attendance' as table_name, COUNT(*) as orphaned_count
FROM attendance
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- 4. Check schedule_exceptions for the wrong ID
SELECT 'schedule_exceptions' as table_name, COUNT(*) as orphaned_count
FROM schedule_exceptions
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- 5. Check community_timetables created_by for the wrong ID
SELECT 'community_timetables' as table_name, COUNT(*) as orphaned_count
FROM community_timetables
WHERE created_by = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

-- Detailed view of orphaned data
SELECT 'Details: student_slots' as info;
SELECT id, student_id, subject_id, weekday, start_time, end_time
FROM student_slots
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

SELECT 'Details: attendance' as info;
SELECT id, student_id, subject_id, date, status
FROM attendance
WHERE student_id = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';

SELECT 'Details: community_timetables' as info;
SELECT id, college_name, course, semester, created_by
FROM community_timetables
WHERE created_by = 'c00b1e7a-ec09-42aa-ab0e-7040a04aed2c';
