const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { supabase } = require('./server/config/database');

async function testOvertimeSystem() {
    console.log('='.repeat(65));
    console.log('  TESTING OVERTIME LEAVE SYSTEM');
    console.log('='.repeat(65));

    try {
        // Find a test employee and a manager
        const { data: employees, error: empErr } = await supabase
            .from('employees')
            .select('*')
            .eq('status', 'active')
            .limit(5);

        if (empErr || !employees || employees.length === 0) {
            console.error('Failed to fetch test employees:', empErr);
            return;
        }

        const manager = employees.find(e => e.email.includes('admin') || e.email.includes('manager')) || employees[0];
        const staff = employees.find(e => e.id !== manager.id) || employees[0];

        console.log(`✅ Manager: ${manager.first_name} ${manager.last_name} (${manager.email})`);
        console.log(`✅ Staff:   ${staff.first_name} ${staff.last_name} (${staff.email})`);

        // Test 1: Check leave balance structure
        const currentYear = new Date().getFullYear();
        const { data: balance, error: balErr } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', staff.id)
            .eq('year', currentYear)
            .maybeSingle();

        console.log('\n📊 Current Balance Record for Staff:', balance ? {
            year: balance.year,
            annual_total: balance.annual_total,
            annual_used: balance.annual_used,
            overtime_total: balance.overtime_total,
            overtime_used: balance.overtime_used
        } : 'None found');

        // Test 2: Check if overtime_allocations table exists
        const { data: otAllocs, error: otErr } = await supabase
            .from('overtime_allocations')
            .select('*')
            .limit(1);

        if (otErr) {
            console.log('\n⚠️  Note on overtime_allocations table:', otErr.message);
            console.log('   (Run database/migration-add-overtime-leave.sql in Supabase SQL editor)');
        } else {
            console.log('\n✅ overtime_allocations table exists and is accessible.');
        }

        console.log('\n' + '='.repeat(65));
        console.log('  OVERTIME FEATURE VERIFICATION COMPLETED');
        console.log('='.repeat(65));
    } catch (err) {
        console.error('Test error:', err);
    }
}

testOvertimeSystem();
