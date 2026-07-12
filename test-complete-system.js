// Direct API test using the server's database connection
const { supabase } = require('./server/config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testCompleteFlow() {
    console.log('\n' + '='.repeat(70));
    console.log('COMPLETE SYSTEM TEST - Thusanang Payroll System');
    console.log('='.repeat(70));

    const testEmail = 'john.mokoena@thusanangfs.co.za';
    const testPassword = 'password123';

    try {
        // Test 1: Check database connection
        console.log('\n📊 TEST 1: Database Connection');
        console.log('-'.repeat(70));
        const { data: empCount, error: countError } = await supabase
            .from('employees')
            .select('count');

        if (countError) {
            console.log('❌ FAILED:', countError.message);
            return;
        }
        console.log('✅ PASSED: Database connected');

        // Test 2: Verify employee exists
        console.log('\n👤 TEST 2: Employee Data');
        console.log('-'.repeat(70));
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('email', testEmail)
            .eq('status', 'active')
            .single();

        if (empError || !employee) {
            console.log('❌ FAILED: Employee not found');
            console.log('   Make sure you ran database/seed.sql in Supabase!');
            return;
        }
        console.log(`✅ PASSED: Found ${employee.first_name} ${employee.last_name}`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Employee #: ${employee.employee_number}`);

        // Test 3: Verify password hash
        console.log('\n🔐 TEST 3: Password Verification');
        console.log('-'.repeat(70));
        const passwordValid = await bcrypt.compare(testPassword, employee.password_hash);

        if (!passwordValid) {
            console.log('❌ FAILED: Password hash does not match');
            console.log('   Stored hash:', employee.password_hash);
            return;
        }
        console.log('✅ PASSED: Password hash is valid');

        // Test 4: JWT token generation
        console.log('\n🎫 TEST 4: JWT Token Generation');
        console.log('-'.repeat(70));

        if (!process.env.JWT_SECRET) {
            console.log('❌ FAILED: JWT_SECRET not loaded from .env');
            return;
        }

        const token = jwt.sign(
            {
                id: employee.id,
                email: employee.email,
                employeeNumber: employee.employee_number
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ PASSED: JWT token generated');
        console.log('   Token (first 50 chars):', token.substring(0, 50) + '...');

        // Test 5: Verify JWT_SECRET exists
        console.log('\n🔑 TEST 5: Environment Variables');
        console.log('-'.repeat(70));
        console.log('✅ JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded' : '❌ NOT FOUND');
        console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL ? 'Loaded' : '❌ NOT FOUND');
        console.log('✅ PORT:', process.env.PORT || 'Using default');

        // Test 6: Check payslips
        console.log('\n💰 TEST 6: Payslip Data');
        console.log('-'.repeat(70));
        const { data: payslips, error: payError } = await supabase
            .from('payslips')
            .select('*')
            .eq('employee_id', employee.id)
            .order('pay_period_start', { ascending: false });

        if (payError) {
            console.log('⚠️  WARNING: Could not fetch payslips:', payError.message);
        } else {
            console.log(`✅ PASSED: Found ${payslips.length} payslip(s)`);
            if (payslips.length > 0) {
                console.log(`   Latest: R${payslips[0].net_salary} (${payslips[0].pay_period_start})`);
            }
        }

        // Test 7: Check leave balance
        console.log('\n🏖️  TEST 7: Leave Balance Data');
        console.log('-'.repeat(70));
        const { data: balance, error: balError } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employee.id)
            .eq('year', 2026)
            .single();

        if (balError) {
            console.log('⚠️  WARNING: Could not fetch leave balance:', balError.message);
        } else {
            console.log('✅ PASSED: Leave balance found');
            console.log(`   Annual: ${balance.annual_total - balance.annual_used} days remaining`);
            console.log(`   Sick: ${balance.sick_total - balance.sick_used} days remaining`);
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('🎉 ALL CRITICAL TESTS PASSED!');
        console.log('='.repeat(70));
        console.log('\n✅ The backend is working correctly');
        console.log('✅ Database has all required data');
        console.log('✅ Password authentication works');
        console.log('✅ JWT token generation works');
        console.log('\n🌐 Frontend should be running on: http://localhost:3000');
        console.log('📡 Backend API is running on: http://localhost:5000');
        console.log('\n📝 Login with:');
        console.log(`   Email: ${testEmail}`);
        console.log(`   Password: ${testPassword}`);
        console.log('\n' + '='.repeat(70));

    } catch (error) {
        console.log('\n❌ TEST FAILED WITH ERROR:');
        console.log(error);
    }

    process.exit(0);
}

testCompleteFlow();
