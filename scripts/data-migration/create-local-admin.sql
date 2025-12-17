-- Create a test admin user in local database
-- Email: admin@test.com
-- Password: admin123

-- First, you need to sign up through Supabase Studio or the app
-- Then run this to make the user an admin:

-- UPDATE profiles SET role = 'admin'
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'admin@test.com'
-- );

-- Or if you know the user ID:
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
