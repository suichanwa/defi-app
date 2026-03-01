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
      sendCrypto: {
        title: "Send %{symbol}",
        fallbackSymbol: "Crypto",
        addressLabel: "Address/Invoice",
        addressPlaceholder: "Long press to paste",
        networkLabel: "Network",
        networkPlaceholder: "Automatically match the network",
        amountLabel: "Withdraw Amount",
        amountPlaceholder: "Minimum 0",
        max: "Max",
        available: "Available",
        sending: "Sending...",
        withdraw: "Withdraw",
        errors: {
          enterRecipient: "Enter a recipient address.",
          enterAmount: "Enter a valid amount.",
          insufficientBalance: "Insufficient balance.",
          onlySolSupported: "Only SOL transfers are supported on devnet right now.",
          solanaRequired: "Solana devnet is required for sending right now.",
          walletLocked: "Wallet is locked. Unlock to send.",
          unableToSend: "Unable to send transaction.",
        },
      },
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
      sendCrypto: {
        title: "Отправить %{symbol}",
        fallbackSymbol: "Крипто",
        addressLabel: "Адрес/инвойс",
        addressPlaceholder: "Удерживайте для вставки",
        networkLabel: "Сеть",
        networkPlaceholder: "Автоматически определить сеть",
        amountLabel: "Сумма вывода",
        amountPlaceholder: "Минимум 0",
        max: "Макс",
        available: "Доступно",
        sending: "Отправка...",
        withdraw: "Вывести",
        errors: {
          enterRecipient: "Введите адрес получателя.",
          enterAmount: "Введите корректную сумму.",
          insufficientBalance: "Недостаточно средств.",
          onlySolSupported: "Сейчас на devnet поддерживаются только переводы SOL.",
          solanaRequired: "Для отправки сейчас требуется Solana devnet.",
          walletLocked: "Кошелек заблокирован. Разблокируйте, чтобы отправить.",
          unableToSend: "Не удалось отправить транзакцию.",
        },
      },
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
      sendCrypto: {
        title: "Trimite %{symbol}",
        fallbackSymbol: "Crypto",
        addressLabel: "Adresă/Factură",
        addressPlaceholder: "Apasă lung pentru lipire",
        networkLabel: "Rețea",
        networkPlaceholder: "Potrivește automat rețeaua",
        amountLabel: "Suma de retragere",
        amountPlaceholder: "Minim 0",
        max: "Max",
        available: "Disponibil",
        sending: "Se trimite...",
        withdraw: "Retrage",
        errors: {
          enterRecipient: "Introdu o adresă a destinatarului.",
          enterAmount: "Introdu o sumă validă.",
          insufficientBalance: "Sold insuficient.",
          onlySolSupported: "Momentan pe devnet sunt suportate doar transferurile SOL.",
          solanaRequired: "Pentru trimitere este necesar Solana devnet.",
          walletLocked: "Portofelul este blocat. Deblochează-l pentru a trimite.",
          unableToSend: "Nu s-a putut trimite tranzacția.",
        },
      },
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
