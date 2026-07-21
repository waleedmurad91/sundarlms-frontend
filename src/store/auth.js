import { create } from "zustand";
import axiosInstance from "@/api/axiosInstance";
import {
  getRoleBasedNavigation,
  loginApi,
  logoutApi,
} from "@/api/authApi";
import { normalizeRole } from "@/utils/adminRbac";
import { normalizeNavigationSections } from "@/utils/roleLinks";

const getSavedToken = () =>
  localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");

const clearStoredToken = () => {
  localStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_token");
};

const getEmptySessionState = () => ({
  user: null,
  student: null,
  school: null,
  token: null,
  role: null,
  accessRole: null,
  rbacRoles: [],
  permissions: [],
  permissionMatrix: {},
  navigation: [],
  isAuthenticated: false,
});

const buildSessionState = ({ token, payload, navigationPayload }) => {
  const user = payload?.user ?? null;
  const student = payload?.student ?? null;
  const school = payload?.school ?? null;
  const role = normalizeRole(user?.role);

  return {
    user,
    student,
    school,
    token: token ?? null,
    role,
    accessRole: user?.access_role ?? null,
    rbacRoles: Array.isArray(user?.rbac_roles) ? user.rbac_roles : [],
    permissions: Array.isArray(user?.permissions) ? user.permissions : [],
    permissionMatrix:
      user?.permission_matrix && typeof user.permission_matrix === "object"
        ? user.permission_matrix
        : {},
    navigation: normalizeNavigationSections(navigationPayload ?? user?.navigation),
    isAuthenticated: Boolean(token && user),
  };
};

export const useAuthStore = create((set, get) => ({
  ...getEmptySessionState(),
  loading: false,
  justLoggedIn: false,

  persistToken: (token) => {
    if (!token) return;
    localStorage.setItem("auth_token", token);
    sessionStorage.setItem("auth_token", token);
  },

  login: async (credentials) => {
    try {
      set({ loading: true });
      const data = await loginApi(credentials);
      const token = data?.token;

      if (!token) {
        throw new Error("Login response did not include an auth token.");
      }

      axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
      get().persistToken(token);
      set({ token });

      const sessionPayload = await get().checkAuth({
        silent: true,
        tokenOverride: token,
      });

      if (!sessionPayload?.user) {
        throw new Error("Unable to initialize the authenticated session.");
      }

      set({ justLoggedIn: true, loading: false });
      setTimeout(() => set({ justLoggedIn: false }), 2000);

      return data;
    } catch (error) {
      clearStoredToken();
      delete axiosInstance.defaults.headers.common.Authorization;
      set({ ...getEmptySessionState(), loading: false, justLoggedIn: false });
      throw error;
    }
  },

  // Single step — auto-fills first/last name from Google profile
  googleLogin: async (credential) => {
    try {
      set({ loading: true });

      // Step 1: send credential
      const { data } = await axiosInstance.post("/student-signup/google", {
        credential,
      });

      // Backend needs name to complete signup — send it automatically
      if (data?.requires_username) {
        const fullName = data.google_profile?.name ?? "";
        const nameParts = fullName.trim().split(" ");
        const first_name = nameParts[0] ?? "";
        const last_name = nameParts.slice(1).join(" ") ?? "";
        const username = "waleedmurad_91";


        const { data: signupData } = await axiosInstance.post(
          "/student-signup/google",
          {
            credential,
            username,
          }
        );

        console.log("Step 2 response:", signupData); // ← add this

        const token = signupData?.token;
        if (!token) {
          throw new Error(
            "Google signup response did not include an auth token."
          );
        }

        return await get()._finalizeGoogleLogin(token);
      }

      // Existing Google account — token returned directly
      const token = data?.token;
      if (!token) {
        throw new Error("Google login response did not include an auth token.");
      }

      return await get()._finalizeGoogleLogin(token);
    } catch (error) {
      clearStoredToken();
      delete axiosInstance.defaults.headers.common.Authorization;
      set({ ...getEmptySessionState(), loading: false, justLoggedIn: false });
      throw error;
    }
  },

  // Internal: finalize session after token is received
  _finalizeGoogleLogin: async (token) => {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
    get().persistToken(token);
    set({ token });

    const sessionPayload = await get().checkAuth({
      silent: true,
      tokenOverride: token,
    });

    if (!sessionPayload?.user) {
      throw new Error("Unable to initialize session after Google login.");
    }

    set({ justLoggedIn: true, loading: false });
    setTimeout(() => set({ justLoggedIn: false }), 2000);

    return sessionPayload;
  },

  checkAuth: async ({ silent = false, tokenOverride } = {}) => {
    try {
      if (!silent) {
        set({ loading: true });
      }

      let token = tokenOverride ?? get().token;
      if (!token) {
        token = getSavedToken();
      }

      if (!token) {
        throw new Error("No token found");
      }

      axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;

      const [meResult, navigationResult] = await Promise.allSettled([
        axiosInstance.get("/me"),
        getRoleBasedNavigation(),
      ]);

      if (meResult.status !== "fulfilled") {
        throw meResult.reason;
      }

      const mePayload = meResult.value?.data ?? {};
      const navigationPayload =
        navigationResult.status === "fulfilled" ? navigationResult.value : null;

      set({
        ...buildSessionState({
          token,
          payload: mePayload,
          navigationPayload,
        }),
        loading: false,
      });

      return mePayload;
    } catch (error) {
      console.log("authstoreerror", error);
      clearStoredToken();
      delete axiosInstance.defaults.headers.common.Authorization;
      set({ ...getEmptySessionState(), loading: false, justLoggedIn: false });
      return null;
    }
  },

  logout: async () => {
    try {
      const { token } = get();

      if (!token) {
        console.warn("No token found, skipping logout API call.");
      } else {
        const response = await logoutApi(token);
        console.log("Logout API response:", response);
      }
    } catch (error) {
      console.warn("Logout API failed:", error);
    } finally {
      clearStoredToken();
      delete axiosInstance.defaults.headers.common.Authorization;
      set({ ...getEmptySessionState(), loading: false, justLoggedIn: false });
    }
  },

  updateUser: (nextUser) => {
    if (!nextUser) return;

    set((state) => {
      const mergedUser = { ...state.user, ...nextUser };

      return {
        ...buildSessionState({
          token: state.token,
          payload: {
            user: mergedUser,
            student: nextUser.student ?? state.student,
            school: nextUser.school ?? state.school,
          },
          navigationPayload: state.navigation,
        }),
        loading: false,
        justLoggedIn: state.justLoggedIn,
      };
    });
  },
}));