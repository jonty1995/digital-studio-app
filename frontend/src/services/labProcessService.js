import { api, API_BASE_URL } from "./api";

export const saveLabProcessLog = async (action, category = null, recipient = null, groupSummary = null, files = null) => {
    try {
        return await api.post("/lab-process/logs", {
            action,
            category,
            recipient,
            groupSummary,
            fileListJson: Array.isArray(files) ? files.map(f => f.name || f).join(", ") : (files || "")
        });
    } catch (e) {
        console.error("Failed to save lab process log", e);
        return null;
    }
};

export const updateLabProcessLog = async (id, action) => {
    try {
        return await api.put(`/lab-process/logs/${id}`, { action });
    } catch (e) {
        console.error("Failed to update lab process log", e);
        return false;
    }
};

export const deleteLabProcessLog = async (id) => {
    try {
        return await api.delete(`/lab-process/logs/${id}`);
    } catch (e) {
        console.error("Failed to delete lab process log", e);
        return false;
    }
};

export const fetchLabProcessLogs = async () => {
    try {
        return await api.get("/lab-process/logs");
    } catch (e) {
        console.error("Failed to fetch lab process logs", e);
        return [];
    }
};

export const checkFolderExists = async (processDate) => {
    try {
        return await api.get(`/lab-process/check-exists?processDate=${processDate}`);
    } catch (e) {
        console.error("Failed to check folder existence", e);
        return { exists: false };
    }
};

export const generateGroup = async (groupName, files, processDate) => {
    const formData = new FormData();
    formData.append("groupName", groupName);
    formData.append("processDate", processDate);
    files.forEach(f => {
        formData.append("files", f.file);
    });

    return await api.post("/lab-process/generate", formData);
};

export const openFolder = async (processDate, logId = null) => {
    let url = `/lab-process/open-folder?processDate=${processDate}`;
    if (logId) {
        url += `&logId=${logId}`;
    }
    return await api.get(url);
};

export const getPreviewUrl = (processDate, groupName, fileName) => {
    return `${API_BASE_URL}/lab-process/preview?processDate=${processDate}&groupName=${groupName}&fileName=${fileName}`;
};
