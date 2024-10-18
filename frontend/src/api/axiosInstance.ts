import axios from "axios";
import { AppStore } from "@/store"; // Adjust this import based on your store setup

let store: AppStore;

export const injectStore = (_store: AppStore) => {
  store = _store;
};

const axiosInstance = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:5000/api/unstable",
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the current Redux state
    if (store) {
      const state = store.getState();
      const token = state.user.access_token;

      // If token is present, add it to the request headers
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
