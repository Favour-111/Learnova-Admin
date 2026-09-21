import axios from "axios";

// The one place that knows the backend's address. Change NEXT_PUBLIC_API_URL
// in .env.local to point this dashboard at local / staging / production.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  // Harmless against a real deployed backend (Render ignores it), but
  // required when API_URL points at an ngrok tunnel for local dev  ngrok's
  // free tier serves an HTML "you are about to visit..." interstitial to
  // any browser-originated request by default, which has no CORS headers
  // of its own and surfaces here as a misleading "blocked by CORS policy"
  // error even though the backend's actual CORS config is correct.
  headers: { "ngrok-skip-browser-warning": "true" },
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
