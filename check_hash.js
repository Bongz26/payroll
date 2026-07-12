const bcrypt = require('bcrypt');

const hashFromSeed = '$2b$10$wW5540.0.10.10.10.10.10.10.10.10.10.10.10.10.10.10'; // Needs to actally be read from file output, I will extract it from the view_file output in next step.
// Wait, I don't have the output yet. I should write this script to accept the hash or hardcode a known good one to generate and compare.

async function test() {
    const password = 'password123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Generated hash for password123:', hash);

    // I will manually compare this with what I see in seed.sql
}

test();
