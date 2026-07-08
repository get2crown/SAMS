-- Fields needed for admin-managed employee records
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;
