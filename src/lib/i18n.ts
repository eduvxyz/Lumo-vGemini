import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      "welcome": "Hola, Lumo",
      "calculating": "Tu dinero libre está calculándose...",
      "safe_to_spend": "Dinero Libre (Safe-to-Spend)",
      "login": "Iniciar Sesión",
      "email": "Correo electrónico",
      "password": "Contraseña",
      "sign_in": "Entrar",
      "sign_up": "Crear cuenta",
      "no_account": "¿No tienes cuenta?",
      "have_account": "¿Ya tienes cuenta?",
      "loading": "Cargando..."
    }
  },
  en: {
    translation: {
      "welcome": "Hello, Lumo",
      "calculating": "Calculating your safe-to-spend...",
      "safe_to_spend": "Safe-to-Spend",
      "login": "Login",
      "email": "Email",
      "password": "Password",
      "sign_in": "Sign In",
      "sign_up": "Sign Up",
      "no_account": "Don't have an account?",
      "have_account": "Already have an account?",
      "loading": "Loading..."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "es", // Idioma por defecto
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

// Utilidad para formatear moneda (Intl)
export const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'es-CO') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};
