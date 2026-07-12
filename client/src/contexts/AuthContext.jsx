import { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        const storedEmployee = localStorage.getItem('employee');

        if (token && storedEmployee) {
            setEmployee(JSON.parse(storedEmployee));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, employee: employeeData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('employee', JSON.stringify(employeeData));
            setEmployee(employeeData);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed',
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('employee');
        setEmployee(null);
    };

    const value = {
        employee,
        loading,
        login,
        logout,
        isAuthenticated: !!employee,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
