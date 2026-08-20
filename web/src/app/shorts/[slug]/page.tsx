import { Metadata } from 'next';
import ShortsFeedPage from '../page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} | Omni Shorts`,
    alternates: {
      canonical: `https://omni-web.inwebdesign.net/video/${slug}`,
    },
  };
}

export default function ShortItemPage() {
  return <ShortsFeedPage />;
}
