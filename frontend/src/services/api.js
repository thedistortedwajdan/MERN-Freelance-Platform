import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API = axios.create({ baseURL });

// JWT token handling
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Access tokens are short-lived: on a 401, trade the refresh token for a new
// pair once (shared between concurrent requests) and retry the original call.
let refreshing = null;

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const refreshToken = localStorage.getItem("refreshToken");
    const isAuthCall = original?.url?.includes("/auth/");

    if (error.response?.status === 401 && refreshToken && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${baseURL}/auth/refresh`, { refreshToken }).finally(() => {
            refreshing = null;
          });
        const { data } = await refreshing;
        localStorage.setItem("token", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
        original.headers.Authorization = `Bearer ${data.token}`;
        return API(original);
      } catch {
        clearSession();
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default API;
