import { useTranslation } from 'react-i18next';

type Language = 'en' | 'pt' | 'es';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const languages: { code: Language; label: string; flag: string }[] = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'pt', label: 'Português', flag: '🇧🇷' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
    ];

    const handleChange = (lang: Language) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('i18n-language', lang);
    };

    return (
        <div className="language-switcher" style={{ display: 'flex', gap: '0.5rem' }}>
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => handleChange(lang.code)}
                    style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        backgroundColor: i18n.language === lang.code ? 'var(--primary-color, #007bff)' : 'var(--bg-secondary, #f5f5f5)',
                        color: i18n.language === lang.code ? '#fff' : 'var(--text-color, #333)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                    }}
                >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                </button>
            ))}
        </div>
    );
}
