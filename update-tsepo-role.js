#!/usr/bin/env node
/**
 * Set Tsepo Chabana's role to Managing Director (Management department).
 * HR review access is granted via the HR_REVIEWER_EMAILS allowlist in
 * server/routes/leave.js and client/src/pages/Leave.jsx.
 *
 * USAGE:
 *   node update-tsepo-role.js            (dry run)
 *   node update-tsepo-role.js --apply    (writes changes)
 */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');
const EMAIL = 'tsepo.chabana@thusanang.co.za';
const UPDATE = { job_title: 'Managing Director', department: 'Management' };

(async () => {
    const { data: emp, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, email, job_title, department')
        .ilike('email', EMAIL)
        .single();

    if (error || !emp) {
        console.error('❌ Employee not found:', error?.message || EMAIL);
        process.exit(1);
    }

    console.log(`${emp.first_name} ${emp.last_name} (${emp.employee_number})`);
    console.log(`  job_title : ${emp.job_title || '-'}  ->  ${UPDATE.job_title}`);
    console.log(`  department: ${emp.department || '-'}  ->  ${UPDATE.department}`);

    if (!APPLY) {
        console.log('\nDry run. Re-run with --apply to save.');
        return;
    }

    const { error: updErr } = await supabase.from('employees').update(UPDATE).eq('id', emp.id);
    if (updErr) {
        console.error('❌ Update failed:', updErr.message);
        process.exit(1);
    }
    console.log('\n✅ Updated. Ask Tsepo to log out and back in to refresh access.');
})();
