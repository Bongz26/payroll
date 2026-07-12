import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    addMonths,
    subMonths
} from 'date-fns';

const Calendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarData, setCalendarData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCalendarData();
    }, [currentMonth]);

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();

            const response = await api.get(`/leave/calendar?month=${month}&year=${year}`);
            setCalendarData(response.data.calendarData || {});
        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);

        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

        return days.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const employeesOnLeave = calendarData[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
                <div
                    key={index}
                    style={{
                        ...styles.calendarDay,
                        ...(isCurrentMonth ? {} : styles.otherMonth),
                        ...(isCurrentDay ? styles.today : {}),
                    }}
                >
                    <div style={styles.dayNumber}>{format(day, 'd')}</div>
                    {employeesOnLeave.length > 0 && (
                        <div style={styles.leaveIndicators}>
                            {employeesOnLeave.map((emp, idx) => (
                                <div key={idx} style={styles.leaveTag} title={emp.employee}>
                                    <span style={styles.leaveIcon}>
                                        {emp.leaveType === 'sick' ? '🏥' : emp.leaveType === 'annual' ? '✈️' : '📅'}
                                    </span>
                                    <span style={styles.employeeName}>{emp.employee}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        });
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    return (
        <div>
            <Navbar />
            <div className="container" style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>🗓️ Employee Calendar</h1>
                    <p style={styles.subtitle}>View employee availability and leave schedule</p>
                </div>

                {/* Calendar Controls */}
                <div className="card fade-in" style={styles.controls}>
                    <button onClick={previousMonth} className="btn btn-secondary">
                        ← Previous
                    </button>
                    <div style={styles.monthDisplay}>
                        <h2 style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</h2>
                        <button onClick={goToToday} className="btn btn-sm btn-accent">
                            Today
                        </button>
                    </div>
                    <button onClick={nextMonth} className="btn btn-secondary">
                        Next →
                    </button>
                </div>

                {/* Legend */}
                <div className="card fade-in" style={styles.legend}>
                    <h3 style={styles.legendTitle}>Legend:</h3>
                    <div style={styles.legendItems}>
                        <div style={styles.legendItem}>
                            <span style={styles.leaveIcon}>✈️</span>
                            <span>Annual Leave</span>
                        </div>
                        <div style={styles.legendItem}>
                            <span style={styles.leaveIcon}>🏥</span>
                            <span>Sick Leave</span>
                        </div>
                        <div style={styles.legendItem}>
                            <span style={styles.leaveIcon}>📅</span>
                            <span>Other Leave</span>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="card fade-in" style={styles.calendarCard}>
                    {loading ? (
                        <div style={styles.loadingContainer}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <>
                            {/* Week Days Header */}
                            <div style={styles.weekDays}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} style={styles.weekDay}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div style={styles.calendarGrid}>
                                {renderCalendar()}
                            </div>
                        </>
                    )}
                </div>
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
    controls: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
    },
    monthDisplay: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
    },
    monthTitle: {
        fontSize: '1.75rem',
        fontWeight: '700',
        margin: 0,
        color: '#D4145A',
    },
    legend: {
        marginBottom: '1.5rem',
    },
    legendTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '1rem',
    },
    legendItems: {
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        color: '#4B5563',
    },
    leaveIcon: {
        fontSize: '1.25rem',
    },
    calendarCard: {
        padding: '1.5rem',
    },
    weekDays: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        marginBottom: '0.5rem',
    },
    weekDay: {
        padding: '0.75rem',
        textAlign: 'center',
        fontWeight: '700',
        color: '#D4145A',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        background: '#E5E7EB',
        border: '1px solid #E5E7EB',
        borderRadius: '0.5rem',
        overflow: 'hidden',
    },
    calendarDay: {
        background: '#FFFFFF',
        minHeight: '120px',
        padding: '0.5rem',
        position: 'relative',
        transition: 'all 0.2s',
    },
    otherMonth: {
        background: '#F9FAFB',
        opacity: 0.5,
    },
    today: {
        background: '#FEF3C7',
        border: '2px solid #F59E0B',
    },
    dayNumber: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.5rem',
    },
    leaveIndicators: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    leaveTag: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.5rem',
        background: '#DBEAFE',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        color: '#1E40AF',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    employeeName: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem',
    },
};

export default Calendar;
