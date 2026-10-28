#!/usr/bin/env node
/**
 * recalculate-leave-days.js
 * 
 * Audits all leave requests and updates total_days to exclude Sundays (non-working days).
 * For approved requests, it also adjusts the employee's leave balance so overcharged days are refunded.
 *
 * Usage:
 *   node recalculate-leave-days.js          # Dry-run audit mode
 *   node recalculate-leave-days.js --apply  # Apply updates to database
 */

const { createClient } = require('@supabase/supabase-js');
const { parseISO, eachDayOfInterval } = require('date-fns');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const isApply = process.argv.includes('--apply');

function calculateWorkingLeaveDays(startDateStr, endDateStr) {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    if (end < start) return 0;
    const days = eachDayOfInterval({ start, end });
    return days.filter(d => d.getDay() !== 0).length; // Exclude Sunday (0)
}

async function run() {
    console.log('='.repeat(70));
    console.log(`  LEAVE DAYS AUDIT & REPAIR ${isApply ? '[APPLY MODE]' : '[DRY RUN - PREVIEW ONLY]'}`);
    console.log('='.repeat(70));

    const { data: requests, error } = await supabase
        .from('leave_requests')
        .select(`
            id,
            employee_id,
            leave_type,
            start_date,
            end_date,
            total_days,
            status,
            employees:employee_id (first_name, last_name, employee_number)
        `)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching leave requests:', error);
        return;
    }

    const discrepancies = [];

    for (const req of (requests || [])) {
        const correctWorkingDays = calculateWorkingLeaveDays(req.start_date, req.end_date);
        if (correctWorkingDays !== req.total_days) {
            discrepancies.push({
                ...req,
                correctWorkingDays,
                overcharged: req.total_days - correctWorkingDays
            });
        }
    }

    console.log(`\nFound ${discrepancies.length} requests with Sunday discrepancies:\n`);

    for (const item of discrepancies) {
        const empName = item.employees ? `${item.employees.first_name} ${item.employees.last_name}` : item.employee_id;
        console.log(`- Request #${item.id.slice(0, 8)} | ${empName} | Type: ${item.leave_type} | Status: ${item.status}`);
        console.log(`  Dates: ${item.start_date} to ${item.end_date} | Stored: ${item.total_days} days -> Correct: ${item.correctWorkingDays} days (Difference: ${item.overcharged} day(s))`);
    }

    if (!isApply) {
        console.log('\n' + '='.repeat(70));
        console.log('To apply these corrections to the database and refund overcharged days:');
        console.log('  node recalculate-leave-days.js --apply');
        console.log('='.repeat(70));
        return;
    }

    console.log('\nApplying corrections...');

    for (const item of discrepancies) {
        // 1. Update leave_request total_days
        const { error: updErr } = await supabase
            .from('leave_requests')
            .update({ total_days: item.correctWorkingDays })
            .eq('id', item.id);

        if (updErr) {
            console.error(`❌ Failed to update request #${item.id}:`, updErr.message);
            continue;
        }

        // 2. If approved, adjust leave_balances
        if (item.status === 'approved' && item.overcharged > 0) {
            const year = new Date(item.start_date).getFullYear();
            const { data: balance, error: balErr } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('employee_id', item.employee_id)
                .eq('year', year)
                .maybeSingle();

            if (balErr || !balance) {
                console.warn(`⚠️ Could not find balance for employee ${item.employee_id} year ${year}`);
                continue;
            }

            const fieldMap = {
                annual: 'annual_used',
                sick: 'sick_used',
                family_responsibility: 'family_responsibility_used',
                overtime: 'overtime_used'
            };

            const usedField = fieldMap[item.leave_type];
            if (usedField && balance[usedField] != null) {
                const currentUsed = parseFloat(balance[usedField]) || 0;
                const newUsed = Math.max(0, currentUsed - item.overcharged);

                const { error: balUpdErr } = await supabase
                    .from('leave_balances')
                    .update({ [usedField]: newUsed })
                    .eq('id', balance.id);

                if (balUpdErr) {
                    console.error(`❌ Failed to update balance #${balance.id}:`, balUpdErr.message);
                } else {
                    console.log(`✅ Refunded ${item.overcharged} day(s) to ${usedField} (was: ${currentUsed}, now: ${newUsed})`);
                }
            }
        }

        console.log(`✅ Updated request #${item.id.slice(0, 8)} to ${item.correctWorkingDays} days.`);
    }

    console.log('\n🎉 All corrections applied successfully!');
}

run();
