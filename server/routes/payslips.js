const express = require('express');
const { supabase } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * GET /api/payslips
 * Get all payslips for the logged-in employee
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data: payslips, error } = await supabase
            .from('payslips')
            .select('*')
            .eq('employee_id', req.employee.id)
            .order('payment_date', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            payslips: payslips || []
        });

    } catch (error) {
        console.error('Fetch payslips error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payslips'
        });
    }
});

/**
 * GET /api/payslips/:id
 * Get specific payslip details
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: payslip, error } = await supabase
            .from('payslips')
            .select(`
        *,
        employees:employee_id (
          employee_number,
          first_name,
          last_name,
          department,
          job_title
        )
      `)
            .eq('id', id)
            .eq('employee_id', req.employee.id)
            .single();

        if (error || !payslip) {
            return res.status(404).json({
                success: false,
                message: 'Payslip not found'
            });
        }

        res.json({
            success: true,
            payslip
        });

    } catch (error) {
        console.error('Fetch payslip error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payslip'
        });
    }
});

/**
 * GET /api/payslips/:id/download
 * Generate and download payslip as PDF
 */
router.get('/:id/download', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch payslip with employee details
        const { data: payslip, error } = await supabase
            .from('payslips')
            .select(`
        *,
        employees:employee_id (
          employee_number,
          first_name,
          last_name,
          department,
          job_title
        )
      `)
            .eq('id', id)
            .eq('employee_id', req.employee.id)
            .single();

        if (error || !payslip) {
            return res.status(404).json({
                success: false,
                message: 'Payslip not found'
            });
        }

        // Generate PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslip.pay_period_start}.pdf`);

        doc.pipe(res);

        // Header with company info
        doc.fontSize(20).fillColor('#D4145A').text('THUSANANG FUNERAL SERVICES', { align: 'center' });
        doc.fontSize(10).fillColor('#000000').text('Payslip', { align: 'center' });
        doc.moveDown(2);

        // Employee information
        doc.fontSize(12).fillColor('#333333');
        doc.text(`Employee: ${payslip.employees.first_name} ${payslip.employees.last_name}`);
        doc.text(`Employee Number: ${payslip.employees.employee_number}`);
        doc.text(`Department: ${payslip.employees.department || 'N/A'}`);
        doc.text(`Position: ${payslip.employees.job_title || 'N/A'}`);
        doc.moveDown();

        // Pay period information
        doc.text(`Pay Period: ${payslip.pay_period_start} to ${payslip.pay_period_end}`);
        doc.text(`Payment Date: ${payslip.payment_date}`);
        doc.moveDown(2);

        // Earnings section
        doc.fontSize(14).fillColor('#D4145A').text('EARNINGS');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(11).fillColor('#000000');
        doc.text(`Gross Salary:`, 50, doc.y, { continued: true });
        doc.text(`R ${parseFloat(payslip.gross_salary).toFixed(2)}`, { align: 'right' });
        doc.moveDown(2);

        // Deductions section
        doc.fontSize(14).fillColor('#D4145A').text('DEDUCTIONS');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(11).fillColor('#000000');
        const deductions = payslip.deductions || {};
        let totalDeductions = 0;

        Object.entries(deductions).forEach(([key, value]) => {
            const amount = parseFloat(value);
            totalDeductions += amount;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            doc.text(`${label}:`, 50, doc.y, { continued: true });
            doc.text(`R ${amount.toFixed(2)}`, { align: 'right' });
        });

        doc.moveDown();
        doc.text(`Total Deductions:`, 50, doc.y, { continued: true, underline: true });
        doc.text(`R ${totalDeductions.toFixed(2)}`, { align: 'right', underline: true });
        doc.moveDown(2);

        // Net pay section
        doc.fontSize(16).fillColor('#D4145A');
        doc.rect(50, doc.y, 495, 50).fill('#F0F0F0');
        doc.fillColor('#000000');
        doc.text(`NET PAY:`, 60, doc.y + 15, { continued: true });
        doc.fontSize(18).fillColor('#D4145A').text(`R ${parseFloat(payslip.net_salary).toFixed(2)}`, { align: 'right' });

        // Footer
        doc.fontSize(8).fillColor('#666666');
        doc.text('Developed by Dondas Tech', 50, 750, { align: 'center' });

        doc.end();

    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating PDF'
        });
    }
});

module.exports = router;
