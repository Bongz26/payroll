import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }

        setLoading(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                {/* Logo Section */}
                <div style={styles.logoSection}>
                    <img
                        src="/assets/thusanang-logo.png"
                        alt="Thusanang Logo"
                        style={styles.logo}
                    />
                    <h1 style={styles.title}>Thusanang Funeral Services</h1>
                    <p style={styles.subtitle}>Employee Payroll System</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    <h2 style={styles.formTitle}>Employee Login</h2>

                    {error && (
                        <div style={styles.errorBox}>
                            {error}
                        </div>
                    )}

                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Login Username</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                                display: 'flex'
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                </svg>
                            </span>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="firstname.lastname@thusanang.co.za"
                                value={email}
                                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                required
                                autoFocus
                                autoComplete="username"
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '0.4rem', marginBottom: 0 }}>
                            Format: <strong>firstname.lastname@thusanang.co.za</strong>
                        </p>
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                                display: 'flex'
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            </span>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Your 13-digit SA ID number"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '0.4rem', marginBottom: 0 }}>
                            First-time login: use your <strong>13-digit SA ID number</strong> as your password
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                        style={{ width: '100%', marginTop: '1rem' }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Footer */}
                <div style={styles.footer}>
                    <p style={styles.footerText}>
                        Need help? Contact HR at <a href="mailto:support@thusanangfs.co.za" style={styles.link}>support@thusanangfs.co.za</a>
                    </p>
                    <a
                        href="https://dondastech.co.za"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...styles.developerBadge, textDecoration: 'none', cursor: 'pointer' }}
                    >
                        <img
                            src="/assets/dondas-tech-logo.png"
                            alt="Dondas Tech"
                            style={styles.developerLogo}
                        />
                        <span style={styles.developerText}>Developed by Dondas Tech</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)',
    },
    loginBox: {
        background: '#FFFFFF',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '3rem',
        maxWidth: '480px',
        width: '100%',
        animation: 'fadeIn 0.5s ease-out',
    },
    logoSection: {
        textAlign: 'center',
        marginBottom: '2rem',
    },
    logo: {
        width: '120px',
        height: '120px',
        marginBottom: '1rem',
        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#D4145A',
        margin: '0 0 0.5rem 0',
    },
    subtitle: {
        color: '#6B7280',
        fontSize: '1rem',
        margin: 0,
    },
    form: {
        marginTop: '2rem',
    },
    formTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '1.5rem',
        textAlign: 'center',
    },
    errorBox: {
        background: '#FEE2E2',
        border: '2px solid #EF4444',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        color: '#991B1B',
        marginBottom: '1rem',
        fontWeight: '500',
    },
    footer: {
        marginTop: '2rem',
        textAlign: 'center',
    },
    footerText: {
        fontSize: '0.875rem',
        color: '#6B7280',
        margin: '0 0 1rem 0',
    },
    link: {
        color: '#D4145A',
        fontWeight: '600',
    },
    developerBadge: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem',
        background: '#F3F4F6',
        borderRadius: '0.5rem',
    },
    developerLogo: {
        height: '24px',
        width: '24px',
    },
    developerText: {
        fontSize: '0.875rem',
        color: '#4B5563',
        fontWeight: '500',
    },
};

export default Login;
