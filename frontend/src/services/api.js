const API_BASE_URL = import.meta.env.VITE_API_DIR || "/api";
console.log("API_BASE_URL:", API_BASE_URL);

const getHeaders = (initialHeaders = {}) => {
    const token = localStorage.getItem("token");
    if (token) {
        return { ...initialHeaders, 'Authorization': `Bearer ${token}` };
    }
    return initialHeaders;
};

const normalizeDates = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    // Don't recurse into Date objects
    if (obj instanceof Date) return obj;

    if (Array.isArray(obj)) {
        return obj.map(normalizeDates);
    }
    
    const newObj = {};
    for (const key in obj) {
        const val = obj[key];
        if (typeof val === 'string') {
            // ISO 8601 regex: 2023-10-27T10:00:00 or 2023-10-27T10:00:00.123 (with or without Z)
            const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
            if (isoDateTimeRegex.test(val)) {
                let dateStr = val;
                // If it looks like ISO but has no timezone indicator, treat as UTC (Z)
                if (!val.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(val)) {
                    dateStr += 'Z';
                }
                newObj[key] = new Date(dateStr);
            } else {
                newObj[key] = val;
            }
        } else if (typeof val === 'object') {
            newObj[key] = normalizeDates(val);
        } else {
            newObj[key] = val;
        }
    }
    return newObj;
};

export const api = {
    get: async (endpoint, options = {}) => {
        options.headers = getHeaders(options.headers);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        if (response.status === 204 || response.headers.get("content-length") === "0") return true;
        try {
            const resData = await response.json();
            return normalizeDates(resData);
        } catch (e) {
            return true;
        }
    },
    post: async (endpoint, data) => {
        const isFormData = data instanceof FormData;
        const baseHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
        const headers = getHeaders(baseHeaders);
        const body = isFormData ? data : JSON.stringify(data);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body,
        });
        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.error) errorMsg = errData.error;
            } catch (e) { }
            throw new Error(`API Error: ${errorMsg}`);
        }
        if (response.status === 204 || response.headers.get("content-length") === "0") return true;
        try {
            const resData = await response.json();
            return normalizeDates(resData);
        } catch (e) {
            return true;
        }
    },
    put: async (endpoint, data) => {
        const isFormData = data instanceof FormData;
        const baseHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
        const headers = getHeaders(baseHeaders);
        const body = isFormData ? data : JSON.stringify(data);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body,
        });
        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.error) errorMsg = errData.error;
            } catch (e) { }
            throw new Error(`API Error: ${errorMsg}`);
        }
        const resData = await response.json();
        return normalizeDates(resData);
    },
    delete: async (endpoint) => {
        const headers = getHeaders();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.error) errorMsg = errData.error;
            } catch (e) { }
            throw new Error(`API Error: ${errorMsg}`);
        }
        if (response.status === 204) return true;
        try {
            const resData = await response.json();
            return normalizeDates(resData);
        } catch (e) {
            return true;
        }
    },
    patch: async (endpoint, data) => {
        const baseHeaders = { 'Content-Type': 'application/json' };
        const headers = getHeaders(baseHeaders);
        const body = typeof data === 'string' ? data : JSON.stringify(data);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers,
            body,
        });
        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.error) errorMsg = errData.error;
            } catch (e) { }
            throw new Error(`API Error: ${errorMsg}`);
        }
        if (response.status === 204 || response.headers.get("content-length") === "0") return true;
        try {
            const resData = await response.json();
            return normalizeDates(resData);
        } catch (e) {
            return true;
        }
    }
};
