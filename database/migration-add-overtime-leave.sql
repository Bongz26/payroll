-- Migration: Add Overtime Leave Support
-- Thusanang Funeral Services Payroll System

-- 1. Update leave_type check constraint in leave_requests to include 'overtime'
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check 
    CHECK (leave_type IN ('annual', 'sick', 'family_responsibility', 'unpaid', 'maternity', 'paternity', 'overtime'));

-- 2. Add overtime columns to leave_balances table (default 0 days)
ALTER TABLE leave_balances 
    ADD COLUMN IF NOT EXISTS overtime_total DECIMAL(5, 1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS overtime_used DECIMAL(5, 1) DEFAULT 0;

-- 3. Create overtime_allocations table to track when managers manually credit overtime days
CREATE TABLE IF NOT EXISTS overtime_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    allocated_by UUID REFERENCES employees(id),
    days DECIMAL(5, 1) NOT NULL,
    reason TEXT NOT NULL,
    date_worked DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_overtime_allocations_employee_id ON overtime_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_allocations_allocated_by ON overtime_allocations(allocated_by);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE overtime_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own overtime allocations" ON overtime_allocations;
CREATE POLICY "Employees can view own overtime allocations" ON overtime_allocations
    FOR SELECT USING (auth.uid()::text = employee_id::text);
