-- Sample Data for Testing
-- Thusanang Funeral Services Payroll System
-- Password for all employees: password123

-- Sample Employees
INSERT INTO employees (employee_number, email, password_hash, first_name, last_name, department, job_title, hire_date, status)
VALUES
  ('EMP001', 'john.mokoena@thusanangfs.co.za', '$2b$10$6AM0xvH3DWWNW.Dv1BTEMePcyf0hXpJ/MjOhFIiwGeBf/qN7qsCI.', 'John', 'Mokoena', 'Operations', 'Funeral Director', '2020-01-15', 'active'),
  ('EMP002', 'sarah.dlamini@thusanangfs.co.za', '$2b$10$6AM0xvH3DWWNW.Dv1BTEMePcyf0hXpJ/MjOhFIiwGeBf/qN7qsCI.', 'Sarah', 'Dlamini', 'Administration', 'HR Manager', '2019-03-20', 'active'),
  ('EMP003', 'thabo.nkosi@thusanangfs.co.za', '$2b$10$6AM0xvH3DWWNW.Dv1BTEMePcyf0hXpJ/MjOhFIiwGeBf/qN7qsCI.', 'Thabo', 'Nkosi', 'Operations', 'Driver', '2021-06-10', 'active'),
  ('EMP004', 'nomsa.khumalo@thusanangfs.co.za', '$2b$10$6AM0xvH3DWWNW.Dv1BTEMePcyf0hXpJ/MjOhFIiwGeBf/qN7qsCI.', 'Nomsa', 'Khumalo', 'Finance', 'Accountant', '2018-11-05', 'active'),
  ('EMP005', 'sipho.buthelezi@thusanangfs.co.za', '$2b$10$6AM0xvH3DWWNW.Dv1BTEMePcyf0hXpJ/MjOhFIiwGeBf/qN7qsCI.', 'Sipho', 'Buthelezi', 'Sales', 'Sales Consultant', '2022-02-01', 'active'),
  ('9502075436085', 'bongzdev@gmail.com', '$2b$10$g5t/eO0vO9K9UecKbAw94uR7o3HcIXMX2Gw6BKO4uRnHl4DcYEzmq', 'Bongani', 'Khumalo', 'Operations', 'Ops and IT Manager', '2025-11-10', 'active');

-- Sample Payslips (Last 3 months)
INSERT INTO payslips (employee_id, pay_period_start, pay_period_end, payment_date, gross_salary, deductions, net_salary)
SELECT 
  id,
  '2026-01-01',
  '2026-01-31',
  '2026-01-25',
  25000.00,
  '{"tax": 3750.00, "uif": 250.00, "pension": 1250.00}'::jsonb,
  19750.00
FROM employees WHERE employee_number = 'EMP001';

INSERT INTO payslips (employee_id, pay_period_start, pay_period_end, payment_date, gross_salary, deductions, net_salary)
SELECT 
  id,
  '2025-12-01',
  '2025-12-31',
  '2025-12-25',
  25000.00,
  '{"tax": 3750.00, "uif": 250.00, "pension": 1250.00}'::jsonb,
  19750.00
FROM employees WHERE employee_number = 'EMP001';

INSERT INTO payslips (employee_id, pay_period_start, pay_period_end, payment_date, gross_salary, deductions, net_salary)
SELECT 
  id,
  '2026-01-01',
  '2026-01-31',
  '2026-01-25',
  35000.00,
  '{"tax": 5950.00, "uif": 250.00, "pension": 1750.00}'::jsonb,
  27050.00
FROM employees WHERE employee_number = 'EMP002';

INSERT INTO payslips (employee_id, pay_period_start, pay_period_end, payment_date, gross_salary, deductions, net_salary)
SELECT 
  id,
  '2025-12-01',
  '2025-12-31',
  '2025-12-25',
  18000.00,
  '{"tax": 2430.00, "uif": 250.00, "pension": 900.00}'::jsonb,
  14420.00
FROM employees WHERE employee_number = 'EMP003';

-- Additional sample employee (EMP006) for testing registration
INSERT INTO employees (employee_number, email, password_hash, first_name, last_name, department, job_title, hire_date, status)
VALUES
  ('EMP006', 'linda.mabena@thusanangfs.co.za', '$2b$10$6AM0xvH3DWWNW.Dv1BTEMePcyf0hXpJ/MjOhFIiwGeBf/qN7qsCI.', 'Linda', 'Mabena', 'Customer Service', 'Support Specialist', '2024-08-15', 'active');

-- Sample payslip for EMP006
INSERT INTO payslips (employee_id, pay_period_start, pay_period_end, payment_date, gross_salary, deductions, net_salary)
SELECT
  id,
  '2026-01-01',
  '2026-01-31',
  '2026-01-25',
  15000.00,
  '{"tax": 2250.00, "uif": 150.00, "pension": 750.00}'::jsonb,
  12050.00
FROM employees WHERE employee_number = 'EMP006';

-- Leave balance for EMP006
INSERT INTO leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, family_responsibility_total, family_responsibility_used)
SELECT id, 2026, 21, 2.0, 30, 0.0, 3, 0.0 FROM employees WHERE employee_number = 'EMP006';

-- Sample leave request for EMP006
INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at)
SELECT
  id,
  'sick',
  '2026-03-10',
  '2026-03-11',
  2,
  'Medical',
  'approved',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM employees WHERE employee_number = 'EMP006';

-- Sample Leave Balances (Current Year 2026)
INSERT INTO leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, family_responsibility_total, family_responsibility_used)
SELECT id, 2026, 21, 5.0, 30, 2.0, 3, 0.0 FROM employees WHERE employee_number = 'EMP001';

INSERT INTO leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, family_responsibility_total, family_responsibility_used)
SELECT id, 2026, 21, 8.5, 30, 1.0, 3, 1.0 FROM employees WHERE employee_number = 'EMP002';

INSERT INTO leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, family_responsibility_total, family_responsibility_used)
SELECT id, 2026, 21, 3.0, 30, 0.0, 3, 0.0 FROM employees WHERE employee_number = 'EMP003';

INSERT INTO leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, family_responsibility_total, family_responsibility_used)
SELECT id, 2026, 21, 0.0, 30, 0.0, 3, 0.0 FROM employees WHERE employee_number = 'EMP004';

INSERT INTO leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, family_responsibility_total, family_responsibility_used)
SELECT id, 2026, 21, 12.0, 30, 3.0, 3, 0.0 FROM employees WHERE employee_number = 'EMP005';

-- Sample Leave Requests
INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at)
SELECT 
  id,
  'annual',
  '2026-02-10',
  '2026-02-14',
  5,
  'Family vacation',
  'approved',
  CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM employees WHERE employee_number = 'EMP001';

INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at)
SELECT 
  id,
  'sick',
  '2026-01-20',
  '2026-01-21',
  2,
  'Flu',
  'approved',
  CURRENT_TIMESTAMP - INTERVAL '11 days'
FROM employees WHERE employee_number = 'EMP001';

INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at)
SELECT 
  id,
  'annual',
  '2026-02-15',
  '2026-02-21',
  7,
  'Taking time off',
  'approved',
  CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM employees WHERE employee_number = 'EMP002';

INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at)
SELECT 
  id,
  'annual',
  '2026-03-01',
  '2026-03-07',
  7,
  'Personal time',
  'pending',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM employees WHERE employee_number = 'EMP003';

INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at)
SELECT 
  id,
  'family_responsibility',
  '2026-01-30',
  '2026-01-30',
  1,
  'Family emergency',
  'approved',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM employees WHERE employee_number = 'EMP002';

INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at)
SELECT 
  id,
  'annual',
  '2026-04-01',
  '2026-04-10',
  10,
  'Easter vacation',
  'pending',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM employees WHERE employee_number = 'EMP005';

-- Display summary
SELECT 'Seed data inserted successfully!' as message;
