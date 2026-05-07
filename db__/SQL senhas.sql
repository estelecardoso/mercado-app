INSERT INTO users (name, email, password)
SELECT 'Admin', 'admin@admin.com', 'Admin123'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@admin.com'
);