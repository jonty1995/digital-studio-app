import { api } from "./api";

export const fileService = {
    upload: async (file, source) => {
        const formData = new FormData();
        formData.append("file", file);
        if (source) formData.append("source", source);

        const response = await fetch("http://localhost:8081/api/files/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Upload failed");
        }
        return await response.json();
    },

    getAll: async () => {
        const response = await fetch("http://localhost:8081/api/files");
        if (!response.ok) throw new Error("Failed to fetch uploads");
        return await response.json();
    },

    lookup: async (id) => {
        const response = await fetch(`http://localhost:8081/api/files/lookup/${id}`);
        if (!response.ok) throw new Error("File not found");
        return await response.json();
    }
};
