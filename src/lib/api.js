import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_PROXY_TARGET}${import.meta.env.VITE_API_URL}`
});

export function assetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  const configuredOrigin = import.meta.env.VITE_API_PROXY_TARGET;
  const useConfiguredOrigin = configuredOrigin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredOrigin);
  const origin = useConfiguredOrigin ? configuredOrigin : window.location.origin;
  return new URL(value, origin).href;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("za_food_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("za_food_token");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function messageFromError(error) {
  return error.response?.data?.message || "Unable to complete the request.";
}
