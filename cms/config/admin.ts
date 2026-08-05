import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
  preview: {
    enabled: true,
    config: {
      allowedOrigins: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://omni.inwebdesign.net',
        'https://omni-web.inwebdesign.net',
      ],
      async handler(uid: any, { documentId, locale, status }: any) {
        let slug = documentId;
        let mediaType = 'article';

        try {
          const document = await (strapi as any).documents(uid).findOne({
            documentId,
            locale,
            status: status || 'draft',
          });
          if (document) {
            slug = document.slug || documentId;
            mediaType = document.mediaType || 'article';
          }
        } catch (e) {
          // Fallback
        }

        const secret = env('STRAPI_PREVIEW_SECRET', 'omni_preview_secret_2026');
        const baseUrl = env('PUBLIC_FRONTEND_URL', 'http://127.0.0.1:3000');

        return `${baseUrl}/api/preview?secret=${secret}&slug=${slug}&type=${mediaType}`;
      },
    },
  },
});

export default config;
