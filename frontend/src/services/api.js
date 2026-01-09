const API_BASE_URL = import.meta.env.VITE_API_DIR || "/api";

export const api = {
    get: async (endpoint) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    },
    post: async (endpoint, data) => {
        const isFormData = data instanceof FormData;
        const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
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
        const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
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
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.error) errorMsg = errData.error;
            } catch (e) { }
            throw new Error(`API Error: ${errorMsg}`);
        }
        // Return true or json? FileService expects true or check response.
        // Delete usually returns 200 OK or 204 No Content.
        // If 204, .json() fails.
        if (response.status === 204) return true;
        try {
            return await response.json();
        } catch (e) {
            return true;
        }
    }
};
