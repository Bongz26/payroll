import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
    const { employee } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        employee_number: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        hire_date: '',
        department: '',
        job_title: '',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            // Client-side validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email)) throw new Error('Invalid email format');
            if (form.password.length < 8) throw new Error('Password must be at least 8 characters');
            const empNumRegex = /^[A-Z0-9_-]{3,20}$/i;
            if (!empNumRegex.test(form.employee_number)) throw new Error('Invalid employee number');

            const res = await api.post('/auth/register', form);
            if (res.data?.success) {
                setMessage('Employee created successfully');
                setTimeout(() => navigate('/dashboard'), 1200);
            } else {
                setError(res.data?.message || 'Failed to create employee');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Server error');
        } finally {
            setLoading(false);
        }
    };

    // Basic authorization: only allow access when logged in (ProtectedRoute ensures this)
    return (
        <div style={styles.container}>
            <div style={styles.box}>
                <h2>Register New Employee</h2>

                {message && <div style={styles.success}>{message}</div>}
                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.row}>
                        <label>Employee #</label>
                        <input name="employee_number" value={form.employee_number} onChange={handleChange} required />
                    </div>
                    <div style={styles.row}>
                        <label>Email</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange} required />
                    </div>
                    <div style={styles.row}>
                        <label>Password</label>
                        <input name="password" type="password" value={form.password} onChange={handleChange} required />
                    </div>
                    <div style={styles.row}>
                        <label>First name</label>
                        <input name="first_name" value={form.first_name} onChange={handleChange} required />
                    </div>
                    <div style={styles.row}>
                        <label>Last name</label>
                        <input name="last_name" value={form.last_name} onChange={handleChange} required />
                    </div>
                    <div style={styles.row}>
                        <label>Hire date</label>
                        <input name="hire_date" type="date" value={form.hire_date} onChange={handleChange} required />
                    </div>
                    <div style={styles.row}>
                        <label>Department</label>
                        <input name="department" value={form.department} onChange={handleChange} />
                    </div>
                    <div style={styles.row}>
                        <label>Job title</label>
                        <input name="job_title" value={form.job_title} onChange={handleChange} />
                    </div>
                    <div style={styles.row}>
                        <label>Status</label>
                        <select name="status" value={form.status} onChange={handleChange}>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="suspended">suspended</option>
                        </select>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                        {loading ? 'Creating...' : 'Create Employee'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '2rem' },
    box: { maxWidth: '720px', margin: '0 auto', background: '#fff', padding: '1.5rem', borderRadius: '8px' },
    form: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
    row: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    error: { background: '#fee2e2', color: '#991b1b', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' },
    success: { background: '#ecfdf5', color: '#065f46', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }
};

export default Register;
