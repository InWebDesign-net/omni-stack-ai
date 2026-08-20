import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({

  async ingestFinalizedVideo(payload: { slug: string; duration?: number; workerSecret?: string }) {
    const { slug, duration } = payload;
    if (!slug) {
      throw new Error('Missing slug parameter');
    }

    const OUT_DIR = '/root/media/out';
    const FINAL_DIR = '/root/media/videos';
    const THUMB_DIR = '/root/media/thumbnails';
    const OG_DEST_DIR = '/root/media/og';

    const fs = require('fs');
    const path = require('path');
    const glob = require('glob');

    const base = slug;
    // The converter writes the progressive rendition to OUT_DIR/mp4/<base>.mp4.
    // Older runs left it directly in OUT_DIR, so both are accepted.
    const mp4Candidates = [
      path.join(OUT_DIR, 'mp4', base + '.mp4'),
      path.join(OUT_DIR, base + '.mp4'),
    ];
    const videoPath = mp4Candidates.find((c: string) => fs.existsSync(c)) || mp4Candidates[0];
    const donePath = path.join(OUT_DIR, base + '.done');
    const metaPath = path.join(OUT_DIR, base + '.meta');

    let metaDuration = Math.round(Number(duration) || 0);

    // Read meta file if exists
    if (fs.existsSync(metaPath)) {
      try {
        const lines = fs.readFileSync(metaPath, 'utf8').split('\n');
        for (const line of lines) {
          const [key, value] = line.split('=');
          if (key && value && key.trim() === 'duration') {
            metaDuration = Math.round(parseFloat(value.trim())) || metaDuration;
          }
        }
      } catch (e) {}
    }

    // 1. Move Thumbnails
    const thumbPattern = path.join(OUT_DIR, 'thumbnails', `${base}-*.png`);
    const thumbFiles = glob.sync(thumbPattern);
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    for (const src of thumbFiles) {
      const dest = path.join(THUMB_DIR, path.basename(src));
      fs.copyFileSync(src, dest);
      try { fs.unlinkSync(src); } catch (e: any) {
        if (e?.code !== 'ENOENT') console.warn(`[video-ingest] cleanup thumb ${src} failed:`, e.message);
      }
    }

    // 2. Move OG image
    const ogSrc = path.join(OUT_DIR, 'og', `${base}.jpg`);
    fs.mkdirSync(OG_DEST_DIR, { recursive: true });
    if (fs.existsSync(ogSrc)) {
      const ogDest = path.join(OG_DEST_DIR, path.basename(ogSrc));
      fs.copyFileSync(ogSrc, ogDest);
      try { fs.unlinkSync(ogSrc); } catch (e: any) {
        if (e?.code !== 'ENOENT') console.warn(`[video-ingest] cleanup OG ${ogSrc} failed:`, e.message);
      }
    }

    // 3. Move ABR HLS directory
    const hlsSrcDir = path.join(OUT_DIR, 'hls', base);
    const hlsDestDir = path.join(FINAL_DIR, 'hls', base);
    if (fs.existsSync(hlsSrcDir)) {
      fs.mkdirSync(path.join(FINAL_DIR, 'hls'), { recursive: true });
      fs.cpSync(hlsSrcDir, hlsDestDir, { recursive: true });
      try { fs.rmSync(hlsSrcDir, { recursive: true, force: true }); } catch (e: any) {
        if (e?.code !== 'ENOENT') console.warn(`[video-ingest] cleanup HLS dir ${hlsSrcDir} failed:`, e.message);
      }
    }

    // 4. Move MP4 file
    const mp4TargetPath = path.join(FINAL_DIR, base + '.mp4');
    if (fs.existsSync(videoPath)) {
      fs.copyFileSync(videoPath, mp4TargetPath);
      try { fs.unlinkSync(videoPath); } catch (e: any) {
        if (e?.code !== 'ENOENT') console.warn(`[video-ingest] cleanup MP4 ${videoPath} failed:`, e.message);
      }
    }
    // Recording an mp4Url for a file that was never placed is what produced a
    // catalogue of dead links, so the URL is only written when the file is there.
    const hasMp4 = fs.existsSync(mp4TargetPath);
    if (!hasMp4) {
      console.warn(
        `[video-ingest] no MP4 rendition for "${base}" — looked in ${mp4Candidates.join(', ')}. ` +
        `Ingesting HLS only; mp4Url stays unset.`
      );
    }

    // Clean up markers
    if (fs.existsSync(donePath)) { try { fs.unlinkSync(donePath); } catch (e: any) { if (e?.code !== 'ENOENT') console.warn(`[video-ingest] cleanup done ${donePath} failed:`, e.message); } }
    if (fs.existsSync(metaPath)) { try { fs.unlinkSync(metaPath); } catch (e: any) { if (e?.code !== 'ENOENT') console.warn(`[video-ingest] cleanup meta ${metaPath} failed:`, e.message); } }

    // 5. Update Strapi DB entries for standalone Video (ALL locales, always published)
    try {
      const videoMatches = await strapi.documents('api::video.video').findMany({
        filters: { slug: { $eq: base } },
        locale: '*',
      });
      if (videoMatches && videoMatches.length > 0) {
        const docId = videoMatches[0].documentId;
        const updateData = {
          isProcessing: false,
          duration: Math.round(Number(metaDuration || (videoMatches[0] as any).duration || 0)),
          hlsUrl: `/media/videos/hls/${base}/master.m3u8`,
          ...(hasMp4 ? { mp4Url: `/media/videos/${base}.mp4` } : {}),
          thumbnailUrl: `/media/thumbnails/${base}-1.png`,
          ogImageUrl: `/media/og/${base}.jpg`,
        };

        // Update each locale version individually with status: 'published'
        const localesFound = new Set(videoMatches.map((v: any) => v.locale || 'en'));
        for (const locale of localesFound) {
          try {
            await strapi.documents('api::video.video').update({
              documentId: docId,
              locale,
              data: updateData as any,
              status: 'published',
            });
          } catch (localeErr) {
            console.error(`Error updating video locale ${locale}:`, localeErr);
          }
        }

        // Ensure both EN and DE exist - if a locale is missing, create it
        for (const requiredLocale of ['en', 'de']) {
          if (!localesFound.has(requiredLocale)) {
            try {
              await strapi.documents('api::video.video').update({
                documentId: docId,
                locale: requiredLocale,
                data: {
                  ...updateData,
                  title: (videoMatches[0] as any).title || base,
                  slug: base,
                  tags: (videoMatches[0] as any).tags || ['Video'],
                } as any,
                status: 'published',
              });
            } catch (e) {
              console.error(`Error creating missing ${requiredLocale} locale for video:`, e);
            }
          }
        }
      }
    } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }

    try {
      const imageMatches = await strapi.documents('api::image.image').findMany({
        filters: { slug: { $eq: base } },
        locale: '*',
      });
      if (imageMatches && imageMatches.length > 0) {
        const docId = imageMatches[0].documentId;
        const imgUpdateData = {
          isProcessing: false,
          imageUrl: `/media/images/${base}.webp`,
          thumbnailUrl: `/media/images/thumbnails/${base}_thumb.webp`,
        };
        const imageLocales = new Set(imageMatches.map((img: any) => img.locale || 'en'));
        for (const loc of imageLocales) {
          try {
            await strapi.documents('api::image.image').update({
              documentId: docId,
              locale: loc,
              data: imgUpdateData as any,
              status: 'published',
            });
          } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }
        }
      }
    } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }

    const updateStrapiItem = async () => {
      try {
        const matches = await strapi.documents('api::feed-item.feed-item').findMany({
          filters: { slug: { $eq: base } },
          locale: '*',
        });

        for (const doc of matches) {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId: doc.documentId,
            locale: (doc as any).locale || 'de',
            status: 'published',
            data: {
              isProcessing: false,
              duration: metaDuration || (doc as any).duration || 0,
            } as any,
          });
        }
      } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }
    };

    await updateStrapiItem();

    return { success: true, slug: base, isProcessing: false, duration: metaDuration };
  },

  async togglePublish(documentId: string, publish: boolean, userId?: number | string) {
    if (!documentId) {
      throw new Error('Missing documentId');
    }

    if (userId) {
      let doc: any = null;
      try {
        doc = await strapi.db.query('api::video.video').findOne({
          where: { documentId },
          populate: ['creator', 'author'],
        });
      } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }

      if (!doc) {
        try {
          doc = await strapi.db.query('api::feed-item.feed-item').findOne({
            where: { documentId },
            populate: ['author', 'creator'],
          });
        } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }
      }

      if (doc) {
        const ownerId = doc.creator?.id || doc.author?.id;
        if (ownerId && String(ownerId) !== String(userId)) {
          throw new Error('Forbidden: You are not the owner of this content');
        }
      }
    }
    const targetVisibility = publish ? 'public' : 'private';

    let isVideoModel = false;
    try {
      const vCheck = await strapi.db.query('api::video.video').findOne({
        where: { documentId },
      });
      if (vCheck) isVideoModel = true;
    } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }

    if (isVideoModel) {
      try {
        const vUpdated = await strapi.documents('api::video.video').update({
          documentId,
          locale: 'de',
          status: 'published',
          data: { visibility: targetVisibility } as any,
        });
        try {
          await strapi.documents('api::video.video').update({
            documentId,
            locale: 'en',
            status: 'published',
            data: { visibility: targetVisibility } as any,
          });
        } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }
        return { success: true, documentId, published: publish, visibility: targetVisibility, data: vUpdated };
      } catch (vErr: any) {
        throw vErr;
      }
    } else {
      try {
        const updatedDe = await strapi.documents('api::feed-item.feed-item').update({
          documentId,
          locale: 'de',
          status: 'published',
          data: { visibility: targetVisibility } as any,
        });
        try {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId,
            locale: 'en',
            status: 'published',
            data: { visibility: targetVisibility } as any,
          });
        } catch (e) {
        strapi.log.error('[video-ingest.ts] unhandled error', e);
      }
        return { success: true, documentId, published: publish, visibility: targetVisibility, data: updatedDe };
      } catch (e: any) {
        throw e;
      }
    }
  },
});
