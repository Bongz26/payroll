const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Railway / Render reverse proxy so rate limiting uses real client IP
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter — auth routes: max 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' }
});

// General API limiter — 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Thusanang Payroll System API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/payslips', apiLimiter, require('./routes/payslips'));
app.use('/api/leave', apiLimiter, require('./routes/leave'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        // Only expose error details in development
        ...(process.env.NODE_ENV !== 'production' && { error: err.message })
    });
});

// Start server
const startServer = async () => {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.error('⚠️  Warning: Database connection failed. Please check your Supabase configuration.');
    }

    app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log('🚀 Thusanang Funeral Services - Payroll System');
        console.log('   Developed by Dondas Tech');
        console.log('='.repeat(50));
        console.log(`📡 Server running on http://localhost:${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🗄️  Database: ${dbConnected ? 'Connected' : 'Not Connected'}`);
        console.log('='.repeat(50));
    });
};

startServer();

module.exports = app;
