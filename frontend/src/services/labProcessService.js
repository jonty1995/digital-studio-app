import { api } from "./api";

export const saveLabProcessLog = async (action, category = null, recipient = null, groupSummary = null, files = null) => {
    try {
        return await api.post("/lab-process/logs", {
            action,
            category,
            recipient,
            groupSummary,
            fileListJson: files ? files.map(f => f.name || f).join(", ") : ""
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

export const fetchLabProcessLogs = async () => {
    try {
        return await api.get("/lab-process/logs");
    } catch (e) {
        console.error("Failed to fetch lab process logs", e);
        return [];
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

export const checkFolderExists = async (processDate) => {
    return await api.get(`/lab-process/check-exists?processDate=${processDate}`);
};

export const clearFolder = async (processDate) => {
    return await api.delete(`/lab-process/folder?processDate=${processDate}`);
};

export const generateGroup = async (groupName, files, processDate) => {
    const formData = new FormData();
    formData.append("groupName", groupName);
    formData.append("processDate", processDate);
    files.forEach(fileObj => {
        formData.append("files", fileObj.file || fileObj);
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
