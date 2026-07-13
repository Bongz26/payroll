require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Querying leave requests...');
    const { data: requests, error } = await supabase
        .from('leave_requests')
        .select('*, employees:employee_id (id, first_name, last_name, employee_number)')
        .eq('status', 'pending')
        .is('manager_approved_by', null)
        .order('created_at', { ascending: true });

    if (error) console.error('Error:', error);
    else console.log('Pending requests:', JSON.stringify(requests, null, 2));
}

test();
