import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { format } from 'date-fns';

const Payslips = () => {
    const [payslips, setPayslips] = useState([]);
    const [selectedPayslip, setSelectedPayslip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayslips();
    }, []);

    const fetchPayslips = async () => {
        try {
            const response = await api.get('/payslips');
            setPayslips(response.data.payslips || []);
        } catch (error) {
            console.error('Error fetching payslips:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (payslipId) => {
        try {
            const response = await api.get(`/payslips/${payslipId}/download`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payslip-${payslipId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading payslip:', error);
            alert('Failed to download payslip');
        }
    };

    const viewDetails = async (payslipId) => {
        try {
            const response = await api.get(`/payslips/${payslipId}`);
            setSelectedPayslip(response.data.payslip);
        } catch (error) {
            console.error('Error fetching payslip details:', error);
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3.228-9.941a.75.75 0 0 1 .75-.75h5.956a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75H9.522a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 .75.75h5.956a.75.75 0 0 0 .75-.75v-2m-3.228-3.5a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h5.956a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75H9.522a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 .75-.75h5.956a.75.75 0 0 1 .75.75v3.5" />
                        </svg>
                        <div>
                            <h1 style={styles.title}>Payslips</h1>
                            <p style={styles.subtitle}>View and download your payslips</p>
                        </div>
                    </div>
                </div>

                {payslips.length === 0 ? (
                    <div className="card" style={styles.emptyState}>
                        <h3>No payslips available</h3>
                        <p>Your payslips will appear here once they are generated.</p>
                    </div>
                ) : (
                    <>
                        {/* Payslips Table */}
                        <div className="card fade-in">
                            <h2 style={styles.sectionTitle}>All Payslips</h2>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Pay Period</th>
                                            <th>Payment Date</th>
                                            <th>Gross Salary</th>
                                            <th>Net Salary</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payslips.map((payslip) => (
                                            <tr key={payslip.id}>
                                                <td>
                                                    {format(new Date(payslip.pay_period_start), 'MMM dd')} -{' '}
                                                    {format(new Date(payslip.pay_period_end), 'MMM dd, yyyy')}
                                                </td>
                                                <td>{format(new Date(payslip.payment_date), 'MMM dd, yyyy')}</td>
                                                <td>R {parseFloat(payslip.gross_salary).toFixed(2)}</td>
                                                <td style={styles.netSalary}>
                                                    R {parseFloat(payslip.net_salary).toFixed(2)}
                                                </td>
                                                <td>
                                                    <div style={styles.actions}>
                                                        <button
                                                            onClick={() => viewDetails(payslip.id)}
                                                            className="btn btn-sm btn-secondary"
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(payslip.id)}
                                                            className="btn btn-sm btn-primary"
                                                        >
                                                            Download PDF
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payslip Details Modal */}
                        {selectedPayslip && (
                            <div style={styles.modal} onClick={() => setSelectedPayslip(null)}>
                                <div
                                    className="card"
                                    style={styles.modalContent}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={styles.modalHeader}>
                                        <h2>Payslip Details</h2>
                                        <button
                                            onClick={() => setSelectedPayslip(null)}
                                            style={styles.closeBtn}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div style={styles.payslipDetails}>
                                        <div style={styles.detailSection}>
                                            <h3>Employee Information</h3>
                                            <div style={styles.detailGrid}>
                                                <div>
                                                    <span style={styles.detailLabel}>Name:</span>
                                                    <span style={styles.detailValue}>
                                                        {selectedPayslip.employees.first_name}{' '}
                                                        {selectedPayslip.employees.last_name}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={styles.detailLabel}>Employee Number:</span>
                                                    <span style={styles.detailValue}>
                                                        {selectedPayslip.employees.employee_number}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={styles.detailLabel}>Department:</span>
                                                    <span style={styles.detailValue}>
                                                        {selectedPayslip.employees.department}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={styles.detailLabel}>Position:</span>
                                                    <span style={styles.detailValue}>
                                                        {selectedPayslip.employees.job_title}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={styles.detailSection}>
                                            <h3>Pay Period</h3>
                                            <div style={styles.detailGrid}>
                                                <div>
                                                    <span style={styles.detailLabel}>Period:</span>
                                                    <span style={styles.detailValue}>
                                                        {format(new Date(selectedPayslip.pay_period_start), 'MMM dd')} -{' '}
                                                        {format(new Date(selectedPayslip.pay_period_end), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={styles.detailLabel}>Payment Date:</span>
                                                    <span style={styles.detailValue}>
                                                        {format(new Date(selectedPayslip.payment_date), 'MMMM dd, yyyy')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={styles.detailSection}>
                                            <h3>Earnings</h3>
                                            <div style={styles.amountBox}>
                                                <span>Gross Salary:</span>
                                                <span style={styles.amount}>
                                                    R {parseFloat(selectedPayslip.gross_salary).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={styles.detailSection}>
                                            <h3>Deductions</h3>
                                            {Object.entries(selectedPayslip.deductions || {}).map(([key, value]) => (
                                                <div key={key} style={styles.amountBox}>
                                                    <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                                                    <span style={styles.deduction}>
                                                        R {parseFloat(value).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={styles.netPaySection}>
                                            <span style={styles.netPayLabel}>NET PAY:</span>
                                            <span style={styles.netPayAmount}>
                                                R {parseFloat(selectedPayslip.net_salary).toFixed(2)}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleDownload(selectedPayslip.id)}
                                            className="btn btn-primary btn-lg"
                                            style={{ width: '100%', marginTop: '1rem' }}
                                        >
                                            Download PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
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
    sectionTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '1.5rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
    },
    netSalary: {
        fontWeight: '700',
        color: '#10B981',
    },
    actions: {
        display: 'flex',
        gap: '0.5rem',
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem',
    },
    modalContent: {
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #E5E7EB',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        color: '#6B7280',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    payslipDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    detailSection: {
        padding: '1rem',
        background: '#F9FAFB',
        borderRadius: '0.5rem',
    },
    detailGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginTop: '1rem',
    },
    detailLabel: {
        display: 'block',
        fontSize: '0.875rem',
        color: '#6B7280',
        marginBottom: '0.25rem',
    },
    detailValue: {
        display: 'block',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#111827',
    },
    amountBox: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.75rem',
        background: '#FFFFFF',
        borderRadius: '0.375rem',
        marginTop: '0.5rem',
    },
    amount: {
        fontWeight: '600',
        color: '#10B981',
    },
    deduction: {
        fontWeight: '600',
        color: '#EF4444',
    },
    netPaySection: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #D4145A 0%, #A31047 100%)',
        borderRadius: '0.75rem',
        color: '#FFFFFF',
        marginTop: '1rem',
    },
    netPayLabel: {
        fontSize: '1.25rem',
        fontWeight: '700',
    },
    netPayAmount: {
        fontSize: '1.75rem',
        fontWeight: '700',
    },
};

export default Payslips;
