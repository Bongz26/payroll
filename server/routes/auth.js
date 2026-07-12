const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

/**
 * POST /api/auth/login
 * Employee login endpoint
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find employee by email
        const { data: employee, error } = await supabase
            .from('employees')
            .select('*')
            .eq('email', email)
            .eq('status', 'active')
            .single();

        if (error || !employee) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, employee.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: employee.id,
                email: employee.email,
                employeeNumber: employee.employee_number
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Return success with token and employee data (excluding password)
        const { password_hash, ...employeeData } = employee;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            employee: employeeData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

/**
 * POST /api/auth/register
 * Create a new employee. If an authenticated HR/admin user calls this, it is treated as an employee creation endpoint.
 * If no auth token is supplied, it is treated as a public self-registration endpoint.
 */
router.post('/register', async (req, res) => {
    try {
        let isAdmin = false;
        let callerId = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                callerId = decoded.id;
                const { data: caller, error: callerErr } = await supabase
                    .from('employees')
                    .select('job_title, department')
                    .eq('id', callerId)
                    .single();

                if (!callerErr && caller) {
                    isAdmin = (caller.job_title && caller.job_title.toLowerCase().includes('hr')) ||
                        (caller.department && caller.department.toLowerCase() === 'administration');
                }
            } catch (err) {
                // Ignore invalid token; continue as public registration
            }
        }

        // Extract and sanitize input
        let {
            employee_number,
            email,
            password,
            first_name,
            last_name,
            hire_date,
            department,
            job_title,
            status
        } = req.body || {};

        employee_number = (employee_number || '').toString().trim();
        email = (email || '').toString().trim().toLowerCase();
        password = (password || '').toString();
        first_name = (first_name || '').toString().trim();
        last_name = (last_name || '').toString().trim();
        hire_date = (hire_date || '').toString().trim();
        department = department ? department.toString().trim() : null;
        job_title = job_title ? job_title.toString().trim() : null;
        status = status ? status.toString().trim() : 'active';

        // Validate required input
        if (!employee_number || !email || !password || !first_name || !last_name || !hire_date) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields. Required: employee_number, email, password, first_name, last_name, hire_date'
            });
        }

        if (!isAdmin && callerId) {
            return res.status(403).json({ success: false, message: 'Only HR or admin users can create employees' });
        }

        // Basic validation rules
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        const empNumRegex = /^[A-Z0-9_-]{3,20}$/i;
        if (!empNumRegex.test(employee_number)) {
            return res.status(400).json({ success: false, message: 'Invalid employee_number format' });
        }

        // Ensure unique email and employee number
        const { data: existingEmail, error: emailErr } = await supabase
            .from('employees')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingEmail) {
            return res.status(409).json({ success: false, message: 'Email already in use' });
        }

        const { data: existingEmpNum, error: empNumErr } = await supabase
            .from('employees')
            .select('id')
            .eq('employee_number', employee_number)
            .maybeSingle();

        if (existingEmpNum) {
            return res.status(409).json({ success: false, message: 'Employee number already in use' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert employee
        const { data: newEmployee, error: insertError } = await supabase
            .from('employees')
            .insert([
                {
                    employee_number,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    department: department || null,
                    job_title: job_title || null,
                    hire_date,
                    status: status || 'active'
                }
            ])
            .select()
            .single();

        if (insertError || !newEmployee) {
            console.error('Employee insert error:', insertError);
            return res.status(500).json({ success: false, message: 'Failed to create employee' });
        }

        // Create default leave balance for the current year
        try {
            const year = new Date().getFullYear();
            await supabase.from('leave_balances').insert([
                {
                    employee_id: newEmployee.id,
                    year,
                    annual_total: 21,
                    annual_used: 0,
                    sick_total: 30,
                    sick_used: 0,
                    family_responsibility_total: 3,
                    family_responsibility_used: 0
                }
            ]);
        } catch (lbErr) {
            console.warn('Failed to create leave balance for new employee:', lbErr);
        }

        // Return created employee (exclude password_hash)
        const { password_hash: ph, ...employeeData } = newEmployee;

        res.status(201).json({ success: true, message: 'Employee created', employee: employeeData });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

/**
 * GET /api/auth/profile
 * Get current employee profile (protected route)
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const { data: employee, error } = await supabase
            .from('employees')
            .select('id, employee_number, email, first_name, last_name, department, job_title, hire_date, status')
            .eq('id', req.employee.id)
            .single();

        if (error || !employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            employee
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

module.exports = router;
