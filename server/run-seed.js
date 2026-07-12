const fs = require('fs');
const path = require('path');
const { supabase } = require('./config/database');

async function runSeed() {
  // Try raw SQL runner first (may not be available in all client builds)
  try {
    if (supabase.postgres && typeof supabase.postgres.query === 'function') {
      const filePath = path.join(__dirname, '..', 'database', 'seed.sql');
      const sql = fs.readFileSync(filePath, 'utf8');

      const statements = sql
        .split(/;\s*\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length);

      console.log(`Found ${statements.length} SQL statements to run (raw mode).`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await supabase.postgres.query({ sql: stmt + ';' });
          console.log(`OK [${i + 1}/${statements.length}]`);
        } catch (err) {
          console.error(`ERROR executing statement ${i + 1}:`, err.message || err);
          throw err;
        }
      }

      console.log('Seed applied successfully (raw mode).');
      return;
    }
  } catch (err) {
    console.warn('Raw SQL runner not available or failed, falling back to programmatic inserts.');
  }

  // Fallback: programmatically insert the important seed rows (EMP006)
  try {
    console.log('Fallback: applying programmatic seed for EMP006');

    // Check if EMP006 exists
    const { data: existing } = await supabase.from('employees').select('id').eq('employee_number', 'EMP006').single();
    if (!existing) {
      const password_hash = '$2b$10$6AM0xvH3DWWNW.Dv1BTEMePcyf0hXpJ/MjOhFIiwGeBf/qN7qsCI.'; // same test hash used in seed
      const { data: newEmp, error: empErr } = await supabase.from('employees').insert([
        {
          employee_number: 'EMP006',
          email: 'linda.mabena@thusanangfs.co.za',
          password_hash,
          first_name: 'Linda',
          last_name: 'Mabena',
          department: 'Customer Service',
          job_title: 'Support Specialist',
          hire_date: '2024-08-15',
          status: 'active'
        }
      ]).select().single();

      if (empErr) throw empErr;

      const empId = newEmp.id;

      // Payslip
      await supabase.from('payslips').insert([
        {
          employee_id: empId,
          pay_period_start: '2026-01-01',
          pay_period_end: '2026-01-31',
          payment_date: '2026-01-25',
          gross_salary: 15000.00,
          deductions: { tax: 2250.00, uif: 150.00, pension: 750.00 },
          net_salary: 12050.00
        }
      ]);

      // Leave balance
      await supabase.from('leave_balances').insert([
        {
          employee_id: empId,
          year: 2026,
          annual_total: 21,
          annual_used: 2.0,
          sick_total: 30,
          sick_used: 0.0,
          family_responsibility_total: 3,
          family_responsibility_used: 0.0
        }
      ]);

      // Leave request
      await supabase.from('leave_requests').insert([
        {
          employee_id: empId,
          leave_type: 'sick',
          start_date: '2026-03-10',
          end_date: '2026-03-11',
          total_days: 2,
          reason: 'Medical',
          status: 'approved'
        }
      ]);

      console.log('Programmatic seed applied for EMP006.');
    } else {
      console.log('EMP006 already exists; skipping programmatic inserts.');
    }

  } catch (err) {
    console.error('Programmatic seed failed:', err.message || err);
    process.exit(1);
  }
}

runSeed();
