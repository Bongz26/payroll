import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';

const Dashboard = () => {
    const { employee } = useAuth();
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [latestPayslip, setLatestPayslip] = useState(null);
    const [recentLeaveRequests, setRecentLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [balanceRes, payslipsRes, leaveRes] = await Promise.all([
                    api.get('/leave/balance'),
                    api.get('/payslips'),
                    api.get('/leave/requests?limit=3'),
                ]);

                setLeaveBalance(balanceRes.data.balance);
                setLatestPayslip(payslipsRes.data.payslips[0]);
                setRecentLeaveRequests(leaveRes.data.requests?.slice(0, 3) || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="loading-overlay">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div className="container" style={styles.container}>
                {/* Welcome Header */}
                <div style={styles.header} className="fade-in">
                    <div>
                        <h1 style={styles.welcomeTitle}>
                            Welcome back, {employee?.first_name}! 👋
                        </h1>
                        <p style={styles.welcomeSubtitle}>
                            {employee?.department} • {employee?.job_title}
                        </p>
                    </div>
                    <div style={styles.employeeNumber}>
                        <span style={styles.label}>Employee #</span>
                        <span style={styles.value}>{employee?.employee_number}</span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div style={styles.statsGrid} className="fade-in">
                    {/* Leave Balance Card */}
                    <Link to="/leave" className="card" style={styles.statCard}>
                        <div style={styles.statIcon}>
                            <img src="/assets/annual_leave.png" alt="Annual Leave" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                        </div>
                        <div>
                            <h3 style={styles.statTitle}>Annual Leave</h3>
                            <p style={styles.statValue}>
                                {leaveBalance ? (
                                    <>
                                        {(leaveBalance.annual_total - leaveBalance.annual_used).toFixed(1)} days
                                        <span style={styles.statSubtext}> available</span>
                                    </>
                                ) : (
                                    'Loading...'
                                )}
                            </p>
                        </div>
                    </Link>

                    {/* Latest Payslip Card */}
                    <Link to="/payslips" className="card" style={styles.statCard}>
                        <div style={styles.statIcon}>
                            <img src="/assets/payslip.png" alt="Latest Payslip" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                        </div>
                        <div>
                            <h3 style={styles.statTitle}>Latest Payslip</h3>
                            <p style={styles.statValue}>
                                {latestPayslip ? (
                                    <>
                                        R {parseFloat(latestPayslip.net_salary).toFixed(2)}
                                        <span style={styles.statSubtext}>
                                            {' '}• {format(new Date(latestPayslip.payment_date), 'MMM yyyy')}
                                        </span>
                                    </>
                                ) : (
                                    'No payslips'
                                )}
                            </p>
                        </div>
                    </Link>

                    {/* Sick Leave Card */}
                    <div className="card" style={styles.statCard}>
                        <div style={styles.statIcon}>
                            <img src="/assets/sick_leave.png" alt="Sick Leave" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                        </div>
                        <div>
                            <h3 style={styles.statTitle}>Sick Leave</h3>
                            <p style={styles.statValue}>
                                {leaveBalance ? (
                                    <>
                                        {(leaveBalance.sick_total - leaveBalance.sick_used).toFixed(1)} days
                                        <span style={styles.statSubtext}> available</span>
                                    </>
                                ) : (
                                    'Loading...'
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card fade-in" style={styles.actionsCard}>
                    <h2 style={styles.sectionTitle}>Quick Actions</h2>
                    <div style={styles.actionsGrid}>
                        <Link to="/payslips" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            View Payslips
                        </Link>
                        <Link to="/leave" className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                            Request Leave
                        </Link>
                        <Link to="/calendar" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                            </svg>
                            View Calendar
                        </Link>
                    </div>
                </div>

                {/* Recent Leave Requests */}
                {recentLeaveRequests.length > 0 && (
                    <div className="card fade-in" style={styles.leaveCard}>
                        <div style={styles.cardHeader}>
                            <h2 style={styles.sectionTitle}>Recent Leave Requests</h2>
                            <Link to="/leave" className="btn btn-sm btn-secondary">
                                View All
                            </Link>
                        </div>
                        <div style={styles.leaveList}>
                            {recentLeaveRequests.map((request) => (
                                <div key={request.id} style={styles.leaveItem}>
                                    <div style={styles.leaveInfo}>
                                        <span style={styles.leaveType}>
                                            {request.leave_type.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span style={styles.leaveDates}>
                                            {format(new Date(request.start_date), 'MMM dd')} -{' '}
                                            {format(new Date(request.end_date), 'MMM dd, yyyy')}
                                        </span>
                                        <span style={styles.leaveDays}>{request.total_days} days</span>
                                    </div>
                                    <span className={`badge badge-${getStatusColor(request.status)}`}>
                                        {request.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'approved':
            return 'success';
        case 'rejected':
            return 'error';
        default:
            return 'pending';
    }
};

const styles = {
    container: {
        paddingTop: '2rem',
        paddingBottom: '3rem',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        padding: '2rem',
        background: 'linear-gradient(135deg, #D4145A 0%, #A31047 100%)',
        borderRadius: '1rem',
        color: '#FFFFFF',
        boxShadow: '0 10px 15px -3px rgba(212, 20, 90, 0.3)',
    },
    welcomeTitle: {
        fontSize: '2rem',
        fontWeight: '700',
        margin: 0,
        color: '#FFFFFF',
    },
    welcomeSubtitle: {
        fontSize: '1rem',
        margin: '0.5rem 0 0 0',
        opacity: 0.9,
    },
    employeeNumber: {
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '0.75rem 1.25rem',
        borderRadius: '0.5rem',
        textAlign: 'right',
    },
    label: {
        display: 'block',
        fontSize: '0.75rem',
        opacity: 0.9,
    },
    value: {
        display: 'block',
        fontSize: '1.25rem',
        fontWeight: '700',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
    },
    statCard: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
    },
    statIcon: {
        fontSize: '2.5rem',
    },
    statTitle: {
        fontSize: '0.875rem',
        color: '#6B7280',
        margin: '0 0 0.5rem 0',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    statValue: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
    },
    statSubtext: {
        fontSize: '0.875rem',
        fontWeight: '400',
        color: '#6B7280',
    },
    actionsCard: {
        marginBottom: '2rem',
    },
    sectionTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 1.5rem 0',
    },
    actionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
    },
    leaveCard: {
        marginBottom: '2rem',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
    },
    leaveList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    leaveItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        background: '#F9FAFB',
        borderRadius: '0.5rem',
        border: '1px solid #E5E7EB',
    },
    leaveInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    leaveType: {
        fontSize: '0.75rem',
        fontWeight: '700',
        color: '#D4145A',
        letterSpacing: '0.5px',
    },
    leaveDates: {
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '600',
    },
    leaveDays: {
        fontSize: '0.75rem',
        color: '#6B7280',
    },
};

export default Dashboard;
