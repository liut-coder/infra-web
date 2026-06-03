import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  zh: {
    translation: {
      login: "登录",
      dashboard: "总览",
      settings: "系统设置",
      language: "简体中文",
    },
  },
  en: {
    translation: {
      login: "Sign in",
      dashboard: "Dashboard",
      settings: "Settings",
      language: "English",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("nax-locale") || "zh",
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(language: "zh" | "en") {
  localStorage.setItem("nax-locale", language);
  return i18n.changeLanguage(language);
}

export default i18n;
