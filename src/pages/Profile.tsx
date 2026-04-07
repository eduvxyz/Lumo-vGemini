import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, User, Globe, DollarSign, Camera, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState(i18n.language || 'es');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCurrency(profile.currency || 'USD');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        currency: currency,
        avatar_url: avatarUrl
      });

      if (error) throw error;
      
      // Update i18n language
      i18n.changeLanguage(language);
      localStorage.setItem('lumo_lang', language);

      await refreshProfile();
      setMessage(t('profile_updated'));
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      setMessage('');
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setMessage('Imagen subida. No olvides guardar los cambios.');
    } catch (error: any) {
      setMessage(`Error al subir imagen: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 pb-24 animate-in fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('profile')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('configure_account')}</p>
      </header>

      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-green-500" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 text-xl font-bold">
                {fullName.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
              <Camera size={12} className="text-gray-500" />
            </div>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">{fullName || 'Usuario Lumo'}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {message && (
          <div className={`p-3 mb-4 rounded-xl text-sm ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <User size={16} /> {t('full_name')}
            </label>
            <input 
              type="text" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <Camera size={16} /> {t('avatar_upload')}
            </label>
            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={uploadAvatar}
              disabled={uploading}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/30 dark:file:text-green-400" 
            />
            {uploading && <p className="text-xs text-green-500 mt-2">{t('uploading')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <DollarSign size={16} /> {t('main_currency')}
            </label>
            <select 
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
            >
              <option value="USD">USD - Dólar Estadounidense</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="CLP">CLP - Peso Chileno</option>
              <option value="PEN">PEN - Sol Peruano</option>
              <option value="UYU">UYU - Peso Uruguayo</option>
              <option value="PYG">PYG - Guaraní Paraguayo</option>
              <option value="BOB">BOB - Boliviano</option>
              <option value="NIO">NIO - Córdoba Nicaragüense</option>
              <option value="HNL">HNL - Lempira Hondureño</option>
              <option value="CRC">CRC - Colón Costarricense</option>
              <option value="GTQ">GTQ - Quetzal Guatemalteco</option>
              <option value="DOP">DOP - Peso Dominicano</option>
              <option value="PAB">PAB - Balboa Panameño</option>
              <option value="VES">VES - Bolívar Venezolano</option>
              <option value="BRL">BRL - Real Brasileño</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <Globe size={16} /> {t('language')}
            </label>
            <select 
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading || uploading}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6 disabled:opacity-50"
          >
            {loading ? t('saving') : t('save_changes')}
          </button>
        </form>
      </div>

      <button 
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 py-4 rounded-2xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
      >
        <LogOut size={20} /> {t('logout')}
      </button>
    </div>
  );
}
