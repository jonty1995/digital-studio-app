import { api } from "./api";

export const stationService = {
  getAll: () => api.get("/stations"),
  search: (query) => api.get(`/stations/search?query=${query}`),
  refresh: () => api.post("/stations/refresh", {}),
};
