
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? "");

    if (
      status === 401 &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/auth/signup")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
