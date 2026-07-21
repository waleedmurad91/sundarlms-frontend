# SundarSTEM LMS – Frontend

React/Vite single-page application that powers the SundarSTEM learning management system’s admin experience. The UI covers login, an authenticated dashboard, and management tooling for schools, classes, teachers, students, subjects, units, topics, and questions.

---

## Tech Stack
- **Frontend Framework:** React 19 with Vite 7
- **Routing:** React Router 7 (`BrowserRouter` with `/sundarstem-lms` basename)
- **State Management:** Zustand for auth/session state
- **HTTP Client:** Axios (pre-configured instance with `withCredentials` and Sanctum-friendly defaults)
- **Styling:** Tailwind CSS 4 with Radix UI primitives and custom theming
- **Notifications & Icons:** `react-hot-toast`, `lucide-react`

---

## Getting Started

### Prerequisites
- Node.js 20+ (LTS recommended)
- pnpm/npm/yarn (examples below use npm)
- Running Laravel API that issues Sanctum tokens (see `.env` for base URL)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` if you have one, or edit `.env` directly:
```bash
VITE_API_URL=http://100.1.1.250:81/example-app/public
```
`VITE_API_URL` should point to the Laravel app **without** the `/api` segment—the axios instance appends `/api` automatically. Update this when switching environments (local, staging, production).

### 3. Run the dev server
```bash
npm run dev
```
The app serves at `http://localhost:5173/sundarstem-lms/` to match the router basename. Hot Module Replacement is enabled by Vite.

### Additional scripts
- `npm run build` – production build outputs to `dist/`
- `npm run preview` – serve a build locally
- `npm run lint` – run ESLint with the project ruleset

---

## Project Structure (key folders)
```
src/
├─ api/              # axios instance and REST helpers
├─ assets/           # static images (e.g., login illustration)
├─ components/       # shared UI pieces (navigation, alerts, etc.)
├─ layouts/          # AuthLayout and MainLayout shells
├─ pages/            # Feature screens (auth + admin modules)
├─ routes/           # Route definitions and ProtectedRoute guard
├─ store/            # Zustand auth store
└─ styles/           # Global Tailwind CSS overrides
```

---

## Authentication Flow
1. `Login.jsx` calls the Zustand `useAuthStore().login`, which in turn hits `POST /login` and stores the returned Sanctum token in memory.
2. `axiosInstance` adds the bearer token to the `Authorization` header for subsequent API calls.
3. `ProtectedRoute` uses `checkAuth()` to call `GET /me` whenever the app loads or refreshes. If the token is missing/invalid Sanctum returns 401 and users are redirected back to `/login`.

> **Laravel setup note:** Ensure Sanctum is configured to issue personal-access tokens that the frontend can send as bearer tokens. CORS must allow `http://localhost:5173` with `Authorization` headers, and `/login`, `/logout`, and `/me` should reside under `/api`.

---

## Deployment Notes
- Update `VITE_API_URL` per environment (and rebuild).
- If the app will be hosted at a different sub-path, adjust the router basename in `src/routes/AppRoutes.jsx`.
- Make sure the backend supports HTTPS if you plan to move to secure cookies instead of bearer tokens.

---

## Troubleshooting
- **401 on `/me`:** The `Authorization` header is likely missing or expired. Confirm login returns a token and that CORS allows the header.
- **Blank screen after build:** Check your hosting sub-path; Vite assumes `/` unless `base` is configured in `vite.config.js` alongside the router basename.
- **Styling differences:** Tailwind utilities load via `src/styles/global.css`. Ensure the CSS file is imported in `src/main.jsx`.

---

## License

Internal project. All rights reserved to SundarSTEM. Update this section if a formal license is needed.
