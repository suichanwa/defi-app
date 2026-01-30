import * as Localization from "expo-localization";
import I18n from "i18n-js";
import type { LanguageCode } from "../types/profile";

const translations = {
  en: {
    wallet: {
      setupTitle: "Set up your wallet",
      setupSubtitle: "Create a new wallet or import with a 12/24-word phrase.",
      create: "Create wallet",
      import: "Import wallet",
      helpTitle: "Wallet setup",
      helpBody:
        "Create: generates a new seed phrase and encrypts it locally.\n\nImport: paste your 12/24-word phrase and set a password to encrypt it on this device.\n\nKeep your seed phrase offline—losing it means losing access.",
      password: "Password",
      passwordConfirm: "Confirm password",
      importPlaceholder: "12 or 24 word phrase",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      back: "Back",
      encrypting: "Encrypting wallet...",
      decrypting: "Decrypting phrase...",
    },
    language: {
      title: "Languages",
      subtitle: "Choose your preferred language.",
      save: "Save language",
      labels: {
        en: "English (default)",
        ru: "Русский",
        ro: "Română",
      },
    },
  },
  ru: {
    wallet: {
      setupTitle: "Настройка кошелька",
      setupSubtitle: "Создайте новый кошелек или импортируйте 12/24 слова.",
      create: "Создать кошелек",
      import: "Импортировать",
      helpTitle: "Настройка кошелька",
      helpBody:
        "Создание: генерирует новую seed-фразу и шифрует ее локально.\n\nИмпорт: вставьте 12/24 слова и задайте пароль для шифрования на этом устройстве.\n\nХраните seed офлайн — потеря фразы означает потерю доступа.",
      password: "Пароль",
      passwordConfirm: "Подтвердите пароль",
      importPlaceholder: "12 или 24 слова",
      newPassword: "Новый пароль",
      confirmPassword: "Подтвердите пароль",
      back: "Назад",
      encrypting: "Шифрование кошелька...",
      decrypting: "Расшифровка фразы...",
    },
    language: {
      title: "Языки",
      subtitle: "Выберите предпочтительный язык.",
      save: "Сохранить язык",
      labels: {
        en: "English (по умолчанию)",
        ru: "Русский",
        ro: "Română",
      },
    },
  },
  ro: {
    wallet: {
      setupTitle: "Configurează-ți portofelul",
      setupSubtitle:
        "Creează un portofel nou sau importă o frază de 12/24 cuvinte.",
      create: "Creează portofel",
      import: "Importă",
      helpTitle: "Configurare portofel",
      helpBody:
        "Creează: generează o frază seed nouă și o criptează local.\n\nImportă: lipește fraza de 12/24 cuvinte și setează o parolă pentru criptare pe acest dispozitiv.\n\nPăstrează fraza seed offline — pierderea ei înseamnă pierderea accesului.",
      password: "Parolă",
      passwordConfirm: "Confirmă parola",
      importPlaceholder: "Frază de 12 sau 24 de cuvinte",
      newPassword: "Parolă nouă",
      confirmPassword: "Confirmă parola",
      back: "Înapoi",
      encrypting: "Se criptează portofelul...",
      decrypting: "Se decriptează fraza...",
    },
    language: {
      title: "Limbi",
      subtitle: "Alege limba preferată.",
      save: "Salvează limba",
      labels: {
        en: "English (implicit)",
        ru: "Русский",
        ro: "Română",
      },
    },
  },
};

/* -------------------- */
/* i18n-js v3 SETUP     */
/* -------------------- */

I18n.translations = translations;
I18n.locale = Localization.getLocales()[0]?.languageCode ?? "en";

/* -------------------- */
/* Helpers              */
/* -------------------- */

export const setLanguage = (code: LanguageCode) => {
  I18n.locale = code;
};

export const t = (scope: string, options?: Record<string, unknown>) =>
  I18n.t(scope, options);

export const getLanguage = () =>
  (I18n.locale as LanguageCode) || "en";

export const availableLanguages: { code: LanguageCode; label: string }[] = [
  { code: "en", label: translations.en.language.labels.en },
  { code: "ru", label: translations.en.language.labels.ru },
  { code: "ro", label: translations.en.language.labels.ro },
];

export default I18n;
