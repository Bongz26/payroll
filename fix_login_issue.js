const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { supabase } = require('./server/config/database');

async function fixLogin() {
    console.log('Starting login fix...');

    // 1. Generate Hash
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    console.log(`Generated new hash for '${password}': ${hash}`);

    // 2. Update seed.sql
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    let seedContent = fs.readFileSync(seedPath, 'utf8');

    // Replace the specific known bad hash OR just replace any bcrypt-looking string if we want to be aggressive, 
    // but better to be safe and search for the one we saw: $2b$10$EISVWlfe.nWKhytDbi2wi8NzfBcAXur2
    // Or simpler: replace strict string.
    const badHash = '$2b$10$EISVWlfe.nWKhytDbi2wi8NzfBcAXur2';

    if (seedContent.includes(badHash)) {
        const newContent = seedContent.replaceAll(badHash, hash);
        fs.writeFileSync(seedPath, newContent);
        console.log('✅ Updated database/seed.sql with new hash.');
    } else {
        console.log('⚠️ Could not find exact bad hash in seed.sql. Initial seed.sql might have been changed already or different.');
        // Fallback: Use regex to find any $2b$10$ string that is followed by '
        // But let's check if the file has the NEW hash already?
        if (seedContent.includes(hash)) {
            console.log('✅ seed.sql already contains the new hash (or a valid one).');
        } else {
            console.log('⚠️ Manual check required for seed.sql');
        }
    }

    // 3. Update Live Database
    console.log('Updating live database entries...');
    const { data: employees, error: fetchError } = await supabase
        .from('employees')
        .select('*');

    if (fetchError) {
        console.error('❌ Error fetching employees:', fetchError);
        return;
    }

    console.log(`Found ${employees.length} employees. Updating passwords...`);

    for (const emp of employees) {
        const { error: updateError } = await supabase
            .from('employees')
            .update({ password_hash: hash })
            .eq('id', emp.id);

        if (updateError) {
            console.error(`❌ Failed to update employee ${emp.email}:`, updateError);
        } else {
            console.log(`✅ Updated password for ${emp.email}`);
        }
    }

    console.log('\nLogin fix completed!');
}

fixLogin().catch(console.error);
