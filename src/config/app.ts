export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || "Infra Control",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  useMock: import.meta.env.VITE_USE_MOCK === "true",
  loginBackground:
    import.meta.env.VITE_LOGIN_BACKGROUND ||
    "/images/login/login-bg-cloud-city.png",
  loginIllustration: "/images/login/login-illustration-crop.png",
  logoMark: "/brand/nax-logo-mark.svg",
  logoHorizontal: "/brand/nax-logo-horizontal.svg",
};
