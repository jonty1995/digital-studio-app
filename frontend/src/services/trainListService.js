import { api } from "./api";

export const trainListService = {
  getAll: () => api.get("/train-list"),
  search: (query) => api.get(`/train-list/search?query=${query}`),
  refresh: () => api.post("/train-list/refresh", {}),
};
