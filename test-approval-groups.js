#!/usr/bin/env node
/**
 * Test Leave Approval Routing Groups
 */
const { getApprovalRouting, isApproverForApplicant } = require('./server/utils/leaveApprovers');

function testRouting() {
    console.log('='.repeat(65));
    console.log('  TESTING LEAVE APPROVAL ROUTING GROUPS');
    console.log('='.repeat(65));

    const testCases = [
        // Group 1
        { name: 'Gele Mokwena', email: 'gele.mokwena@thusanang.co.za', expectedApprover: 'admin@thusanangfs.co.za', expectedCCCount: 2 },
        { name: 'Lerato Sehloho', email: 'lerato.sehloho@thusanang.co.za', expectedApprover: 'admin@thusanangfs.co.za', expectedCCCount: 2 },
        { name: 'Tlalane Sebetoane', email: 'tlalane.sebetoane@thusanang.co.za', expectedApprover: 'admin@thusanangfs.co.za', expectedCCCount: 2 },

        // Group 2
        { name: 'Majobo Mofokeng', email: 'majobo.mofokeng@thusanang.co.za', expectedApprover: 'manager@thusanangfs.co.za', expectedCCCount: 1 },
        { name: 'Lucas Sibeko', email: 'lucas.sibeko@thusanang.co.za', expectedApprover: 'manager@thusanangfs.co.za', expectedCCCount: 1 },
        { name: 'Refilwe Hlakotsa', email: 'refilwe.hlakotsa@thusanang.co.za', expectedApprover: 'manager@thusanangfs.co.za', expectedCCCount: 1 },

        // Group 3
        { name: 'Solly Khesa', email: 'solly.khesa@thusanang.co.za', expectedApprover: 'fleet@thusanangfs.co.za', expectedCCCount: 1 },
        { name: 'Mandla Ngwenya', email: 'mandla.ngwenya@thusanang.co.za', expectedApprover: 'fleet@thusanangfs.co.za', expectedCCCount: 1 },
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(tc => {
        const route = getApprovalRouting(tc.email);
        const matchApprover = route.approverEmail === tc.expectedApprover;
        const matchCC = route.ccEmails.length === tc.expectedCCCount;

        if (matchApprover && matchCC) {
            console.log(`✅ [${tc.name}] (${tc.email})`);
            console.log(`   Approver: ${route.approverEmail}`);
            console.log(`   CC:       ${route.ccEmails.join(', ')}`);
            passed++;
        } else {
            console.log(`❌ [${tc.name}] (${tc.email}) — EXPECTED ${tc.expectedApprover}, GOT ${route.approverEmail}`);
            failed++;
        }
    });

    console.log('\n' + '='.repeat(65));
    console.log('  TESTING APPROVER PERMISSIONS');
    console.log('='.repeat(65));

    const permissionTests = [
        { manager: 'admin@thusanangfs.co.za', applicant: 'gele.mokwena@thusanang.co.za', expected: true },
        { manager: 'manager@thusanangfs.co.za', applicant: 'refilwe.hlakotsa@thusanang.co.za', expected: true },
        { manager: 'fleet@thusanangfs.co.za', applicant: 'solly.khesa@thusanang.co.za', expected: true },
        { manager: 'lucas.sibeko@thusanang.co.za', applicant: 'solly.khesa@thusanang.co.za', expected: true }, // Fleet alias
        { manager: 'fleet@thusanangfs.co.za', applicant: 'gele.mokwena@thusanang.co.za', expected: false },
    ];

    permissionTests.forEach(pt => {
        const result = isApproverForApplicant(pt.manager, pt.applicant);
        if (result === pt.expected) {
            console.log(`✅ Manager ${pt.manager} -> Applicant ${pt.applicant}: ${result}`);
            passed++;
        } else {
            console.log(`❌ Manager ${pt.manager} -> Applicant ${pt.applicant}: Expected ${pt.expected}, got ${result}`);
            failed++;
        }
    });

    console.log('\n' + '='.repeat(65));
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(65));
}

testRouting();
