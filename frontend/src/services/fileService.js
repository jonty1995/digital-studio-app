import { api } from "./api";

export const fileService = {
    upload: async (file, source) => {
        const formData = new FormData();
        formData.append("file", file);
        if (source) formData.append("source", source);

        return await api.post("/files/upload", formData);
    },

    getAll: async () => {
        return await api.get("/files");
    },

    lookup: async (id) => {
        return await api.get(`/files/lookup/${id}`);
    },

    delete: async (id, remarks) => {
        let url = `/files/${id}`;
        if (remarks) {
            url += `?remarks=${encodeURIComponent(remarks)}`;
        }
        return await api.delete(url);
    }
};
