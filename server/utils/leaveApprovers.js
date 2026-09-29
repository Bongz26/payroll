/**
 * Leave Approval Routing Rules
 * Configures specific primary approvers and CC lists per employee group.
 */

const APPROVAL_GROUPS = {
    // Group 1: Approved by admin@thusanangfs.co.za
    // CC: manager@thusanangfs.co.za, management@thusanangfs.co.za
    admin: {
        approverEmail: 'admin@thusanangfs.co.za',
        ccEmails: ['manager@thusanangfs.co.za', 'management@thusanangfs.co.za'],
        employees: [
            'gele.mokwena@thusanang.co.za',
            'botle.nkhabu@thusanang.co.za',
            'karabelo.khakhane@thusanang.co.za',
            'lerato.sehloho@thusanang.co.za',
            'margaret.radebe@thusanang.co.za',
            'margaret.mota@thusanang.co.za',
            'masechaba.molaba@thusanang.co.za',
            'matebello.sekhele@thusanang.co.za',
            'motebang.nchapi@thusanang.co.za',
            'nthabiseng.miya@thusanang.co.za',
            'paulinah.lemphane@thusanang.co.za',
            'puleng.mofokeng@thusanang.co.za',
            'teboho.motaung@thusanang.co.za',
            'tlalane.sebetoane@thusanang.co.za'
        ]
    },

    // Group 2: Approved by manager@thusanangfs.co.za
    // CC: management@thusanangfs.co.za
    manager: {
        approverEmail: 'manager@thusanangfs.co.za',
        ccEmails: ['management@thusanangfs.co.za'],
        employees: [
            'majobo.mofokeng@thusanang.co.za',
            'admin@thusanangfs.co.za',
            'lucas.sibeko@thusanang.co.za',
            'lilahloane.nkali@thusanang.co.za',
            'sibusiso.molefe@thusanang.co.za',
            'daniel.khumpeli@thusanang.co.za',
            'nonhlanhla.mahlaba@thusanang.co.za',
            'fusi.khatoane@thusanang.co.za',
            'lebaka.tseki@thusanang.co.za',
            'refilwe.hlakotsa@thusanang.co.za'
        ]
    },

    // Group 3: Approved by fleet@thusanangfs.co.za
    // CC: management@thusanangfs.co.za
    fleet: {
        approverEmail: 'fleet@thusanangfs.co.za',
        ccEmails: ['management@thusanangfs.co.za'],
        employees: [
            'solly.khesa@thusanang.co.za',
            'tsietsi.khesa@thusanang.co.za',
            'mandla.ngwenya@thusanang.co.za',
            'joseph.nsizwana@thusanang.co.za'
        ]
    }
};

/**
 * Get approval routing details for a given applicant email.
 * Returns { approverEmail, ccEmails, allRecipients, groupKey }
 */
function getApprovalRouting(applicantEmail) {
    const cleanEmail = (applicantEmail || '').trim().toLowerCase();

    for (const [groupKey, group] of Object.entries(APPROVAL_GROUPS)) {
        if (group.employees.some(e => e.toLowerCase() === cleanEmail)) {
            const allRecipients = Array.from(new Set([group.approverEmail, ...group.ccEmails]));
            return {
                approverEmail: group.approverEmail,
                ccEmails: group.ccEmails,
                allRecipients,
                groupKey
            };
        }
    }

    // Default fallback if employee is not explicitly mapped
    const defaultApprover = 'manager@thusanangfs.co.za';
    const defaultCC = ['management@thusanangfs.co.za'];
    return {
        approverEmail: defaultApprover,
        ccEmails: defaultCC,
        allRecipients: [defaultApprover, ...defaultCC],
        groupKey: 'default'
    };
}

/**
 * Check if a manager email is allowed to approve requests for a given applicant email.
 */
function isApproverForApplicant(managerEmail, applicantEmail) {
    const routing = getApprovalRouting(applicantEmail);
    const cleanManager = (managerEmail || '').trim().toLowerCase();
    
    // Check direct match or fleet alias match for Lucas Sibeko
    if (cleanManager === routing.approverEmail.toLowerCase()) return true;
    if (routing.approverEmail === 'fleet@thusanangfs.co.za' && cleanManager === 'lucas.sibeko@thusanang.co.za') return true;
    if (routing.approverEmail === 'admin@thusanangfs.co.za' && cleanManager === 'majobo.mofokeng@thusanang.co.za') return true;
    
    // Super admins / HR directors have global approval rights
    const globalApprovers = ['admin@thusanangfs.co.za', 'sarah.dlamini@thusanangfs.co.za', 'support@thusanangfs.co.za', 'bongz.dev@thusanang.co.za'];
    if (globalApprovers.includes(cleanManager)) return true;

    return false;
}

module.exports = {
    APPROVAL_GROUPS,
    getApprovalRouting,
    isApproverForApplicant
};
