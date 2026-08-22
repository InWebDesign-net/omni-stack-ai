import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['de', 'en'],
    tutorials: false,
    notifications: { releases: false },

    /*
     * The login screen greets people with the name of the software rather than
     * the name of the thing they are logging into. These are the only two
     * strings on that page that say "Strapi" — the other keys it uses
     * (`Auth.form.email.label`, `Auth.form.button.login`, `global.password`,
     * `Auth.link.forgot-password`) are generic and left alone.
     */
    translations: {
      en: {
        'Auth.form.welcome.title': 'Welcome to Omni CMS!',
        'Auth.form.welcome.subtitle': 'Log in to your Omni CMS account',
      },
      de: {
        'Auth.form.welcome.title': 'Willkommen bei Omni CMS!',
        'Auth.form.welcome.subtitle': 'Logge dich in deinen Omni CMS Account ein',
      },
    },
  },
  bootstrap(app: StrapiApp) {
    if (typeof window !== 'undefined') {
      const injectCleanStyles = () => {
        if (document.getElementById('omni-custom-admin-css')) return;
        const style = document.createElement('style');
        style.id = 'omni-custom-admin-css';
        style.innerHTML = `
          /* Hide Strapi Cloud, EE Upsell & Promo Banners */
          [data-strapi-cloud="true"],
          a[href*="cloud.strapi.io"],
          a[href*="/settings/purchase"],
          a[href*="/settings/license"],
          div[class*="CloudBanner"],
          div[class*="PurchaseAudit"],
          div[class*="FreeTrial"],
          button[class*="Upgrade"] {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
      };

      injectCleanStyles();
      window.addEventListener('DOMContentLoaded', injectCleanStyles);
    }
  },
};
