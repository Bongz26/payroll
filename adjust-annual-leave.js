#!/usr/bin/env node
/**
 * Thusanang Funeral Services — Annual Leave Adjustment Tool
 * Allows adjusting the annual_total leave balance for employees (e.g., pro-rata for mid-year starters).
 *
 * USAGE:
 *   node adjust-annual-leave.js --list
 *   node adjust-annual-leave.js --name "David Mphasane" --days 9
 *   node adjust-annual-leave.js --emp TFS-890130 --days 9
 *   node adjust-annual-leave.js --prorate-august
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CURRENT_YEAR = new Date().getFullYear();

async function listEmployees() {
    console.log('\n═'.repeat(75));
    console.log('  CURRENT EMPLOYEES & ANNUAL LEAVE BALANCES (YEAR ' + CURRENT_YEAR + ')');
    console.log('═'.repeat(75));

    const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, email, hire_date')
        .eq('status', 'active')
        .order('first_name', { ascending: true });

    if (empErr) {
        console.error('❌ Error fetching employees:', empErr.message);
        return;
    }

    const { data: balances, error: balErr } = await supabase
        .from('leave_balances')
        .select('employee_id, annual_total, annual_used')
        .eq('year', CURRENT_YEAR);

    if (balErr) {
        console.error('❌ Error fetching leave balances:', balErr.message);
        return;
    }

    const balanceMap = {};
    (balances || []).forEach(b => {
        balanceMap[b.employee_id] = b;
    });

    console.log(
        '  ' +
        'Name'.padEnd(25) +
        'Emp No'.padEnd(14) +
        'Hire Date'.padEnd(14) +
        'Annual Total'.padEnd(15) +
        'Used / Rem'
    );
    console.log('  ' + '─'.repeat(73));

    employees.forEach(emp => {
        const bal = balanceMap[emp.id] || { annual_total: 'N/A', annual_used: 0 };
        const fullName = `${emp.first_name} ${emp.last_name}`;
        const total = bal.annual_total;
        const used = bal.annual_used;
        const remaining = total !== 'N/A' ? (total - used) : 'N/A';

        console.log(
            '  ' +
            fullName.padEnd(25) +
            emp.employee_number.padEnd(14) +
            (emp.hire_date || 'N/A').padEnd(14) +
            String(total).padEnd(15) +
            `${used} / ${remaining}`
        );
    });
    console.log();
}

async function updateAnnualLeave(identifier, days) {
    const parsedDays = parseInt(days, 10);
    if (isNaN(parsedDays) || parsedDays < 0) {
        console.error('❌ Invalid days provided. Must be an integer >= 0.');
        return;
    }

    // Find employee by employee_number, email, or name
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, email');

    if (error || !employees) {
        console.error('❌ Failed to fetch employees:', error?.message);
        return;
    }

    const match = employees.find(e =>
        e.employee_number.toLowerCase() === identifier.toLowerCase() ||
        e.email.toLowerCase() === identifier.toLowerCase() ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(identifier.toLowerCase())
    );

    if (!match) {
        console.error(`❌ Employee matching "${identifier}" not found.`);
        return;
    }

    const { data: bal, error: balErr } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', match.id)
        .eq('year', CURRENT_YEAR)
        .maybeSingle();

    if (balErr) {
        console.error('❌ Error fetching leave balance:', balErr.message);
        return;
    }

    if (!bal) {
        // Create new balance record
        const { error: insErr } = await supabase
            .from('leave_balances')
            .insert([{
                employee_id: match.id,
                year: CURRENT_YEAR,
                annual_total: parsedDays,
                annual_used: 0,
                sick_total: 30,
                sick_used: 0,
                family_responsibility_total: 3,
                family_responsibility_used: 0,
                overtime_total: 0,
                overtime_used: 0
            }]);

        if (insErr) {
            console.error('❌ Failed to create leave balance:', insErr.message);
            return;
        }
        console.log(`✅ Created leave balance for ${match.first_name} ${match.last_name} (${match.employee_number}): annual_total = ${parsedDays} days.`);
    } else {
        const oldTotal = bal.annual_total;
        const { error: updErr } = await supabase
            .from('leave_balances')
            .update({ annual_total: parsedDays })
            .eq('id', bal.id);

        if (updErr) {
            console.error('❌ Failed to update leave balance:', updErr.message);
            return;
        }
        console.log(`✅ Updated ${match.first_name} ${match.last_name} (${match.employee_number}): annual_total changed from ${oldTotal} to ${parsedDays} days.`);
    }
}

(async () => {
    const args = process.argv.slice(2);

    if (args.includes('--list') || args.length === 0) {
        await listEmployees();
        return;
    }

    const nameIdx = args.indexOf('--name');
    const empIdx = args.indexOf('--emp');
    const daysIdx = args.indexOf('--days');

    const identifier = nameIdx !== -1 ? args[nameIdx + 1] : (empIdx !== -1 ? args[empIdx + 1] : null);
    const days = daysIdx !== -1 ? args[daysIdx + 1] : null;

    if (identifier && days) {
        await updateAnnualLeave(identifier, days);
    } else {
        console.log('Usage:');
        console.log('  node adjust-annual-leave.js --list');
        console.log('  node adjust-annual-leave.js --name "First Last" --days <number>');
        console.log('  node adjust-annual-leave.js --emp <TFS-XXXXXX> --days <number>');
    }
})();
