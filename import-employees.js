#!/usr/bin/env node
/**
 * ==========================================================
 * Thusanang Funeral Services — Employee Import Tool
 * Developed by Dondas Tech
 * ==========================================================
 *
 * USAGE:
 *   node import-employees.js
 *
 * You will be prompted to enter employee details one at a time.
 * Default password = employee's SA ID number.
 * Employee can change it on first login (future feature).
 *
 * Also supports CSV bulk import:
 *   node import-employees.js --csv employees.csv
 * ==========================================================
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Supabase client ────────────────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Helpers ────────────────────────────────────────────────
const SALT_ROUNDS = 10;

const DEPARTMENTS = [
    'Operations',
    'Administration',
    'Finance',
    'Sales',
    'Customer Service',
    'Logistics',
    'Mortuary',
    'Management',
];

/**
 * Derive employee number from ID number.
 * Format: TFS-<first 6 digits of ID>
 * e.g. ID 9502075436085 → TFS-950207
 */
function deriveEmployeeNumber(idNumber) {
    const clean = idNumber.replace(/\D/g, '');
    return `TFS-${clean.substring(0, 6)}`;
}

/**
 * Build a system email from name.
 * firstname.lastname@thusanang.co.za  (but user can override with personal email)
 */
function suggestEmail(firstName, lastName) {
    const f = firstName.toLowerCase().replace(/\s+/g, '');
    const l = lastName.toLowerCase().replace(/\s+/g, '');
    return `${f}.${l}@thusanang.co.za`;
}

function log(msg) { process.stdout.write(msg); }
function logln(msg = '') { console.log(msg); }
function hr() { logln('─'.repeat(60)); }

// ── Readline helper ────────────────────────────────────────
function prompt(rl, question, defaultVal) {
    return new Promise((resolve) => {
        const display = defaultVal ? `${question} [${defaultVal}]: ` : `${question}: `;
        rl.question(display, (answer) => {
            resolve(answer.trim() || defaultVal || '');
        });
    });
}

// ── Core: create one employee ─────────────────────────────
async function createEmployee(data, { verbose = true } = {}) {
    const {
        employee_number,
        email,
        id_number,
        first_name,
        last_name,
        department,
        job_title,
        hire_date,
    } = data;

    // Validate required fields
    if (!employee_number || !email || !id_number || !first_name || !last_name || !hire_date) {
        return { success: false, message: 'Missing required field (employee_number, email, id_number, first_name, last_name, hire_date)' };
    }

    // Check SA ID length
    const cleanId = id_number.replace(/\D/g, '');
    if (cleanId.length !== 13) {
        return { success: false, message: `ID number must be 13 digits (got ${cleanId.length})` };
    }

    // Check for duplicates
    const { data: existing } = await supabase
        .from('employees')
        .select('id, email, employee_number')
        .or(`email.eq.${email},employee_number.eq.${employee_number}`)
        .maybeSingle();

    if (existing) {
        if (existing.email === email) {
            return { success: false, message: `Email "${email}" already exists` };
        }
        return { success: false, message: `Employee number "${employee_number}" already exists` };
    }

    // Hash ID number as password
    const password_hash = await bcrypt.hash(cleanId, SALT_ROUNDS);

    // Insert employee
    const { data: newEmp, error } = await supabase
        .from('employees')
        .insert([{
            employee_number,
            email,
            password_hash,
            first_name,
            last_name,
            department: department || null,
            job_title: job_title || null,
            hire_date,
            status: 'active',
        }])
        .select()
        .single();

    if (error || !newEmp) {
        return { success: false, message: error?.message || 'Insert failed' };
    }

    // Create default leave balance for current year
    const year = new Date().getFullYear();
    await supabase.from('leave_balances').insert([{
        employee_id: newEmp.id,
        year,
        annual_total: 21,
        annual_used: 0,
        sick_total: 30,
        sick_used: 0,
        family_responsibility_total: 3,
        family_responsibility_used: 0,
    }]).select();

    return { success: true, employee: newEmp };
}

// ── Interactive mode ───────────────────────────────────────
async function interactiveMode() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    logln();
    logln('╔══════════════════════════════════════════════════════════╗');
    logln('║   Thusanang Funeral Services — Employee Import Tool      ║');
    logln('║   Developed by Dondas Tech                               ║');
    logln('╚══════════════════════════════════════════════════════════╝');
    logln();
    logln('  Default password = employee\'s 13-digit SA ID number.');
    logln('  Employee can change it after first login.');
    logln('  Type "done" for Employee Number to finish.');
    logln();

    const results = [];
    let count = 0;

    while (true) {
        count++;
        hr();
        logln(`  EMPLOYEE ${count}`);
        hr();

        const firstName = await prompt(rl, '  First Name');
        if (!firstName || firstName.toLowerCase() === 'done') break;

        const lastName = await prompt(rl, '  Last Name');
        const idNumber = await prompt(rl, '  SA ID Number (13 digits)');

        const suggestedEmpNum = deriveEmployeeNumber(idNumber);
        const suggestedEmail = suggestEmail(firstName, lastName);

        logln();
        logln(`  📧 Suggested email:    ${suggestedEmail}`);
        logln(`  🔢 Suggested emp num:  ${suggestedEmpNum}`);
        logln();

        const email = await prompt(rl, '  Email (personal or suggested above)', suggestedEmail);
        const empNum = await prompt(rl, '  Employee Number', suggestedEmpNum);

        logln();
        logln('  Departments:');
        DEPARTMENTS.forEach((d, i) => logln(`    ${i + 1}. ${d}`));
        const deptInput = await prompt(rl, '  Department (number or type name)');
        const department = /^\d+$/.test(deptInput)
            ? (DEPARTMENTS[parseInt(deptInput, 10) - 1] || deptInput)
            : deptInput;

        const jobTitle = await prompt(rl, '  Job Title');
        const hireDate = await prompt(rl, '  Hire Date (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);

        logln();
        log('  ⏳ Creating employee...');

        const result = await createEmployee({
            employee_number: empNum,
            email,
            id_number: idNumber,
            first_name: firstName,
            last_name: lastName,
            department,
            job_title: jobTitle,
            hire_date: hireDate,
        });

        if (result.success) {
            logln(' ✅ Done!');
            logln(`     Name:      ${firstName} ${lastName}`);
            logln(`     Email:     ${email}`);
            logln(`     Emp No:    ${empNum}`);
            logln(`     Password:  ${idNumber.replace(/\D/g, '')} (ID number)`);
            results.push({ status: 'success', name: `${firstName} ${lastName}`, email });
        } else {
            logln(` ❌ Failed: ${result.message}`);
            results.push({ status: 'failed', name: `${firstName} ${lastName}`, reason: result.message });
        }

        const another = await prompt(rl, '\n  Add another employee? (y/n)', 'y');
        if (another.toLowerCase() !== 'y') break;
    }

    rl.close();

    // Summary
    logln();
    hr();
    logln('  IMPORT SUMMARY');
    hr();
    const succeeded = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    logln(`  ✅ Created:  ${succeeded.length}`);
    logln(`  ❌ Failed:   ${failed.length}`);
    if (failed.length > 0) {
        logln('\n  Failed employees:');
        failed.forEach(f => logln(`    • ${f.name} — ${f.reason}`));
    }
    logln();
    logln('  Done. Employees can now log in using their SA ID as password.');
    logln();
}

// ── CSV bulk import mode ───────────────────────────────────
async function csvMode(csvPath) {
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ File not found: ${csvPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    // Expected columns: first_name,last_name,id_number,email,employee_number,department,job_title,hire_date
    const [headerLine, ...dataLines] = lines;
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

    logln(`\n📋 CSV Import: ${csvPath}`);
    logln(`   Found ${dataLines.length} employees to import.\n`);

    let success = 0, failed = 0;

    for (const line of dataLines) {
        if (!line.trim()) continue;
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });

        // Auto-derive missing employee_number and email
        if (!row.employee_number && row.id_number) {
            row.employee_number = deriveEmployeeNumber(row.id_number);
        }
        if (!row.email && row.first_name && row.last_name) {
            row.email = suggestEmail(row.first_name, row.last_name);
        }

        const name = `${row.first_name} ${row.last_name}`;
        log(`  Importing ${name}...`);

        const result = await createEmployee(row);
        if (result.success) {
            logln(` ✅  [${row.employee_number}] ${row.email}`);
            success++;
        } else {
            logln(` ❌  ${result.message}`);
            failed++;
        }
    }

    logln(`\n  Summary: ${success} created, ${failed} failed.\n`);
}

// ── Entry point ────────────────────────────────────────────
(async () => {
    const args = process.argv.slice(2);

    if (args.includes('--csv')) {
        const csvIndex = args.indexOf('--csv');
        const csvFile = args[csvIndex + 1];
        if (!csvFile) {
            console.error('Usage: node import-employees.js --csv <path-to-file.csv>');
            process.exit(1);
        }
        await csvMode(csvFile);
    } else {
        await interactiveMode();
    }
})();
