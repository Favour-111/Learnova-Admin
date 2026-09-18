import axios from "axios";

// The one place that knows the backend's address. Change NEXT_PUBLIC_API_URL
// in .env.local to point this dashboard at local / staging / production.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

// Called once from a client provider with Clerk's getToken so every
// request carries the admin's session JWT (checked server-side by
// requireAuth + requireAdmin on every /api/admin/* route).
export function attachAuthToken(getToken: () => Promise<string | null>) {
  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}
