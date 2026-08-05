import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['de', 'en'],
    tutorials: false,
    notifications: { releases: false },
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
