// Simple test using server's built-in modules
const { supabase } = require('./server/config/database');

async function checkEmployees() {
    console.log('='.repeat(70));
    console.log('CHECKING EMPLOYEES IN DATABASE');
    console.log('='.repeat(70));

    try {
        // Query all employees
        const { data: employees, error } = await supabase
            .from('employees')
            .select('employee_number, email, first_name, last_name, status');

        if (error) {
            console.log('❌ Error querying employees:', error.message);
            return;
        }

        if (!employees || employees.length === 0) {
            console.log('\n⚠️  NO EMPLOYEES FOUND IN DATABASE!');
            console.log('\nThis means the seed data was NOT loaded.');
            console.log('You need to run database/seed.sql in Supabase.');
            return;
        }

        console.log(`\n✅ Found ${employees.length} employees:`);
        employees.forEach((emp, i) => {
            console.log(`\n${i + 1}. ${emp.first_name} ${emp.last_name}`);
            console.log(`   Employee #: ${emp.employee_number}`);
            console.log(`   Email: ${emp.email}`);
            console.log(`   Status: ${emp.status}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('✅ Employee data exists! Login should work.');

    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
    }
}

checkEmployees().then(() => process.exit(0));
