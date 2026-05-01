/**
 * Unified Date Utilities for streamlined date handling across the application.
 * All timestamps from backend are expected to be UTC (ISO 8601 with 'Z').
 */

export const DateUtils = {
    /**
     * Formats a date or string into a localized string (IST).
     * @param {Date|string|null} date 
     * @param {Object} options - toLocaleString options
     */
    format: (date, options) => {
        const d = DateUtils.getISTDate(date);
        if (!d) return "-";

        const finalOptions = {
            ...(options || { dateStyle: 'short', timeStyle: 'short' }),
            timeZone: 'UTC' // We've already shifted the date object to IST, so we format its UTC value
        };

        try {
            return new Intl.DateTimeFormat('en-IN', finalOptions).format(d);
        } catch (e) {
            return d.toLocaleString('en-IN', finalOptions);
        }
    },

    /**
     * Formats a date to show only time in IST.
     */
    formatTime: (date) => {
        const d = DateUtils.getISTDate(date);
        if (!d) return "-";
        try {
            return new Intl.DateTimeFormat('en-IN', {
                timeZone: 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(d);
        } catch (e) {
            return d.toLocaleTimeString('en-IN', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: true });
        }
    },

    /**
     * Formats a date string/object to DD/MM/YYYY in IST
     */
    formatDate: (date) => {
        const d = DateUtils.getISTDate(date);
        if (!d) return "-";
        try {
            return new Intl.DateTimeFormat('en-IN', {
                timeZone: 'UTC',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(d);
        } catch (e) {
            return d.toLocaleDateString('en-IN', { timeZone: 'UTC' });
        }
    },

    /**
     * Formats a date for form inputs (YYYY-MM-DD) based on IST.
     */
    formatForInput: (date) => {
        if (!date) return "";
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return "";
        
        // Get date in IST
        const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(d);
    },

    /**
     * Converts any input to a Date object safely.
     * If the string lacks a timezone (no 'Z' and no '+'), it's treated as a local time string.
     */
    toDate: (val) => {
        if (!val) return null;
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

        let dateStr = String(val).trim();
        
        // Handle ISO-like strings (2023-10-27T10:00:00)
        if (dateStr.includes('-') && !dateStr.includes('T')) {
            dateStr = dateStr.replace(' ', 'T');
        }
        
        // Check if it's already UTC/Offset aware
        const isOffsetAware = dateStr.includes('Z') || dateStr.includes('+');
        
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            console.warn("DateUtils: Failed to parse date string", val);
            return null;
        }

        // Store whether it was offset aware on the date object for getISTDate
        d._isOffsetAware = isOffsetAware;
        return d;
    },

    /**
     * Internal helper to get a date shifted to IST regardless of browser timezone.
     */
    getISTDate: (date) => {
        const d = DateUtils.toDate(date);
        if (!d) return null;
        
        // If it was already a local time string (no Z), it's likely already IST from our backend.
        // We just need to ensure it's treated as UTC for the 'en-IN' + 'timeZone: UTC' formatter.
        if (typeof date === 'string' && !date.includes('Z') && !date.includes('+')) {
            // It's already IST. To make our UTC-based formatter work, 
            // we treat these local "numbers" as UTC.
            const local = new Date(date.replace(' ', 'T'));
            const utc = local.getTime() - (local.getTimezoneOffset() * 60000);
            return new Date(utc);
        }

        // For actual UTC dates (or JS Date objects), we shift them by 5.5 hours
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 5.5));
    },

    /**
     * Gets UTC ISO string for start of an IST day (00:00:00)
     */
    getStartOfDayUTC: (dateStr) => {
        if (!dateStr) return "";
        return new Date(`${dateStr}T00:00:00+05:30`).toISOString();
    },

    /**
     * Gets UTC ISO string for end of an IST day (23:59:59)
     */
    getEndOfDayUTC: (dateStr) => {
        if (!dateStr) return "";
        return new Date(`${dateStr}T23:59:59+05:30`).toISOString();
    }
};
