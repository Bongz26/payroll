#!/usr/bin/env node
/**
 * Update Mohlolo Sibeko → Lucas Sibeko in Supabase
 * Also updates email and re-hashes password (same ID number)
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSibeko() {
    console.log('🔄 Updating Mohlolo Sibeko → Lucas Sibeko...\n');

    // Find Mohlolo Sibeko by multiple possible emails (he had fleet@thusanangfs.co.za in DB)
    const { data: employees, error: findErr } = await supabase
        .from('employees')
        .select('*')
        .eq('last_name', 'Sibeko');

    if (findErr) {
        console.error('❌ Query error:', findErr.message);
        return;
    }

    if (!employees || employees.length === 0) {
        console.error('❌ No employee with last name "Sibeko" found');
        return;
    }

    console.log(`Found ${employees.length} Sibeko employee(s):`);
    employees.forEach(e => {
        console.log(`  - ${e.first_name} ${e.last_name} | ${e.email} | ID: ${e.id}`);
    });

    // Find Mohlolo specifically
    const mohlolo = employees.find(e => e.first_name === 'Mohlolo');
    if (!mohlolo) {
        console.error('❌ Could not find "Mohlolo Sibeko" specifically');
        return;
    }

    console.log(`\n📌 Updating employee ID: ${mohlolo.id}`);
    console.log(`   Old: ${mohlolo.first_name} ${mohlolo.last_name} | ${mohlolo.email}`);

    // Re-hash the password with the same ID number
    const idNumber = '6308265838087';
    const password_hash = await bcrypt.hash(idNumber, 10);

    // Update the record
    const { data: updated, error: updateErr } = await supabase
        .from('employees')
        .update({
            first_name: 'Lucas',
            email: 'lucas.sibeko@thusanang.co.za',
            password_hash: password_hash,
        })
        .eq('id', mohlolo.id)
        .select()
        .single();

    if (updateErr) {
        console.error('❌ Update error:', updateErr.message);
        return;
    }

    console.log(`   New: ${updated.first_name} ${updated.last_name} | ${updated.email}`);
    console.log('\n✅ Successfully updated!');
    console.log('\n📋 Login credentials for Lucas Sibeko:');
    console.log(`   Email:    lucas.sibeko@thusanang.co.za`);
    console.log(`   Password: ${idNumber} (SA ID number)`);
}

updateSibeko().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
