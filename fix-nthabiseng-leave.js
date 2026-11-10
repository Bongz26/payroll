#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const { parseISO, eachDayOfInterval } = require('date-fns');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function calculateWorkingLeaveDays(startDateStr, endDateStr) {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    if (end < start) return 0;
    const days = eachDayOfInterval({ start, end });
    return days.filter(d => d.getDay() !== 0).length;
}

async function run() {
    const { data: requests, error } = await supabase
        .from('leave_requests')
        .select('id, employee_id, start_date, end_date, total_days, status, leave_type, employees:employee_id (first_name, last_name)')
        .gt('total_days', 100);

    if (error) {
        console.error('Error fetching request:', error);
        return;
    }

    console.log(`Found ${requests.length} anomalous leave requests (>100 days):`);
    for (const req of requests) {
        const empName = req.employees ? `${req.employees.first_name} ${req.employees.last_name}` : req.employee_id;
        console.log(`- Request #${req.id}: ${empName} | ${req.start_date} to ${req.end_date} | total_days: ${req.total_days}`);

        // Correct end_date to 2026-11-19 if it was 2029-11-19
        let correctedEndDate = req.end_date;
        if (req.end_date.startsWith('2029-')) {
            correctedEndDate = req.end_date.replace('2029-', '2026-');
        }

        const correctWorkingDays = calculateWorkingLeaveDays(req.start_date, correctedEndDate);
        console.log(`  Updating to ${req.start_date} -> ${correctedEndDate} (${correctWorkingDays} working days)...`);

        const { error: updErr } = await supabase
            .from('leave_requests')
            .update({
                end_date: correctedEndDate,
                total_days: correctWorkingDays
            })
            .eq('id', req.id);

        if (updErr) {
            console.error('  Update error:', updErr);
        } else {
            console.log('  Successfully fixed!');
        }
    }
}

run();
