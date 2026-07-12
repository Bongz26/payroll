// Generate a valid password hash for password123
const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    console.log('\n' + '='.repeat(70));
    console.log('PASSWORD HASH FOR SEED DATA');
    console.log('='.repeat(70));
    console.log(`\nPassword: ${password}`);
    console.log(`\nGenerated Hash:\n${hash}`);
    console.log('\n' + '='.repeat(70));
    console.log('Copy the hash above and replace ALL instances in seed.sql');
    console.log('='.repeat(70));

    // Verify it works
    const isValid = await bcrypt.compare(password, hash);
    console.log(`\nHash verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
}

generateHash().catch(console.error);
