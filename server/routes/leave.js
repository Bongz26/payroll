const express = require('express');
const { supabase } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { format, differenceInDays, parseISO, eachDayOfInterval } = require('date-fns');
const { sendEmail } = require('../utils/email');
const { getApprovalRouting, isApproverForApplicant } = require('../utils/leaveApprovers');

const router = express.Router();

// Helper to check manager role
const isManagerUser = async (employeeId) => {
    try {
        const { data: caller } = await supabase.from('employees').select('email, job_title, department').eq('id', employeeId).single();
        if (!caller) return false;
        const email = (caller.email || '').toLowerCase();
        const managerEmails = ['admin@thusanangfs.co.za', 'manager@thusanangfs.co.za', 'fleet@thusanangfs.co.za', 'lucas.sibeko@thusanang.co.za', 'majobo.mofokeng@thusanang.co.za', 'matla.matsipa@thusanang.co.za', 'sarah.dlamini@thusanangfs.co.za', 'support@thusanangfs.co.za', 'bongz.dev@thusanang.co.za'];

        if (managerEmails.includes(email)) return true;
        const job = (caller.job_title || '').toLowerCase();
        const dept = (caller.department || '').toLowerCase();
        return job.includes('manager') || job.includes('director') || job.includes('supervisor') || dept === 'operations' || dept === 'administration';
    } catch (e) {
        return false;
    }
};

// Helper to check HR role
const isHRUser = async (employeeId) => {
    try {
        const { data: caller } = await supabase.from('employees').select('job_title, department').eq('id', employeeId).single();
        if (!caller) return false;
        const job = (caller.job_title || '').toLowerCase();
        const dept = (caller.department || '').toLowerCase();
        return job.includes('hr') || dept === 'administration';
    } catch (e) {
        return false;
    }
};

const getManagerEmails = async () => {
    const { data: employees } = await supabase.from('employees').select('email, job_title, department');
    return (employees || [])
        .filter(emp => {
            const job = (emp.job_title || '').toLowerCase();
            return job.includes('manager') || job.includes('director') || job.includes('supervisor');
        })
        .map(emp => emp.email)
        .filter(Boolean);
};

const getHREmails = async () => {
    const { data: employees } = await supabase.from('employees').select('email, job_title, department');
    return (employees || [])
        .filter(emp => {
            const job = (emp.job_title || '').toLowerCase();
            return job.includes('hr');
        })
        .map(emp => emp.email)
        .filter(Boolean);
};

const notifyApprovers = async ({ subject, text, html, recipients }) => {
    try {
        let recipientList = [];
        if (Array.isArray(recipients)) {
            recipientList = [...recipients];
        } else if (typeof recipients === 'string' && recipients.length > 0) {
            recipientList = [recipients];
        }

        // Ensure support@thusanangfs.co.za always receives a copy of all leave emails
        if (!recipientList.includes('support@thusanangfs.co.za')) {
            recipientList.push('support@thusanangfs.co.za');
        }

        await sendEmail({
            to: recipientList,
            subject,
            text,
            html
        });
    } catch (error) {
        console.error('Email notification failed:', error);
    }
};
/**
 * GET /api/leave/balance
 * Get leave balance for the current year
 */
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        const { data: balance, error } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', req.employee.id)
            .eq('year', currentYear)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        // If no balance exists, create default balance
        let resultBalance = balance;
        if (!resultBalance) {
            const newBalPayload = {
                employee_id: req.employee.id,
                year: currentYear,
                annual_total: 21,
                annual_used: 0,
                sick_total: 30,
                sick_used: 0,
                family_responsibility_total: 3,
                family_responsibility_used: 0,
                overtime_total: 0,
                overtime_used: 0
            };
            let { data: newBalance, error: insertError } = await supabase
                .from('leave_balances')
                .insert(newBalPayload)
                .select()
                .single();

            if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('overtime'))) {
                delete newBalPayload.overtime_total;
                delete newBalPayload.overtime_used;
                const retry = await supabase.from('leave_balances').insert(newBalPayload).select().single();
                if (retry.error) throw retry.error;
                newBalance = retry.data;
            } else if (insertError) {
                throw insertError;
            }
            resultBalance = newBalance;
        }

        // Ensure overtime numbers exist
        resultBalance = {
            ...resultBalance,
            overtime_total: parseFloat(resultBalance.overtime_total) || 0,
            overtime_used: parseFloat(resultBalance.overtime_used) || 0
        };

        res.json({
            success: true,
            balance: resultBalance
        });

    } catch (error) {
        console.error('Fetch leave balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leave balance'
        });
    }
});

/**
 * GET /api/leave/requests
 * Get all leave requests for the logged-in employee
 */
router.get('/requests', authMiddleware, async (req, res) => {
    try {
        const { data: requests, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', req.employee.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            requests: requests || []
        });

    } catch (error) {
        console.error('Fetch leave requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leave requests'
        });
    }
});

/**
 * POST /api/leave/request
 * Submit a new leave request
 */
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const { leave_type, start_date, end_date, reason } = req.body;

        // Validate input
        if (!leave_type || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Leave type, start date, and end date are required'
            });
        }

        // Calculate total days
        const startDate = parseISO(start_date);
        const endDate = parseISO(end_date);
        const totalDays = differenceInDays(endDate, startDate) + 1;

        if (totalDays <= 0) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Check leave balance for annual leave
        if (leave_type === 'annual') {
            const currentYear = new Date().getFullYear();
            const { data: balance } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('employee_id', req.employee.id)
                .eq('year', currentYear)
                .single();

            if (balance) {
                const available = balance.annual_total - balance.annual_used;
                if (totalDays > available) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient leave balance. You have ${available} days available.`
                    });
                }
            }
        }

        // Check leave balance for overtime leave
        if (leave_type === 'overtime') {
            const currentYear = new Date().getFullYear();
            const { data: balance } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('employee_id', req.employee.id)
                .eq('year', currentYear)
                .maybeSingle();

            const otTotal = parseFloat(balance?.overtime_total) || 0;
            const otUsed = parseFloat(balance?.overtime_used) || 0;
            const available = Math.max(0, otTotal - otUsed);

            if (available <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'You have no available overtime leave balance. Overtime leave must be allocated manually by your manager.'
                });
            }

            if (totalDays > available) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient overtime leave balance. You have ${available} days available, but requested ${totalDays} days.`
                });
            }
        }

        // Handle sick note / document upload if provided
        let attachmentUrl = null;
        if (req.body.attachmentData) {
            try {
                const base64Data = req.body.attachmentData.replace(/^data:[^;]+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const origName = req.body.attachmentName || 'document.pdf';
                const ext = origName.split('.').pop() || 'pdf';
                const fileName = `sicknote_${req.employee.id}_${Date.now()}.${ext}`;
                const contentType = req.body.attachmentType || 'application/octet-stream';

                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('sick-notes')
                    .upload(fileName, buffer, { contentType, upsert: true });

                if (!uploadErr && uploadData) {
                    const { data: publicUrlData } = supabase.storage
                        .from('sick-notes')
                        .getPublicUrl(fileName);
                    attachmentUrl = publicUrlData.publicUrl;
                } else if (uploadErr) {
                    console.error('Sick note upload error:', uploadErr);
                }
            } catch (attErr) {
                console.error('Error processing attachment:', attErr);
            }
        }

        // Prepare insert payload
        const insertPayload = {
            employee_id: req.employee.id,
            leave_type,
            start_date,
            end_date,
            total_days: totalDays,
            reason: attachmentUrl ? `${reason || ''}\n\n[Attached Document]: ${attachmentUrl}`.trim() : reason,
            status: 'pending'
        };

        if (attachmentUrl) {
            insertPayload.attachment_url = attachmentUrl;
        }

        let request;
        let { data: insData, error: insErr } = await supabase
            .from('leave_requests')
            .insert(insertPayload)
            .select()
            .single();

        if (insErr && insErr.code === 'PGRST204') {
            delete insertPayload.attachment_url;
            const retry = await supabase
                .from('leave_requests')
                .insert(insertPayload)
                .select()
                .single();
            if (retry.error) throw retry.error;
            request = retry.data;
        } else if (insErr && insErr.message?.includes('leave_requests_leave_type_check')) {
            return res.status(400).json({
                success: false,
                message: 'Overtime leave requires running the database migration. Please execute database/migration-add-overtime-leave.sql in the Supabase SQL editor.'
            });
        } else if (insErr) {
            throw insErr;
        } else {
            request = insData;
        }

        // Fetch employee details for the email
        const { data: empData } = await supabase
            .from('employees')
            .select('first_name, last_name')
            .eq('id', req.employee.id)
            .single();

        const employeeName = empData 
            ? `${empData.first_name} ${empData.last_name}` 
            : req.employee.email;

        // Route leave request notification to assigned primary approver and CC list
        const routing = getApprovalRouting(req.employee.email);
        const subject = `New leave request submitted by ${employeeName}`;
        const text = `A new leave request has been submitted by ${employeeName}.\n\n` +
            `Type: ${leave_type}\n` +
            `Start: ${start_date}\n` +
            `End: ${end_date}\n` +
            `Days: ${totalDays}\n` +
            `Reason: ${reason || 'Not provided'}\n` +
            (attachmentUrl ? `Sick Note / Document: ${attachmentUrl}\n` : '') +
            `\nApprover: ${routing.approverEmail}\n` +
            `CC: ${routing.ccEmails.join(', ')}\n\n` +
            `Please review the request in the payroll system.`;

        await notifyApprovers({
            subject,
            text,
            recipients: routing.allRecipients
        });

        res.status(201).json({
            success: true,
            message: 'Leave request submitted successfully',
            request
        });

    } catch (error) {
        console.error('Submit leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting leave request'
        });
    }
});

/**
 * GET /api/leave/calendar
 * Get calendar data showing employee availability
 */
router.get('/calendar', authMiddleware, async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        // Get all approved leave requests for the specified month
        const startOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const endOfMonth = new Date(targetYear, targetMonth, 0);
        const endDate = format(endOfMonth, 'yyyy-MM-dd');

        const { data: leaveRequests, error } = await supabase
            .from('leave_requests')
            .select(`
        *,
        employees:employee_id (
          first_name,
          last_name,
          employee_number
        )
      `)
            .eq('status', 'approved')
            .gte('end_date', startOfMonth)
            .lte('start_date', endDate);

        if (error) throw error;

        // Format calendar data
        const calendarData = {};

        leaveRequests?.forEach(request => {
            const start = parseISO(request.start_date);
            const end = parseISO(request.end_date);
            const days = eachDayOfInterval({ start, end });

            days.forEach(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                if (!calendarData[dateKey]) {
                    calendarData[dateKey] = [];
                }
                calendarData[dateKey].push({
                    employee: `${request.employees.first_name} ${request.employees.last_name}`,
                    employeeNumber: request.employees.employee_number,
                    leaveType: request.leave_type
                });
            });
        });

        res.json({
            success: true,
            calendarData,
            month: targetMonth,
            year: targetYear
        });

    } catch (error) {
        console.error('Fetch calendar error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching calendar data'
        });
    }
});

/**
 * GET /api/leave/pending
 * Manager: get pending leave requests
 */
router.get('/pending', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const callerEmail = req.employee.email;
        const allowed = await isManagerUser(callerId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const { data: requests, error } = await supabase
            .from('leave_requests')
            .select('*, employees:employee_id (id, first_name, last_name, employee_number, email)')
            .eq('status', 'pending')
            .is('manager_approved_by', null)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Filter requests that the logged-in manager is authorized to approve
        const filteredRequests = (requests || []).filter(reqItem => {
            const applicantEmail = reqItem.employees?.email;
            return isApproverForApplicant(callerEmail, applicantEmail);
        });

        res.json({ success: true, requests: filteredRequests });
    } catch (err) {
        console.error('Fetch pending requests error:', err);
        res.status(500).json({ success: false, message: 'Error fetching pending requests' });
    }
});


/**
 * GET /api/leave/pending/hr
 * HR: get leave requests approved by manager and waiting for HR approval
 */
router.get('/pending/hr', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const allowed = await isHRUser(callerId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const { data: requests, error } = await supabase
            .from('leave_requests')
            .select('*, employees:employee_id (id, first_name, last_name, employee_number)')
            .eq('status', 'pending')
            .not('manager_approved_by', 'is', null)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json({ success: true, requests: requests || [] });
    } catch (err) {
        console.error('Fetch HR pending requests error:', err);
        res.status(500).json({ success: false, message: 'Error fetching HR pending requests' });
    }
});


/**
 * POST /api/leave/request/:id/approve
 * Manager approves a leave request
 */
router.post('/request/:id/approve', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const allowed = await isManagerUser(callerId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const requestId = req.params.id;
        const { data: request, error: reqErr } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', requestId)
            .maybeSingle();

        if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });

        if (request.status !== 'pending' || request.manager_approved_by) {
            return res.status(400).json({ success: false, message: 'Leave request is not pending manager approval' });
        }

        const { data: updated, error: updErr } = await supabase
            .from('leave_requests')
            .update({
                manager_approved_by: callerId,
                manager_approved_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .select()
            .single();

        if (updErr) throw updErr;

        const { data: managerData } = await supabase.from('employees').select('first_name, last_name').eq('id', callerId).single();
        const managerName = managerData ? `${managerData.first_name} ${managerData.last_name}` : req.employee.email;
        const { data: employee } = await supabase.from('employees').select('email, first_name, last_name').eq('id', request.employee_id).single();
        const hrEmails = await getHREmails();

        if (employee) {
            await notifyApprovers({
                subject: `Leave request approved by manager ${managerName}`,
                text: `Your leave request from ${request.start_date} to ${request.end_date} has been approved by ${managerName} and is now awaiting HR review.`,
                recipients: [employee.email]
            });
        }

        await notifyApprovers({
            subject: `Leave request ready for HR approval - ${employee?.first_name} ${employee?.last_name}`,
            text: `The leave request submitted by ${employee?.first_name} ${employee?.last_name} has been approved by manager ${managerName} and awaits HR approval.`,
            recipients: hrEmails
        });

        res.json({ success: true, message: 'Leave request approved by manager and sent to HR for final review', request: updated });

    } catch (err) {
        console.error('Approve request error:', err);
        res.status(500).json({ success: false, message: 'Error approving request' });
    }
});


/**
 * POST /api/leave/request/:id/reject
 * Manager rejects a leave request
 */
router.post('/request/:id/reject', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const allowed = await isManagerUser(callerId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const requestId = req.params.id;
        const { data: request } = await supabase.from('leave_requests').select('*').eq('id', requestId).maybeSingle();
        if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });
        if (request.status !== 'pending' || request.manager_approved_by) return res.status(400).json({ success: false, message: 'Leave request is not pending manager approval' });

        const { rejection_reason } = req.body;
        const { data: updated, error: updErr } = await supabase
            .from('leave_requests')
            .update({ 
                status: 'rejected', 
                manager_approved_by: callerId, 
                manager_approved_at: new Date().toISOString(),
                rejection_reason: rejection_reason || null 
            })
            .eq('id', requestId)
            .select()
            .single();

        if (updErr) throw updErr;

        const { data: employee } = await supabase.from('employees').select('email, first_name, last_name').eq('id', request.employee_id).single();
        const { data: managerData } = await supabase.from('employees').select('first_name, last_name').eq('id', callerId).single();
        const managerName = managerData ? `${managerData.first_name} ${managerData.last_name}` : req.employee.email;

        if (employee) {
            await notifyApprovers({
                subject: `Leave request rejected by manager ${managerName}`,
                text: `Your leave request from ${request.start_date} to ${request.end_date} has been rejected by your manager.\n\nReason: ${rejection_reason || 'No reason provided.'}\n\nPlease contact HR for more information.`,
                recipients: [employee.email]
            });
        }

        res.json({ success: true, message: 'Leave request rejected by manager', request: updated });

    } catch (err) {
        console.error('Reject request error:', err);
        res.status(500).json({ success: false, message: 'Error rejecting request' });
    }
});


/**
 * POST /api/leave/request/:id/hr-approve
 * HR approves a leave request after manager approval
 */
router.post('/request/:id/hr-approve', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const allowed = await isHRUser(callerId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const requestId = req.params.id;
        const { data: request } = await supabase.from('leave_requests').select('*').eq('id', requestId).maybeSingle();
        if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });
        if (request.status !== 'pending' || !request.manager_approved_by) return res.status(400).json({ success: false, message: 'Leave request is not pending HR approval' });

        const year = new Date(request.start_date).getFullYear();
        if (['annual', 'sick', 'family_responsibility', 'overtime'].includes(request.leave_type)) {
            const { data: balance } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('employee_id', request.employee_id)
                .eq('year', year)
                .maybeSingle();

            if (balance) {
                let updates = {};
                if (request.leave_type === 'annual') {
                    const available = balance.annual_total - balance.annual_used;
                    if (request.total_days > available) return res.status(400).json({ success: false, message: 'Insufficient annual balance at HR approval time' });
                    updates.annual_used = (parseFloat(balance.annual_used) || 0) + request.total_days;
                }
                if (request.leave_type === 'sick') {
                    const available = balance.sick_total - balance.sick_used;
                    if (request.total_days > available) return res.status(400).json({ success: false, message: 'Insufficient sick balance at HR approval time' });
                    updates.sick_used = (parseFloat(balance.sick_used) || 0) + request.total_days;
                }
                if (request.leave_type === 'family_responsibility') {
                    const available = balance.family_responsibility_total - balance.family_responsibility_used;
                    if (request.total_days > available) return res.status(400).json({ success: false, message: 'Insufficient family responsibility balance at HR approval time' });
                    updates.family_responsibility_used = (parseFloat(balance.family_responsibility_used) || 0) + request.total_days;
                }
                if (request.leave_type === 'overtime') {
                    const available = (parseFloat(balance.overtime_total) || 0) - (parseFloat(balance.overtime_used) || 0);
                    if (request.total_days > available) return res.status(400).json({ success: false, message: 'Insufficient overtime balance at HR approval time' });
                    updates.overtime_used = (parseFloat(balance.overtime_used) || 0) + request.total_days;
                }

                if (Object.keys(updates).length) {
                    await supabase.from('leave_balances').update(updates).eq('id', balance.id);
                }
            }
        }

        const { data: updated, error: updErr } = await supabase
            .from('leave_requests')
            .update({
                status: 'approved',
                approved_by: callerId,
                approved_at: new Date().toISOString(),
                hr_approved_by: callerId,
                hr_approved_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .select()
            .single();

        if (updErr) throw updErr;

        const manager = await supabase.from('employees').select('email, first_name, last_name').eq('id', request.manager_approved_by).maybeSingle();
        const employee = await supabase.from('employees').select('email, first_name, last_name').eq('id', request.employee_id).maybeSingle();

        if (employee.data) {
            await notifyApprovers({
                subject: `Leave request approved by HR`,
                text: `Your leave request from ${request.start_date} to ${request.end_date} has been approved by HR.`,
                recipients: [employee.data.email]
            });
        }

        if (manager.data) {
            await notifyApprovers({
                subject: `Leave request approved by HR`,
                text: `The leave request for ${employee.data.first_name} ${employee.data.last_name} has been approved by HR.`,
                recipients: [manager.data.email]
            });
        }

        res.json({ success: true, message: 'Leave request approved by HR', request: updated });

    } catch (err) {
        console.error('HR approve request error:', err);
        res.status(500).json({ success: false, message: 'Error approving request by HR' });
    }
});


/**
 * POST /api/leave/request/:id/hr-reject
 * HR rejects a leave request after manager approval
 */
router.post('/request/:id/hr-reject', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const allowed = await isHRUser(callerId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const requestId = req.params.id;
        const { data: request } = await supabase.from('leave_requests').select('*').eq('id', requestId).maybeSingle();
        if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });
        if (request.status !== 'pending' || !request.manager_approved_by) return res.status(400).json({ success: false, message: 'Leave request is not pending HR approval' });

        const { rejection_reason } = req.body;
        const { data: updated, error: updErr } = await supabase
            .from('leave_requests')
            .update({ 
                status: 'rejected', 
                hr_approved_by: callerId, 
                hr_approved_at: new Date().toISOString(),
                rejection_reason: rejection_reason || null
            })
            .eq('id', requestId)
            .select()
            .single();

        if (updErr) throw updErr;

        const { data: employee } = await supabase.from('employees').select('email, first_name, last_name').eq('id', request.employee_id).single();
        if (employee) {
            await notifyApprovers({
                subject: `Leave request rejected by HR`,
                text: `Your leave request from ${request.start_date} to ${request.end_date} has been rejected by HR.\n\nReason: ${rejection_reason || 'No reason provided.'}\n\nPlease contact HR for next steps.`,
                recipients: [employee.email]
            });
        }

        res.json({ success: true, message: 'Leave request rejected by HR', request: updated });

    } catch (err) {
        console.error('HR reject request error:', err);
        res.status(500).json({ success: false, message: 'Error rejecting request by HR' });
    }
});

/**
 * GET /api/leave/employees
 * Manager / HR: Get list of active employees with their current overtime balance
 */
router.get('/employees', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const callerEmail = (req.employee.email || '').toLowerCase();
        const allowed = (await isManagerUser(callerId)) || (await isHRUser(callerId));
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const { data: employees, error } = await supabase
            .from('employees')
            .select('id, employee_number, first_name, last_name, email, department, job_title')
            .eq('status', 'active')
            .order('first_name', { ascending: true });

        if (error) throw error;

        // Fetch current year balances
        const currentYear = new Date().getFullYear();
        const { data: balances } = await supabase
            .from('leave_balances')
            .select('employee_id, overtime_total, overtime_used, annual_total, annual_used')
            .eq('year', currentYear);

        const balanceMap = {};
        (balances || []).forEach(b => {
            balanceMap[b.employee_id] = b;
        });

        const enriched = (employees || []).map(emp => {
            const b = balanceMap[emp.id] || {};
            const otTotal = parseFloat(b.overtime_total) || 0;
            const otUsed = parseFloat(b.overtime_used) || 0;
            return {
                ...emp,
                overtime_total: otTotal,
                overtime_used: otUsed,
                overtime_available: Math.max(0, otTotal - otUsed),
                isManagedByCaller: isApproverForApplicant(callerEmail, emp.email)
            };
        });

        res.json({ success: true, employees: enriched });
    } catch (err) {
        console.error('Fetch employees for leave management error:', err);
        res.status(500).json({ success: false, message: 'Error fetching employees' });
    }
});

/**
 * POST /api/leave/overtime/allocate
 * Manager / HR: Manually credit overtime leave days to an employee
 */
router.post('/overtime/allocate', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const allowed = (await isManagerUser(callerId)) || (await isHRUser(callerId));
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied. Only managers or HR can allocate overtime leave.' });

        const { employee_id, days, reason, date_worked } = req.body;
        if (!employee_id || !days || !reason) {
            return res.status(400).json({ success: false, message: 'Employee, number of days, and reason are required' });
        }

        const parsedDays = parseFloat(days);
        if (isNaN(parsedDays) || parsedDays <= 0) {
            return res.status(400).json({ success: false, message: 'Days must be a positive number' });
        }

        // Verify target employee exists
        const { data: targetEmployee, error: empErr } = await supabase
            .from('employees')
            .select('id, first_name, last_name, email')
            .eq('id', employee_id)
            .single();

        if (empErr || !targetEmployee) {
            return res.status(404).json({ success: false, message: 'Target employee not found' });
        }

        const currentYear = new Date().getFullYear();
        const { data: balance } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employee_id)
            .eq('year', currentYear)
            .maybeSingle();

        let updatedTotal = parsedDays;
        let currentUsed = 0;

        if (balance) {
            updatedTotal = (parseFloat(balance.overtime_total) || 0) + parsedDays;
            currentUsed = parseFloat(balance.overtime_used) || 0;
            const { error: updErr } = await supabase
                .from('leave_balances')
                .update({ overtime_total: updatedTotal })
                .eq('id', balance.id);

            if (updErr && updErr.code === 'PGRST204') {
                return res.status(400).json({
                    success: false,
                    message: 'Database update required: please run database/migration-add-overtime-leave.sql in the Supabase SQL editor.'
                });
            } else if (updErr) {
                throw updErr;
            }
        } else {
            const newBalPayload = {
                employee_id,
                year: currentYear,
                annual_total: 21,
                annual_used: 0,
                sick_total: 30,
                sick_used: 0,
                family_responsibility_total: 3,
                family_responsibility_used: 0,
                overtime_total: parsedDays,
                overtime_used: 0
            };
            const { error: insErr } = await supabase
                .from('leave_balances')
                .insert(newBalPayload);

            if (insErr) throw insErr;
        }

        // Record in overtime_allocations audit table
        try {
            await supabase.from('overtime_allocations').insert({
                employee_id,
                allocated_by: callerId,
                days: parsedDays,
                reason,
                date_worked: date_worked || null
            });
        } catch (auditErr) {
            console.warn('Overtime allocation audit insert note:', auditErr.message);
        }

        // Fetch manager details
        const { data: managerData } = await supabase
            .from('employees')
            .select('first_name, last_name, email')
            .eq('id', callerId)
            .single();

        const managerName = managerData ? `${managerData.first_name} ${managerData.last_name}` : req.employee.email;

        // Send email notification to employee
        await notifyApprovers({
            subject: `Overtime Leave Credited: ${parsedDays} Day(s) by ${managerName}`,
            text: `Hello ${targetEmployee.first_name},\n\n` +
                `Manager ${managerName} has credited ${parsedDays} day(s) of Overtime Leave to your balance.\n\n` +
                `Reason: ${reason}\n` +
                `Date Worked: ${date_worked || 'Not specified'}\n` +
                `New Overtime Balance: ${(updatedTotal - currentUsed).toFixed(1)} days available\n\n` +
                `You can view your balance and submit leave requests in the Thusanang Payroll portal.`,
            recipients: [targetEmployee.email]
        });

        res.json({
            success: true,
            message: `Successfully allocated ${parsedDays} day(s) of overtime leave to ${targetEmployee.first_name} ${targetEmployee.last_name}.`,
            balance: {
                overtime_total: updatedTotal,
                overtime_used: currentUsed,
                overtime_available: Math.max(0, updatedTotal - currentUsed)
            }
        });
    } catch (error) {
        console.error('Allocate overtime error:', error);
        res.status(500).json({ success: false, message: 'Error allocating overtime leave' });
    }
});

/**
 * POST /api/leave/overtime/record-leave
 * Manager / HR: Directly log/record overtime leave taken for an employee
 */
router.post('/overtime/record-leave', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const allowed = (await isManagerUser(callerId)) || (await isHRUser(callerId));
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied. Only managers or HR can record overtime leave.' });

        const { employee_id, start_date, end_date, reason } = req.body;
        if (!employee_id || !start_date || !end_date) {
            return res.status(400).json({ success: false, message: 'Employee, start date, and end date are required' });
        }

        const startDate = parseISO(start_date);
        const endDate = parseISO(end_date);
        const totalDays = differenceInDays(endDate, startDate) + 1;

        if (totalDays <= 0) {
            return res.status(400).json({ success: false, message: 'End date must be after start date' });
        }

        const { data: targetEmployee, error: empErr } = await supabase
            .from('employees')
            .select('id, first_name, last_name, email')
            .eq('id', employee_id)
            .single();

        if (empErr || !targetEmployee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        const currentYear = new Date(start_date).getFullYear();
        const { data: balance } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employee_id)
            .eq('year', currentYear)
            .maybeSingle();

        const overtimeTotal = parseFloat(balance?.overtime_total) || 0;
        const overtimeUsed = parseFloat(balance?.overtime_used) || 0;

        // If employee doesn't have sufficient overtime balance, auto-credit the difference so manager can directly book it
        let newTotal = overtimeTotal;
        if (overtimeTotal - overtimeUsed < totalDays) {
            newTotal = overtimeUsed + totalDays;
        }
        const newUsed = overtimeUsed + totalDays;

        if (balance) {
            await supabase
                .from('leave_balances')
                .update({ overtime_total: newTotal, overtime_used: newUsed })
                .eq('id', balance.id);
        } else {
            await supabase.from('leave_balances').insert({
                employee_id,
                year: currentYear,
                annual_total: 21,
                annual_used: 0,
                sick_total: 30,
                sick_used: 0,
                family_responsibility_total: 3,
                family_responsibility_used: 0,
                overtime_total: newTotal,
                overtime_used: newUsed
            });
        }

        const now = new Date().toISOString();
        const { data: leaveReq, error: reqErr } = await supabase
            .from('leave_requests')
            .insert({
                employee_id,
                leave_type: 'overtime',
                start_date,
                end_date,
                total_days: totalDays,
                reason: reason || 'Overtime leave manually booked by manager',
                status: 'approved',
                manager_approved_by: callerId,
                manager_approved_at: now,
                hr_approved_by: callerId,
                hr_approved_at: now,
                approved_by: callerId,
                approved_at: now
            })
            .select()
            .single();

        if (reqErr && reqErr.message?.includes('leave_requests_leave_type_check')) {
            return res.status(400).json({
                success: false,
                message: 'Overtime leave requires running the database migration. Please execute database/migration-add-overtime-leave.sql in the Supabase SQL editor.'
            });
        } else if (reqErr) {
            throw reqErr;
        }

        const { data: managerData } = await supabase
            .from('employees')
            .select('first_name, last_name, email')
            .eq('id', callerId)
            .single();
        const managerName = managerData ? `${managerData.first_name} ${managerData.last_name}` : req.employee.email;

        // Notify employee
        await notifyApprovers({
            subject: `Overtime Leave Booked by Manager ${managerName}`,
            text: `Hello ${targetEmployee.first_name},\n\n` +
                `Manager ${managerName} has scheduled an Overtime Leave off for you:\n\n` +
                `Period: ${start_date} to ${end_date} (${totalDays} day(s))\n` +
                `Reason: ${reason || 'Overtime leave taken'}\n` +
                `Status: Approved\n\n` +
                `This has been scheduled in your Thusanang Payroll calendar.`,
            recipients: [targetEmployee.email]
        });

        res.json({
            success: true,
            message: `Successfully booked ${totalDays} day(s) of overtime leave for ${targetEmployee.first_name} ${targetEmployee.last_name}.`,
            request: leaveReq
        });
    } catch (error) {
        console.error('Record overtime leave error:', error);
        res.status(500).json({ success: false, message: 'Error recording overtime leave' });
    }
});

/**
 * GET /api/leave/overtime/allocations
 * Get overtime allocations history
 */
router.get('/overtime/allocations', authMiddleware, async (req, res) => {
    try {
        const callerId = req.employee.id;
        const isMgr = (await isManagerUser(callerId)) || (await isHRUser(callerId));

        let query = supabase
            .from('overtime_allocations')
            .select(`
                *,
                employees:employee_id (id, first_name, last_name, employee_number, email),
                allocators:allocated_by (id, first_name, last_name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!isMgr) {
            query = query.eq('employee_id', callerId);
        }

        const { data: allocations, error } = await query;
        if (error) {
            return res.json({ success: true, allocations: [] });
        }

        res.json({ success: true, allocations: allocations || [] });
    } catch (err) {
        console.error('Fetch overtime allocations error:', err);
        res.json({ success: true, allocations: [] });
    }
});

module.exports = router;


