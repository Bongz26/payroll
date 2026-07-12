#!/usr/bin/env node
/**
 * Thusanang Funeral Services — One-Shot Bulk Employee Import
 * Run: node run-bulk-import.js
 *
 * EMAIL POLICY:
 *   All employees use a standardised company login username:
 *     firstname.lastname@thusanang.co.za
 *   This is NOT a real mailbox — it is purely a login credential.
 *   No personal email address is required. Everyone logs in the same way.
 *
 * DEFAULT PASSWORD: employee's 13-digit SA ID number
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
const HIRE_DATE = '2026-07-07'; // Today — update if needed
const YEAR = 2026;

// ── Employee roster ────────────────────────────────────────────────────────────
// Format: { first_name, last_name, id_number }
// employee_number  → TFS-<first 6 digits of ID>
// email            → firstname.lastname@thusanang.co.za
// password         → full 13-digit ID number (employee changes on first login)
// ──────────────────────────────────────────────────────────────────────────────
const EMPLOYEES = [
    // ── Group 1 ──────────────────────────────────────────────────────────────
    { first_name: 'Gele',        last_name: 'Mokwena',    id_number: '6006250336089' },
    { first_name: 'Botle',       last_name: 'Nkhabu',     id_number: '8801040693080' },
    { first_name: 'Karabelo',    last_name: 'Khakhane',   id_number: '8911180482085' },
    { first_name: 'Lerato',      last_name: 'Sehloho',    id_number: '9501170464083' },
    { first_name: 'Majobo',      last_name: 'Mofokeng',   id_number: '8502190679081' },
    { first_name: 'Margaret',    last_name: 'Radebe',     id_number: '8712060938083' },
    { first_name: 'Margaret',    last_name: 'Mota',       id_number: '9109020662086' },
    { first_name: 'Masechaba',   last_name: 'Molaba',     id_number: '9312031231087' },
    { first_name: 'Matebello',   last_name: 'Sekhele',    id_number: '9211200482085' },
    { first_name: 'Motebang',    last_name: 'Nchapi',     id_number: '9110075135085' },
    { first_name: 'Nonhlanhla',  last_name: 'Mahlaba',    id_number: '9404210401084' },
    { first_name: 'Nthabiseng',  last_name: 'Miya',       id_number: '8103060548082' },
    { first_name: 'Paulinah',    last_name: 'Lemphane',   id_number: '8708090223082' },
    { first_name: 'Puleng',      last_name: 'Mofokeng',   id_number: '9111150400089' },
    { first_name: 'Teboho',      last_name: 'Motaung',    id_number: '8707075270084' },
    { first_name: 'Tlalane',     last_name: 'Sebetoane',  id_number: '8201130570084' },
    // ── Group 2 ──────────────────────────────────────────────────────────────
    { first_name: 'Fusi',        last_name: 'Khatoane',   id_number: '7602185425085' },
    { first_name: 'Joseph',      last_name: 'Nsizwana',   id_number: '8004276319088' },
    { first_name: 'Lebaka',      last_name: 'Tseki',      id_number: '7606251428087' },
    { first_name: 'Matshoko',    last_name: 'Lekhoaba',   id_number: '6912105463087' },
    { first_name: 'Mohlolo',     last_name: 'Sibeko',     id_number: '6308265838087' },
    { first_name: 'Raditabo',    last_name: 'Ntleru',     id_number: '7001065551088' },
    { first_name: 'Refilwe',     last_name: 'Hlakotsa',   id_number: '9411240398081' },
    { first_name: 'Sibusiso',    last_name: 'Molefe',     id_number: '8810046159087' },
    { first_name: 'Solly',       last_name: 'Khesa',      id_number: '6803235397081' },
    { first_name: 'Tsietsi',     last_name: 'Khesa',      id_number: '6801175609085' },
    // ── Group 3 ──────────────────────────────────────────────────────────────
    { first_name: 'Bongani',     last_name: 'Khumalo',    id_number: '9502075436085' }, // may already exist
    { first_name: 'Daniel',      last_name: 'Khumpeli',   id_number: '6812065433080' },
    { first_name: 'Lilahloane',  last_name: 'Nkali',      id_number: '6607180293082' },
    { first_name: 'Mandla',      last_name: 'Ngwenya',    id_number: '7907265535087' },
    { first_name: 'Matla',       last_name: 'Matsipa',    id_number: '6509165902085' },
    { first_name: 'Bongz',       last_name: 'Dev',        id_number: '9502075436080' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function toEmployeeNumber(idNumber) {
    return `TFS-${idNumber.substring(0, 6)}`;
}

function toEmail(firstName, lastName) {
    const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
    return `${f}.${l}@thusanang.co.za`;
}

function pad(str, len) {
    return String(str).padEnd(len);
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n' + '═'.repeat(65));
    console.log('  Thusanang Funeral Services — Bulk Employee Import');
    console.log('  Developed by Dondas Tech');
    console.log('═'.repeat(65));
    console.log(`\n  Importing ${EMPLOYEES.length} employees...\n`);
    console.log('  ' + pad('Name', 28) + pad('Emp No', 14) + pad('Email', 35) + 'Status');
    console.log('  ' + '─'.repeat(90));

    const results = { created: [], skipped: [], failed: [] };

    for (const emp of EMPLOYEES) {
        const employee_number = toEmployeeNumber(emp.id_number);
        const email = toEmail(emp.first_name, emp.last_name);
        const fullName = `${emp.first_name} ${emp.last_name}`;

        // Check for existing record by employee_number OR id_number (used as emp_number in old seed)
        const { data: existing } = await supabase
            .from('employees')
            .select('id, employee_number, email')
            .or(`employee_number.eq.${employee_number},employee_number.eq.${emp.id_number},email.eq.${email}`)
            .maybeSingle();

        if (existing) {
            console.log(`  ${pad(fullName, 28)}${pad(employee_number, 14)}${pad(email, 35)}⏭  Already exists (skipped)`);
            results.skipped.push({ name: fullName, reason: `matches existing record` });
            continue;
        }

        // Hash the ID number as password
        const password_hash = await bcrypt.hash(emp.id_number, SALT_ROUNDS);

        // Insert employee
        const { data: newEmp, error } = await supabase
            .from('employees')
            .insert([{
                employee_number,
                email,
                password_hash,
                first_name: emp.first_name,
                last_name: emp.last_name,
                department: null,
                job_title: null,
                hire_date: HIRE_DATE,
                status: 'active',
            }])
            .select()
            .single();

        if (error || !newEmp) {
            console.log(`  ${pad(fullName, 28)}${pad(employee_number, 14)}${pad(email, 35)}❌  ${error?.message || 'Insert failed'}`);
            results.failed.push({ name: fullName, reason: error?.message });
            continue;
        }

        // Create leave balance for current year
        await supabase.from('leave_balances').insert([{
            employee_id: newEmp.id,
            year: YEAR,
            annual_total: 21,
            annual_used: 0,
            sick_total: 30,
            sick_used: 0,
            family_responsibility_total: 3,
            family_responsibility_used: 0,
        }]);

        console.log(`  ${pad(fullName, 28)}${pad(employee_number, 14)}${pad(email, 35)}✅  Created`);
        results.created.push({ name: fullName, email, employee_number, password: emp.id_number });
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(65));
    console.log('  IMPORT COMPLETE');
    console.log('═'.repeat(65));
    console.log(`  ✅ Created:  ${results.created.length}`);
    console.log(`  ⏭  Skipped:  ${results.skipped.length}  (already in DB)`);
    console.log(`  ❌ Failed:   ${results.failed.length}`);

    if (results.created.length > 0) {
        console.log('\n  ── Login Credentials (' + results.created.length + ' new employees) ──────────────────────');
        console.log('  ' + pad('Name', 28) + pad('Email', 38) + 'Password (ID No.)');
        console.log('  ' + '─'.repeat(85));
        results.created.forEach(e => {
            console.log('  ' + pad(e.name, 28) + pad(e.email, 38) + e.password);
        });
    }

    if (results.failed.length > 0) {
        console.log('\n  ── Failed ───────────────────────────────────────────────────────');
        results.failed.forEach(e => console.log(`  • ${e.name} — ${e.reason}`));
    }

    console.log('\n  All employees can log in using their 13-digit SA ID as password.');
    console.log('  They should change their password after first login.\n');
})();
