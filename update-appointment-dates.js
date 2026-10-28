#!/usr/bin/env node
/**
 * Thusanang Funeral Services — Appointment Date Correction
 * Updates hire_date to the verified appointment date and recalculates the
 * current-year annual leave entitlement:
 *   - Appointed before this year  -> full 21 days
 *   - Appointed during this year  -> pro-rata 1.75 days per month (start month included),
 *     rounded — same rule used for David Mphasane (9) and Matla Matsipa (19).
 *
 * USAGE:
 *   node update-appointment-dates.js            (dry run, shows changes)
 *   node update-appointment-dates.js --apply    (writes changes)
 */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CURRENT_YEAR = new Date().getFullYear();
const FULL_ANNUAL = 21;
const APPLY = process.argv.includes('--apply');

// Verified appointment dates (YYYY-MM-DD)
const CORRECTIONS = [
    { employee_number: 'TFS-881004', name: 'Sibusiso Molefe', hire_date: '2020-11-11' },
    { employee_number: 'TFS-660718', name: 'Nkali Lilahloane Maria', hire_date: '2026-03-27' },
    { employee_number: 'TFS-940421', name: 'Nonhlanhla Roselina Mahlaba', hire_date: '2019-05-01' },
    { employee_number: 'TFS-760625', name: 'Lebaka Tseki', hire_date: '2009-03-02' },
];

function entitlementFor(hireDate) {
    const d = new Date(hireDate + 'T00:00:00');
    if (d.getFullYear() < CURRENT_YEAR) return FULL_ANNUAL;
    const monthsRemaining = 12 - d.getMonth(); // start month included
    return Math.round((FULL_ANNUAL / 12) * monthsRemaining);
}

async function run() {
    console.log(`\n${APPLY ? '✍️  APPLYING' : '🔍 DRY RUN'} — appointment date corrections (${CURRENT_YEAR})\n`);

    for (const c of CORRECTIONS) {
        const { data: emp, error } = await supabase
            .from('employees')
            .select('id, first_name, last_name, hire_date')
            .eq('employee_number', c.employee_number)
            .maybeSingle();

        if (error || !emp) {
            console.error(`❌ ${c.name} (${c.employee_number}) not found: ${error?.message || ''}`);
            continue;
        }

        const { data: bal } = await supabase
            .from('leave_balances')
            .select('id, annual_total, annual_used')
            .eq('employee_id', emp.id)
            .eq('year', CURRENT_YEAR)
            .maybeSingle();

        const newTotal = entitlementFor(c.hire_date);
        const used = bal?.annual_used ?? 0;

        console.log(`• ${emp.first_name} ${emp.last_name} (${c.employee_number})`);
        console.log(`    Hire date:    ${emp.hire_date}  →  ${c.hire_date}`);
        console.log(`    Annual total: ${bal?.annual_total ?? 'N/A'}  →  ${newTotal}   (used ${used}, remaining ${newTotal - used})`);

        if (!APPLY) continue;

        const { error: empErr } = await supabase
            .from('employees')
            .update({ hire_date: c.hire_date })
            .eq('id', emp.id);
        if (empErr) { console.error(`    ❌ hire_date update failed: ${empErr.message}`); continue; }

        if (bal) {
            const { error: balErr } = await supabase
                .from('leave_balances')
                .update({ annual_total: newTotal })
                .eq('id', bal.id);
            if (balErr) { console.error(`    ❌ leave update failed: ${balErr.message}`); continue; }
        }
        console.log('    ✅ Updated');
    }

    if (!APPLY) console.log('\nRun with --apply to save these changes.');
}

run().catch(err => { console.error('Script error:', err); process.exit(1); });
