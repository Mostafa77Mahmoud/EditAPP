import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { I18nManager, Platform } from "react-native";
import * as Updates from "expo-updates";
import { storage, storageKeys } from '../utils/storage';
import en from "../locales/en.json";
import ar from "../locales/ar.json";

const translations = { en, ar };

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const applyWebRTL = (isRTL: boolean) => {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.style.direction = isRTL ? "rtl" : "ltr";

    // Remove existing style if present
    const existingStyle = document.getElementById("rtl-style");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new style
    const style = document.createElement("style");
    style.id = "rtl-style";
    style.innerHTML = `
      * {
        ${isRTL ? `
          text-align: right !important;
          direction: rtl !important;
        ` : `
          text-align: left !important;
          direction: ltr !important;
        `}
      }

      /* Arabic text specific fixes */
      p, span, div, h1, h2, h3, h4, h5, h6 {
        ${isRTL ? `
          text-align: right !important;
          direction: rtl !important;
          unicode-bidi: embed;
        ` : `
          text-align: left !important;
          direction: ltr !important;
        `}
      }
    `;

    if (!document.head.contains(style)) {
      document.head.appendChild(style);
    }
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await storage.getItemAsync(storageKeys.SHARIAA_LANGUAGE);
        if (storedLanguage && ["en", "ar"].includes(storedLanguage)) {
          const lang = storedLanguage as Language;
          setLanguageState(lang);

          const isRTL = lang === "ar";

          // Apply RTL for native platforms
          if (Platform.OS !== "web") {
            try {
              I18nManager.forceRTL(isRTL);
              I18nManager.allowRTL(isRTL);
            } catch (error) {
              console.warn("I18nManager not available:", error);
            }
          } else {
            // Apply RTL for web
            applyWebRTL(isRTL);
          }
        }
      } catch (error) {
        console.warn("Failed to load language from storage", error);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    try {
      setLanguageState(lang);
      await storage.setItemAsync(storageKeys.SHARIAA_LANGUAGE, lang);

      const isRTL = lang === "ar";

      if (Platform.OS !== "web") {
        try {
          I18nManager.forceRTL(isRTL);
          I18nManager.allowRTL(isRTL);

          // For native platforms, we might need to reload the app
          await Updates.reloadAsync();
        } catch (error) {
          console.warn("I18nManager not available:", error);
        }
      } else {
        applyWebRTL(isRTL);
      }
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let value: any = translations[language];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return key; // Return key if translation not found
        }
      }

      return typeof value === "string" ? value : key;
    },
    [language],
  );

  const isRTL = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageProvider;