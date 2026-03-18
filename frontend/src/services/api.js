const API_BASE_URL = import.meta.env.VITE_API_DIR || "/api";
console.log("API_BASE_URL:", API_BASE_URL);

const getHeaders = (initialHeaders = {}) => {
    const token = localStorage.getItem("token");
    if (token) {
        return { ...initialHeaders, 'Authorization': `Bearer ${token}` };
    }
    return initialHeaders;
};

export const api = {
    get: async (endpoint, options = {}) => {
        options.headers = getHeaders(options.headers);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
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
        return response.json();
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
        return response.json();
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
            return await response.json();
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
        return response.json();
    }
};
