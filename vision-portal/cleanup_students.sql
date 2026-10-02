-- Check what students exist
SELECT id, user_id, name, college_name, course, created_at
FROM students
ORDER BY created_at DESC;

-- Delete the manually created test student (the one with wrong user_id)
-- Replace 9e252899-3dae-4fe2-8e05-37b62993b368 with the actual ID shown above
DELETE FROM students
WHERE id = '9e252899-3dae-4fe2-8e05-37b62993b368';

-- Verify only your real student profile remains
SELECT id, user_id, name
FROM students
WHERE user_id = '6fcdfd5a-b704-4ac2-8940-fe6b1c4faeda';
