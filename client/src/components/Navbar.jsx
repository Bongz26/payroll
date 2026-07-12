import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const { employee, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const baseLinks = [
        {
            path: '/dashboard',
            label: 'Dashboard',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            )
        },
        {
            path: '/payslips',
            label: 'Payslips',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3.228-9.941a.75.75 0 0 1 .75-.75h5.956a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75H9.522a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 .75.75h5.956a.75.75 0 0 0 .75-.75v-2m-3.228-3.5a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h5.956a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75H9.522a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 .75-.75h5.956a.75.75 0 0 1 .75.75v3.5" />
                </svg>
            )
        },
        {
            path: '/leave',
            label: 'Leave',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
            )
        },
        {
            path: '/calendar',
            label: 'Calendar',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                </svg>
            )
        },
    ];

    // Build nav links and include Register only for HR/admin users
    const isAdmin = (employee?.job_title && employee.job_title.toLowerCase().includes('hr')) || (employee?.department && employee.department.toLowerCase() === 'administration');
    const navLinks = [...baseLinks];
    if (isAdmin) {
        navLinks.push({
            path: '/register',
            label: 'Register',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            )
        });
    }

    return (
        <nav style={styles.navbar}>
            <div className="container" style={styles.navContainer}>
                {/* Logo Section */}
                <div style={styles.logoSection}>
                    <img
                        src="/assets/thusanang-logo.png"
                        alt="Thusanang Logo"
                        style={styles.logo}
                    />
                    <div style={styles.brandText}>
                        <h1 style={styles.brandTitle}>Thusanang</h1>
                        <p style={styles.brandSubtitle}>Payroll System</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <div style={styles.navLinks}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            style={{
                                ...styles.navLink,
                                ...(location.pathname === link.path ? styles.navLinkActive : {}),
                            }}
                        >
                            <span style={styles.navIcon}>{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* User Section */}
                <div style={styles.userSection}>
                    <div style={styles.userInfo}>
                        <div style={styles.userAvatar}>
                            {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                        </div>
                        <div>
                            <div style={styles.userName}>
                                {employee?.first_name} {employee?.last_name}
                            </div>
                            <div style={styles.userRole}>{employee?.job_title || 'Employee'}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

const styles = {
    navbar: {
        background: 'linear-gradient(135deg, #D4145A 0%, #A31047 100%)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1030,
        borderBottom: '3px solid #DAA520',
    },
    navContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        gap: '2rem',
    },
    logoSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    logo: {
        height: '50px',
        width: '50px',
        borderRadius: '50%',
        border: '2px solid #DAA520',
    },
    brandText: {
        color: '#FFFFFF',
    },
    brandTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        margin: 0,
        lineHeight: 1.2,
    },
    brandSubtitle: {
        fontSize: '0.75rem',
        margin: 0,
        opacity: 0.9,
    },
    navLinks: {
        display: 'flex',
        gap: '0.5rem',
        flex: 1,
        justifyContent: 'center',
    },
    navLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        color: '#FFFFFF',
        textDecoration: 'none',
        borderRadius: '0.5rem',
        transition: 'all 0.3s ease',
        fontWeight: '500',
    },
    navLinkActive: {
        background: 'rgba(255, 255, 255, 0.2)',
        fontWeight: '600',
    },
    navIcon: {
        fontSize: '1.25rem',
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    userAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#DAA520',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '1rem',
    },
    userName: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: '0.875rem',
    },
    userRole: {
        color: '#FFFFFF',
        opacity: 0.8,
        fontSize: '0.75rem',
    },
    logoutBtn: {
        background: '#FFFFFF',
        color: '#D4145A',
        border: 'none',
    },
};

export default Navbar;
