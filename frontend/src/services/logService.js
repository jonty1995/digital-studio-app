import { api } from "./api";

/**
 * Frontend logging service that relays events to the backend for Splunk indexing.
 */
export const logService = {
    info: async (message) => {
        return sendLog("INFO", message);
    },
    warn: async (message) => {
        return sendLog("WARN", message);
    },
    error: async (message) => {
        return sendLog("ERROR", message);
    }
};

const sendLog = async (level, message) => {
    try {
        // We use our centralized api utility to POST to the relay endpoint
        await api.post("/logs/relay", { level, message });
    } catch (e) {
        // Fallback to console if relay fails to avoid losing information
        console.error(`[LOG_RELAY_FAILED] ${level}: ${message}`, e);
    }
};
