import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      "welcome": "Hola, {{name}}",
      "calculating": "Tu dinero libre está calculándose...",
      "safe_to_spend": "Dinero Libre (Safe-to-Spend)",
      "profile": "Perfil",
      "configure_account": "Configura tu cuenta",
      "full_name": "Nombre Completo",
      "main_currency": "Divisa Principal",
      "language": "Idioma",
      "save_changes": "Guardar Cambios",
      "saving": "Guardando...",
      "logout": "Cerrar Sesión",
      "profile_updated": "Perfil actualizado correctamente",
      "avatar_upload": "Subir Foto de Perfil",
      "uploading": "Subiendo..."
    }
  },
  en: {
    translation: {
      "welcome": "Hello, {{name}}",
      "calculating": "Calculating your safe-to-spend...",
      "safe_to_spend": "Safe-to-Spend",
      "profile": "Profile",
      "configure_account": "Configure your account",
      "full_name": "Full Name",
      "main_currency": "Main Currency",
      "language": "Language",
      "save_changes": "Save Changes",
      "saving": "Saving...",
      "logout": "Log Out",
      "profile_updated": "Profile updated successfully",
      "avatar_upload": "Upload Profile Picture",
      "uploading": "Uploading..."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lumo_lang') || "es",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  const locales: Record<string, string> = {
    'USD': 'en-US',
    'COP': 'es-CO',
    'MXN': 'es-MX',
    'EUR': 'es-ES',
    'ARS': 'es-AR',
    'CLP': 'es-CL',
    'PEN': 'es-PE',
    'UYU': 'es-UY',
    'PYG': 'es-PY',
    'BOB': 'es-BO',
    'NIO': 'es-NI',
    'HNL': 'es-HN',
    'CRC': 'es-CR',
    'GTQ': 'es-GT',
    'DOP': 'es-DO',
    'PAB': 'es-PA',
    'VES': 'es-VE',
    'BRL': 'pt-BR'
  };
  
  const locale = locales[currency] || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};
