-- Migration: Add manager and HR approval tracking fields to leave requests

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES employees(id),
    ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS hr_approved_by UUID REFERENCES employees(id),
    ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMP WITH TIME ZONE;
