#!/usr/bin/env node
/**
 * Diagnose login issues — check employee records in Supabase
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
    console.log('='.repeat(60));
    console.log('  LOGIN DIAGNOSTICS — Thusanang Payroll System');
    console.log('='.repeat(60));

    // 1. Check total employees in DB
    const { data: allEmployees, error: allErr } = await supabase
        .from('employees')
        .select('id, employee_number, email, first_name, last_name, status, password_hash');

    if (allErr) {
        console.error('❌ Failed to query employees table:', allErr.message);
        return;
    }

    console.log(`\n📊 Total employees in database: ${allEmployees.length}`);
    console.log('\n--- All employees ---');
    allEmployees.forEach(e => {
        const hasHash = !!e.password_hash && e.password_hash.length > 10;
        console.log(`  ${e.first_name} ${e.last_name} | ${e.email} | status: ${e.status} | has_password_hash: ${hasHash}`);
    });

    // 2. Specifically check Refilwe
    console.log('\n' + '='.repeat(60));
    console.log('  CHECKING: Refilwe');
    console.log('='.repeat(60));

    const refilweResults = allEmployees.filter(e =>
        e.first_name?.toLowerCase().includes('refilwe')
    );

    if (refilweResults.length === 0) {
        console.log('  ❌ No employee named "Refilwe" found in the database!');
    } else {
        for (const emp of refilweResults) {
            console.log(`  Found: ${emp.first_name} ${emp.last_name}`);
            console.log(`    Email:     ${emp.email}`);
            console.log(`    Status:    ${emp.status}`);
            console.log(`    Emp No:    ${emp.employee_number}`);
            console.log(`    Has hash:  ${!!emp.password_hash}`);

            // Try matching with expected ID number from CSV: 9411240398081
            if (emp.password_hash) {
                const testPassword = '9411240398081';
                const match = await bcrypt.compare(testPassword, emp.password_hash);
                console.log(`    Password test (${testPassword}): ${match ? '✅ MATCHES' : '❌ DOES NOT MATCH'}`);
            }
        }
    }

    // 3. Specifically check Lucas
    console.log('\n' + '='.repeat(60));
    console.log('  CHECKING: Lucas');
    console.log('='.repeat(60));

    const lucasResults = allEmployees.filter(e =>
        e.first_name?.toLowerCase().includes('lucas')
    );

    if (lucasResults.length === 0) {
        console.log('  ❌ No employee named "Lucas" found in the database!');
        console.log('  ℹ️  Lucas is also NOT in the employees.csv file.');
        console.log('     Lucas needs to be added to the system first.');
    } else {
        for (const emp of lucasResults) {
            console.log(`  Found: ${emp.first_name} ${emp.last_name}`);
            console.log(`    Email:     ${emp.email}`);
            console.log(`    Status:    ${emp.status}`);
            console.log(`    Emp No:    ${emp.employee_number}`);
            console.log(`    Has hash:  ${!!emp.password_hash}`);
        }
    }

    // 4. Check for any inactive employees
    const inactive = allEmployees.filter(e => e.status !== 'active');
    if (inactive.length > 0) {
        console.log('\n⚠️  INACTIVE employees (cannot login):');
        inactive.forEach(e => {
            console.log(`    ${e.first_name} ${e.last_name} — status: ${e.status}`);
        });
    }

    // 5. Check for employees with null/empty password hashes
    const noPassword = allEmployees.filter(e => !e.password_hash || e.password_hash.length < 10);
    if (noPassword.length > 0) {
        console.log('\n⚠️  Employees with MISSING password hashes (cannot login):');
        noPassword.forEach(e => {
            console.log(`    ${e.first_name} ${e.last_name} — ${e.email}`);
        });
    }

    // 6. Test bcrypt compare for a sample of active employees with known ID passwords
    console.log('\n' + '='.repeat(60));
    console.log('  PASSWORD HASH VERIFICATION (sample)');
    console.log('='.repeat(60));

    // CSV data: first_name -> id_number mapping for a few employees
    const knownPasswords = {
        'refilwe.hlakotsa@thusanang.co.za': '9411240398081',
        'bongani.khumalo@thusanang.co.za': '9502075436085',
        'tsepo.chabana@thusanang.co.za': '8507035563085',
        'gele.mokwena@thusanang.co.za': '6006250336089',
    };

    for (const [email, idNum] of Object.entries(knownPasswords)) {
        const emp = allEmployees.find(e => e.email === email);
        if (!emp) {
            console.log(`  ${email}: NOT IN DATABASE`);
            continue;
        }
        if (!emp.password_hash) {
            console.log(`  ${email}: NO PASSWORD HASH`);
            continue;
        }
        const match = await bcrypt.compare(idNum, emp.password_hash);
        console.log(`  ${email}: ${match ? '✅ Password OK' : '❌ Password MISMATCH'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('  DONE');
    console.log('='.repeat(60));
}

diagnose().catch(err => {
    console.error('Diagnostic error:', err);
    process.exit(1);
});
