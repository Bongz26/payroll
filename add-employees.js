#!/usr/bin/env node
/**
 * Register Disebo Chabeli and Lebo Chabana in Supabase Database
 * Adds employee records and initializes leave balances.
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SALT_ROUNDS = 10;
const CURRENT_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().split('T')[0];

const NEW_EMPLOYEES = [
    {
        first_name: 'Disebo',
        last_name: 'Chabeli',
        id_number: '9509100340083',
        employee_number: 'TFS-950910',
        email: 'disebo.chabeli@thusanang.co.za',
        department: 'Administration',
        job_title: null,
        hire_date: TODAY,
        status: 'active'
    },
    {
        first_name: 'Lebo',
        last_name: 'Chabana',
        id_number: '8006120574081',
        employee_number: 'TFS-800612',
        email: 'lebo.chabana@thusanang.co.za',
        department: 'Management',
        job_title: 'COO',
        hire_date: TODAY,
        status: 'active'
    },
    {
        first_name: 'David',
        last_name: 'Mphasane',
        id_number: '8901305362080',
        employee_number: 'TFS-890130',
        email: 'david.mphasane@thusanang.co.za',
        department: null,
        job_title: null,
        hire_date: '2026-08-10',
        status: 'active'
    }
];

async function registerEmployees() {
    console.log('═'.repeat(65));
    console.log('  Registering New Employees in Supabase');
    console.log('═'.repeat(65));

    for (const emp of NEW_EMPLOYEES) {
        console.log(`\nProcessing ${emp.first_name} ${emp.last_name}...`);

        // Check if employee already exists
        const { data: existing, error: checkErr } = await supabase
            .from('employees')
            .select('id, employee_number, email')
            .or(`employee_number.eq.${emp.employee_number},email.eq.${emp.email}`)
            .maybeSingle();

        if (checkErr) {
            console.error(`❌ Error checking existing employee:`, checkErr.message);
            continue;
        }

        let employeeId = null;

        if (existing) {
            console.log(`ℹ️  Employee already exists (ID: ${existing.id}, Emp No: ${existing.employee_number})`);
            employeeId = existing.id;
        } else {
            // Hash password
            const password_hash = await bcrypt.hash(emp.id_number, SALT_ROUNDS);

            // Insert employee
            const { data: inserted, error: insertErr } = await supabase
                .from('employees')
                .insert([{
                    employee_number: emp.employee_number,
                    email: emp.email,
                    password_hash: password_hash,
                    first_name: emp.first_name,
                    last_name: emp.last_name,
                    department: emp.department,
                    job_title: emp.job_title,
                    hire_date: emp.hire_date,
                    status: emp.status
                }])
                .select()
                .single();

            if (insertErr || !inserted) {
                console.error(`❌ Failed to insert ${emp.first_name} ${emp.last_name}:`, insertErr?.message);
                continue;
            }

            console.log(`✅ Employee created: ${inserted.first_name} ${inserted.last_name} (${inserted.employee_number})`);
            employeeId = inserted.id;
        }

        // Check or create leave balance
        const { data: existingBalance, error: balCheckErr } = await supabase
            .from('leave_balances')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('year', CURRENT_YEAR)
            .maybeSingle();

        if (existingBalance) {
            console.log(`ℹ️  Leave balance for year ${CURRENT_YEAR} already exists.`);
        } else {
            const leavePayload = {
                employee_id: employeeId,
                year: CURRENT_YEAR,
                annual_total: 21,
                annual_used: 0,
                sick_total: 30,
                sick_used: 0,
                family_responsibility_total: 3,
                family_responsibility_used: 0,
                overtime_total: 0,
                overtime_used: 0
            };

            const { error: balInsertErr } = await supabase
                .from('leave_balances')
                .insert([leavePayload]);

            if (balInsertErr) {
                console.warn(`⚠️ Could not insert leave balance with overtime columns: ${balInsertErr.message}`);
                delete leavePayload.overtime_total;
                delete leavePayload.overtime_used;
                const { error: retryErr } = await supabase
                    .from('leave_balances')
                    .insert([leavePayload]);
                if (retryErr) {
                    console.error(`❌ Failed to create leave balance:`, retryErr.message);
                } else {
                    console.log(`✅ Leave balance initialized for year ${CURRENT_YEAR}`);
                }
            } else {
                console.log(`✅ Leave balance initialized for year ${CURRENT_YEAR}`);
            }
        }
    }

    console.log('\n' + '═'.repeat(65));
    console.log('  Done registering employees.');
    console.log('═'.repeat(65));
}

registerEmployees()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
