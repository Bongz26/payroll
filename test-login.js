// Test script to verify login functionality
const axios = require('axios');

async function testLogin() {
    console.log('='.repeat(70));
    console.log('TESTING LOGIN API');
    console.log('='.repeat(70));

    const testEmail = 'john.mokoena@thusanangfs.co.za';
    const testPassword = 'password123';

    try {
        console.log('\n1. Testing health endpoint...');
        const healthRes = await axios.get('http://localhost:5000/health');
        console.log('✅ Health check:', healthRes.data);

        console.log('\n2. Attempting login...');
        console.log(`   Email: ${testEmail}`);
        console.log(`   Password: ${testPassword}`);

        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: testEmail,
            password: testPassword
        });

        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('Response:', JSON.stringify(loginRes.data, null, 2));

    } catch (error) {
        console.log('\n❌ LOGIN FAILED!');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }

    console.log('\n' + '='.repeat(70));
}

testLogin();
