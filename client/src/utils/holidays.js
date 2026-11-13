// In-memory cache for computed public holidays by year
const holidaysCache = {};

/**
 * Calculates Gregorian Easter Sunday for any given year using the Meeus/Jones/Butcher algorithm.
 */
export function getEasterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Returns a dictionary of { 'YYYY-MM-DD': 'Holiday Name' } for South Africa.
 * Complies with the South African Public Holidays Act (Act No 36 of 1994).
 * Section 2(1): When any public holiday falls on a Sunday, the following Monday is an observed public holiday.
 */
export function getSAPublicHolidays(year) {
    if (holidaysCache[year]) {
        return holidaysCache[year];
    }

    const holidays = {};

    function addHoliday(date, name) {
        const key = formatDateKey(date);
        holidays[key] = name;

        // If public holiday falls on Sunday, following Monday is a public holiday
        if (date.getDay() === 0) {
            const monday = new Date(date);
            monday.setDate(monday.getDate() + 1);
            const monKey = formatDateKey(monday);

            if (holidays[monKey]) {
                const tuesday = new Date(monday);
                tuesday.setDate(tuesday.getDate() + 1);
                const tueKey = formatDateKey(tuesday);
                holidays[tueKey] = `${name} (Observed)`;
            } else {
                holidays[monKey] = `${name} (Observed)`;
            }
        }
    }

    // 1. New Year's Day - 1 Jan
    addHoliday(new Date(year, 0, 1), "New Year's Day");

    // 2. Human Rights Day - 21 Mar
    addHoliday(new Date(year, 2, 21), "Human Rights Day");

    // Easter-related holidays
    const easter = getEasterSunday(year);

    // 3. Good Friday - Friday before Easter
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    addHoliday(goodFriday, "Good Friday");

    // 4. Family Day - Monday following Easter
    const familyDay = new Date(easter);
    familyDay.setDate(easter.getDate() + 1);
    addHoliday(familyDay, "Family Day");

    // 5. Freedom Day - 27 Apr
    addHoliday(new Date(year, 3, 27), "Freedom Day");

    // 6. Workers' Day - 1 May
    addHoliday(new Date(year, 4, 1), "Workers' Day");

    // 7. Youth Day - 16 Jun
    addHoliday(new Date(year, 5, 16), "Youth Day");

    // 8. National Women's Day - 9 Aug
    addHoliday(new Date(year, 7, 9), "National Women's Day");

    // 9. Heritage Day - 24 Sep
    addHoliday(new Date(year, 8, 24), "Heritage Day");

    // 10. Day of Reconciliation - 16 Dec
    addHoliday(new Date(year, 11, 16), "Day of Reconciliation");

    // 11. Christmas Day - 25 Dec
    addHoliday(new Date(year, 11, 25), "Christmas Day");

    // 12. Day of Goodwill - 26 Dec
    addHoliday(new Date(year, 11, 26), "Day of Goodwill");

    holidaysCache[year] = holidays;
    return holidays;
}

/**
 * Checks if a date is a South African public holiday.
 * Returns the holiday name string or null.
 */
export function getHolidayName(dateInput) {
    if (!dateInput) return null;
    let d;
    if (typeof dateInput === 'string') {
        const [y, m, dNum] = dateInput.split('-').map(Number);
        d = new Date(y, m - 1, dNum);
    } else {
        d = dateInput;
    }
    const year = d.getFullYear();
    const holidays = getSAPublicHolidays(year);
    const key = formatDateKey(d);
    return holidays[key] || null;
}

/**
 * Calculate working leave days between two dates inclusive, excluding Sundays AND South African Public Holidays.
 * Thusanang Funeral Services works Monday through Saturday; Sunday and SA public holidays are non-working days.
 * Returns -1 if end date is before start date, or count of working days.
 */
export function calculateWorkingLeaveDays(startDate, endDate) {
    if (!startDate || !endDate) return null;

    let start, end;
    if (typeof startDate === 'string') {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        start = new Date(sy, sm - 1, sd);
    } else {
        start = startDate;
    }

    if (typeof endDate === 'string') {
        const [ey, em, ed] = endDate.split('-').map(Number);
        end = new Date(ey, em - 1, ed);
    } else {
        end = endDate;
    }

    if (end < start) return -1;

    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
        const isSunday = cur.getDay() === 0;
        const holidayName = getHolidayName(cur);

        if (!isSunday && !holidayName) {
            count++;
        }

        cur.setDate(cur.getDate() + 1);
    }

    return count;
}

/**
 * Returns breakdown of non-working days in interval (Sundays and Public Holidays encountered).
 */
export function getLeaveBreakdown(startDate, endDate) {
    if (!startDate || !endDate) return null;

    let start, end;
    if (typeof startDate === 'string') {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        start = new Date(sy, sm - 1, sd);
    } else {
        start = startDate;
    }

    if (typeof endDate === 'string') {
        const [ey, em, ed] = endDate.split('-').map(Number);
        end = new Date(ey, em - 1, ed);
    } else {
        end = endDate;
    }

    if (end < start) return null;

    let workingDays = 0;
    const publicHolidaysEncountered = [];
    let sundaysCount = 0;

    const cur = new Date(start);
    while (cur <= end) {
        const isSunday = cur.getDay() === 0;
        const holidayName = getHolidayName(cur);

        if (isSunday) {
            sundaysCount++;
        } else if (holidayName) {
            publicHolidaysEncountered.push({
                date: formatDateKey(cur),
                name: holidayName
            });
        } else {
            workingDays++;
        }

        cur.setDate(cur.getDate() + 1);
    }

    return {
        workingDays,
        sundaysCount,
        publicHolidaysCount: publicHolidaysEncountered.length,
        publicHolidays: publicHolidaysEncountered
    };
}
