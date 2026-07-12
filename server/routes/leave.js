const express = require('express');
const { supabase } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { format, differenceInDays, parseISO, eachDayOfInterval } = require('date-fns');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// Helper to check manager role
const isManagerUser = async (employeeId) => {
    try {
        const { data: caller } = await supabase.from('employees').select('job_title, department').eq('id', employeeId).single();
        if (!caller) return false;
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
        const originalRecipients = Array.isArray(recipients) ? recipients.join(', ') : recipients;
        const msgText = originalRecipients 
            ? `[Original intended recipients: ${originalRecipients}]\n\n${text}`
            : text;

        await sendEmail({
            to: 'support@thusanangfs.co.za',
            subject,
            text: msgText,
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
        if (!balance) {
            const { data: newBalance, error: insertError } = await supabase
                .from('leave_balances')
                .insert({
                    employee_id: req.employee.id,
                    year: currentYear,
                    annual_total: 21,
                    annual_used: 0,
                    sick_total: 30,
                    sick_used: 0,
                    family_responsibility_total: 3,
                    family_responsibility_used: 0
                })
                .select()
                .single();

            if (insertError) throw insertError;

            return res.json({
                success: true,
                balance: newBalance
            });
        }

        res.json({
            success: true,
            balance
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

        // Insert leave request
        const { data: request, error } = await supabase
            .from('leave_requests')
            .insert({
                employee_id: req.employee.id,
                leave_type,
                start_date,
                end_date,
                total_days: totalDays,
                reason,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Notify managers and HR
        const managerEmails = await getManagerEmails();
        const hrEmails = await getHREmails();
        const employeeName = `${req.employee.first_name} ${req.employee.last_name}`;
        const subject = `New leave request submitted by ${employeeName}`;
        const text = `A new leave request has been submitted by ${employeeName}.\n\nType: ${leave_type}\nStart: ${start_date}\nEnd: ${end_date}\nDays: ${totalDays}\nReason: ${reason || 'Not provided'}\n\nPlease review the request in the payroll system.`;

        await notifyApprovers({
            subject,
            text,
            recipients: [...new Set([...managerEmails, ...hrEmails])]
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
        const allowed = await isManagerUser(callerId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

        const { data: requests, error } = await supabase
            .from('leave_requests')
            .select('*, employees:employee_id (id, first_name, last_name, employee_number)')
            .eq('status', 'pending')
            .is('manager_approved_by', null)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json({ success: true, requests: requests || [] });
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

        const managerName = `${req.employee.first_name} ${req.employee.last_name}`;
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

        const { data: updated, error: updErr } = await supabase
            .from('leave_requests')
            .update({ status: 'rejected', manager_approved_by: callerId, manager_approved_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single();

        if (updErr) throw updErr;

        const { data: employee } = await supabase.from('employees').select('email, first_name, last_name').eq('id', request.employee_id).single();
        if (employee) {
            await notifyApprovers({
                subject: `Leave request rejected by manager ${req.employee.first_name} ${req.employee.last_name}`,
                text: `Your leave request from ${request.start_date} to ${request.end_date} has been rejected by your manager. Please contact HR for more information.`,
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
        if (['annual', 'sick', 'family_responsibility'].includes(request.leave_type)) {
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

        const { data: updated, error: updErr } = await supabase
            .from('leave_requests')
            .update({ status: 'rejected', hr_approved_by: callerId, hr_approved_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single();

        if (updErr) throw updErr;

        const { data: employee } = await supabase.from('employees').select('email, first_name, last_name').eq('id', request.employee_id).single();
        if (employee) {
            await notifyApprovers({
                subject: `Leave request rejected by HR`,
                text: `Your leave request from ${request.start_date} to ${request.end_date} has been rejected by HR. Please contact HR for next steps.`,
                recipients: [employee.email]
            });
        }

        res.json({ success: true, message: 'Leave request rejected by HR', request: updated });

    } catch (err) {
        console.error('HR reject request error:', err);
        res.status(500).json({ success: false, message: 'Error rejecting request by HR' });
    }
});

module.exports = router;

