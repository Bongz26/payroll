import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { format } from 'date-fns';

const Leave = () => {
    const [activeTab, setActiveTab] = useState('request');
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [hrPendingRequests, setHRPendingRequests] = useState([]);
    const [isManager, setIsManager] = useState(false);
    const [isHR, setIsHR] = useState(false);

    // UX state for approvals
    const [processingId, setProcessingId] = useState(null);
    const [rejectSubmitting, setRejectSubmitting] = useState(false);

    // Modal state for rejection
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectInfo, setRejectInfo] = useState({ id: null, type: null, reason: '' });

    // Form state
    const [formData, setFormData] = useState({
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchLeaveData();
    }, []);

    const fetchLeaveData = async () => {
        try {
            const [balanceRes, requestsRes] = await Promise.all([
                api.get('/leave/balance'),
                api.get('/leave/requests'),
            ]);

            setLeaveBalance(balanceRes.data.balance);
            setLeaveRequests(requestsRes.data.requests || []);
            // determine if current user is manager or HR
            const stored = localStorage.getItem('employee');
            if (stored) {
                const emp = JSON.parse(stored);
                const job = (emp.job_title || '').toLowerCase();
                const dept = (emp.department || '').toLowerCase();
                const managerFlag = job.includes('manager') || job.includes('director') || job.includes('supervisor') || dept === 'operations' || dept === 'administration';
                const hrFlag = job.includes('hr') || dept === 'administration';
                setIsManager(managerFlag);
                setIsHR(hrFlag);
                if (managerFlag) {
                    const pendingRes = await api.get('/leave/pending');
                    setPendingRequests(pendingRes.data.requests || []);
                }
                if (hrFlag) {
                    const hrPendingRes = await api.get('/leave/pending/hr');
                    setHRPendingRequests(hrPendingRes.data.requests || []);
                }
            }
        } catch (error) {
            console.error('Error fetching leave data:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshPending = async () => {
        try {
            const res = await api.get('/leave/pending');
            setPendingRequests(res.data.requests || []);
        } catch (err) {
            console.error('Error fetching pending requests:', err);
        }
    };

    const refreshHRPending = async () => {
        try {
            const res = await api.get('/leave/pending/hr');
            setHRPendingRequests(res.data.requests || []);
        } catch (err) {
            console.error('Error fetching HR pending requests:', err);
        }
    };

    const handleApprove = async (id) => {
        try {
            setProcessingId(id);
            await api.post(`/leave/request/${id}/approve`);
            await fetchLeaveData();
            await refreshPending();
            setMessage({ type: 'success', text: 'Leave request approved successfully.' });
        } catch (err) {
            console.error('Approve error:', err);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to approve' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = (id) => {
        setRejectInfo({ id, type: 'manager', reason: '' });
        setRejectModalOpen(true);
    };

    const handleHRApprove = async (id) => {
        try {
            setProcessingId(id);
            await api.post(`/leave/request/${id}/hr-approve`);
            await fetchLeaveData();
            await refreshHRPending();
            setMessage({ type: 'success', text: 'Leave request approved by HR.' });
        } catch (err) {
            console.error('HR approve error:', err);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to approve by HR' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleHRReject = (id) => {
        setRejectInfo({ id, type: 'hr', reason: '' });
        setRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (!rejectInfo.reason.trim()) {
            setMessage({ type: 'error', text: 'Please provide a reason for rejection.' });
            return;
        }
        
        try {
            setRejectSubmitting(true);
            const endpoint = rejectInfo.type === 'hr' 
                ? `/leave/request/${rejectInfo.id}/hr-reject`
                : `/leave/request/${rejectInfo.id}/reject`;
                
            await api.post(endpoint, { rejection_reason: rejectInfo.reason });
            await fetchLeaveData();
            if (rejectInfo.type === 'hr') await refreshHRPending();
            else await refreshPending();
            
            setMessage({ type: 'success', text: 'Leave request rejected successfully.' });
            setRejectModalOpen(false);
        } catch (err) {
            console.error('Reject error:', err);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reject' });
        } finally {
            setRejectSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const response = await api.post('/leave/request', formData);
            setMessage({ type: 'success', text: response.data.message });
            setFormData({
                leave_type: 'annual',
                start_date: '',
                end_date: '',
                reason: '',
            });
            fetchLeaveData(); // Refresh data
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to submit leave request',
            });
        } finally {
            setSubmitting(false);
        }
    };

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
                <div style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '48px', height: '48px', color: '#D4145A' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        <div>
                            <h1 style={styles.title}>Leave Management</h1>
                            <p style={styles.subtitle}>Request leave and manage your time off</p>
                        </div>
                    </div>
                </div>

                {/* Leave Balance Cards */}
                <div style={styles.balanceGrid} className="fade-in">
                    <div className="card">
                        <h3 style={styles.balanceTitle}>Annual Leave</h3>
                        <div style={styles.balanceValue}>
                            {leaveBalance ? (
                                <>
                                    <span style={styles.available}>
                                        {(leaveBalance.annual_total - leaveBalance.annual_used).toFixed(1)}
                                    </span>
                                    <span style={styles.total}> / {leaveBalance.annual_total} days</span>
                                </>
                            ) : (
                                'Loading...'
                            )}
                        </div>
                        <div style={styles.balanceBar}>
                            <div
                                style={{
                                    ...styles.balanceBarFill,
                                    width: leaveBalance
                                        ? `${((leaveBalance.annual_total - leaveBalance.annual_used) / leaveBalance.annual_total) * 100}%`
                                        : '0%',
                                }}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={styles.balanceTitle}>Sick Leave</h3>
                        <div style={styles.balanceValue}>
                            {leaveBalance ? (
                                <>
                                    <span style={styles.available}>
                                        {(leaveBalance.sick_total - leaveBalance.sick_used).toFixed(1)}
                                    </span>
                                    <span style={styles.total}> / {leaveBalance.sick_total} days</span>
                                </>
                            ) : (
                                'Loading...'
                            )}
                        </div>
                        <div style={styles.balanceBar}>
                            <div
                                style={{
                                    ...styles.balanceBarFill,
                                    width: leaveBalance
                                        ? `${((leaveBalance.sick_total - leaveBalance.sick_used) /
                                            leaveBalance.sick_total) *
                                        100}%`
                                        : '0%',
                                }}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={styles.balanceTitle}>Family Responsibility</h3>
                        <div style={styles.balanceValue}>
                            {leaveBalance ? (
                                <>
                                    <span style={styles.available}>
                                        {(
                                            leaveBalance.family_responsibility_total -
                                            leaveBalance.family_responsibility_used
                                        ).toFixed(1)}
                                    </span>
                                    <span style={styles.total}>
                                        {' '}
                                        / {leaveBalance.family_responsibility_total} days
                                    </span>
                                </>
                            ) : (
                                'Loading...'
                            )}
                        </div>
                        <div style={styles.balanceBar}>
                            <div
                                style={{
                                    ...styles.balanceBarFill,
                                    width: leaveBalance
                                        ? `${((leaveBalance.family_responsibility_total -
                                            leaveBalance.family_responsibility_used) /
                                            leaveBalance.family_responsibility_total) *
                                        100}%`
                                        : '0%',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={styles.tabs} className="fade-in">
                    <button
                        onClick={() => setActiveTab('request')}
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'request' ? styles.tabActive : {}),
                        }}
                    >
                        Request Leave
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'history' ? styles.tabActive : {}),
                        }}
                    >
                        Leave History
                    </button>
                    {(isManager || isHR) && (
                        <button
                            onClick={() => setActiveTab('approvals')}
                            style={{
                                ...styles.tab,
                                ...(activeTab === 'approvals' ? styles.tabActive : {}),
                            }}
                        >
                            Approvals
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                {activeTab === 'request' ? (
                    <div className="card fade-in">
                        <h2 style={styles.sectionTitle}>Submit Leave Request</h2>

                        {message && (
                            <div
                                style={{
                                    ...styles.messageBox,
                                    ...(message.type === 'success'
                                        ? styles.successBox
                                        : styles.errorBox),
                                }}
                            >
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Leave Type</label>
                                <select
                                    className="form-select"
                                    value={formData.leave_type}
                                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                    required
                                >
                                    <option value="annual">Annual Leave</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="family_responsibility">Family Responsibility</option>
                                    <option value="unpaid">Unpaid Leave</option>
                                    <option value="maternity">Maternity Leave</option>
                                    <option value="paternity">Paternity Leave</option>
                                </select>
                            </div>

                            <div style={styles.dateRow}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Reason (Optional)</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Provide a reason for your leave request..."
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                disabled={submitting}
                                style={{ width: '100%' }}
                            >
                                {submitting ? 'Submitting...' : 'Submit Leave Request'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="card fade-in">
                        <h2 style={styles.sectionTitle}>Leave History</h2>

                        {leaveRequests.length === 0 ? (
                            <div style={styles.emptyState}>
                                <p>No leave requests found.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Leave Type</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Days</th>
                                            <th>Status</th>
                                            <th>Submit Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaveRequests.map((request) => (
                                            <tr key={request.id}>
                                                <td>
                                                    {request.leave_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </td>
                                                <td>{format(new Date(request.start_date), 'MMM dd, yyyy')}</td>
                                                <td>{format(new Date(request.end_date), 'MMM dd, yyyy')}</td>
                                                <td>{request.total_days}</td>
                                                <td>
                                                    <span className={`badge badge-${getStatusColor(request.status)}`}>
                                                        {getStatusLabel(request)}
                                                    </span>
                                                    {request.status === 'rejected' && request.rejection_reason && (
                                                        <div style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: '4px' }}>
                                                            <strong>Reason:</strong> {request.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{format(new Date(request.created_at), 'MMM dd, yyyy')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                        )}
                        {(isManager || isHR) && activeTab === 'approvals' && (
                            <div className="card fade-in">
                                <h2 style={styles.sectionTitle}>Pending Approvals</h2>

                                {isManager && (
                                    <>
                                        <h3 style={{ marginBottom: '1rem' }}>Manager Review</h3>
                                        {pendingRequests.length === 0 ? (
                                            <div style={styles.emptyState}><p>No pending manager requests.</p></div>
                                        ) : (
                                            <div className="table-container" style={{ marginBottom: '2rem' }}>
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Employee</th>
                                                            <th>Type</th>
                                                            <th>Start</th>
                                                            <th>End</th>
                                                            <th>Days</th>
                                                            <th>Reason</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pendingRequests.map((r) => (
                                                            <tr key={r.id}>
                                                                <td>{r.employees?.first_name} {r.employees?.last_name} ({r.employees?.employee_number})</td>
                                                                <td>{r.leave_type}</td>
                                                                <td>{format(new Date(r.start_date), 'MMM dd, yyyy')}</td>
                                                                <td>{format(new Date(r.end_date), 'MMM dd, yyyy')}</td>
                                                                <td>{r.total_days}</td>
                                                                <td>{r.reason}</td>
                                                                <td>
                                                                    <button 
                                                                        className="btn btn-sm btn-primary" 
                                                                        onClick={() => handleApprove(r.id)} 
                                                                        disabled={processingId === r.id}
                                                                        style={{ marginRight: 8, opacity: processingId === r.id ? 0.7 : 1 }}
                                                                    >
                                                                        {processingId === r.id ? 'Approving...' : 'Approve'}
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-sm btn-secondary" 
                                                                        onClick={() => handleReject(r.id)}
                                                                        disabled={processingId === r.id}
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}

                                {isHR && (
                                    <>
                                        <h3 style={{ marginBottom: '1rem' }}>HR Review</h3>
                                        {hrPendingRequests.length === 0 ? (
                                            <div style={styles.emptyState}><p>No pending HR requests.</p></div>
                                        ) : (
                                            <div className="table-container">
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Employee</th>
                                                            <th>Type</th>
                                                            <th>Start</th>
                                                            <th>End</th>
                                                            <th>Days</th>
                                                            <th>Reason</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {hrPendingRequests.map((r) => (
                                                            <tr key={r.id}>
                                                                <td>{r.employees?.first_name} {r.employees?.last_name} ({r.employees?.employee_number})</td>
                                                                <td>{r.leave_type}</td>
                                                                <td>{format(new Date(r.start_date), 'MMM dd, yyyy')}</td>
                                                                <td>{format(new Date(r.end_date), 'MMM dd, yyyy')}</td>
                                                                <td>{r.total_days}</td>
                                                                <td>{r.reason}</td>
                                                                <td>
                                                                    <button 
                                                                        className="btn btn-sm btn-primary" 
                                                                        onClick={() => handleHRApprove(r.id)} 
                                                                        disabled={processingId === r.id}
                                                                        style={{ marginRight: 8, opacity: processingId === r.id ? 0.7 : 1 }}
                                                                    >
                                                                        {processingId === r.id ? 'Approving...' : 'Approve'}
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-sm btn-secondary" 
                                                                        onClick={() => handleHRReject(r.id)}
                                                                        disabled={processingId === r.id}
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
            </div>

            {/* Rejection Modal */}
            {rejectModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} className="fade-in">
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#111827' }}>Reject Leave Request</h3>
                        <p style={{ marginBottom: '1rem', color: '#6B7280', fontSize: '0.9rem' }}>
                            Please provide a reason for rejecting this leave request. This will be sent to the employee.
                        </p>
                        <textarea
                            className="form-textarea"
                            rows="4"
                            placeholder="Type reason here..."
                            value={rejectInfo.reason}
                            onChange={(e) => setRejectInfo({ ...rejectInfo, reason: e.target.value })}
                            style={{ width: '100%', marginBottom: '1rem' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setRejectModalOpen(false)} disabled={rejectSubmitting}>Cancel</button>
                            <button className="btn btn-primary" style={{ backgroundColor: '#DC2626', opacity: rejectSubmitting ? 0.7 : 1 }} onClick={confirmReject} disabled={rejectSubmitting}>
                                {rejectSubmitting ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

const getStatusLabel = (request) => {
    if (request.status === 'pending' && request.manager_approved_by) {
        return 'Pending HR approval';
    }
    if (request.status === 'pending') {
        return 'Pending manager approval';
    }
    return request.status.charAt(0).toUpperCase() + request.status.slice(1);
};

const styles = {
    container: {
        paddingTop: '2rem',
        paddingBottom: '3rem',
    },
    header: {
        marginBottom: '2rem',
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
    },
    subtitle: {
        fontSize: '1.125rem',
        color: '#6B7280',
        margin: '0.5rem 0 0 0',
    },
    balanceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
    },
    balanceTitle: {
        fontSize: '0.875rem',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '1rem',
    },
    balanceValue: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '1rem',
    },
    available: {
        color: '#10B981',
    },
    total: {
        fontSize: '1.25rem',
        color: '#6B7280',
    },
    balanceBar: {
        height: '8px',
        background: '#E5E7EB',
        borderRadius: '999px',
        overflow: 'hidden',
    },
    balanceBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: '9999px',
        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    tabs: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid #E5E7EB',
    },
    tab: {
        padding: '0.75rem 1.5rem',
        background: 'none',
        border: 'none',
        borderBottom: '3px solid transparent',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#6B7280',
        transition: 'all 0.3s',
    },
    tabActive: {
        color: '#D4145A',
        borderBottomColor: '#D4145A',
    },
    sectionTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '1.5rem',
    },
    messageBox: {
        padding: '1rem',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        fontWeight: '500',
    },
    successBox: {
        background: '#D1FAE5',
        color: '#065F46',
        border: '2px solid #10B981',
    },
    errorBox: {
        background: '#FEE2E2',
        color: '#991B1B',
        border: '2px solid #EF4444',
    },
    dateRow: {
        display: 'flex',
        gap: '1rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '2rem',
        color: '#6B7280',
    },
};

export default Leave;
