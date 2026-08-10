import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import UserPageClient from './UserPageClient';
import { getProfileData } from './actions';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProfileData(slug);

  if (!data || !data.profile) {
    return {
      title: 'Profil nicht gefunden | Omni Network',
      description: 'Das angeforderte Profil ist auf Omni nicht verfügbar.',
    };
  }

  const profile = data.profile;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const url = `${baseUrl}/user/${encodeURIComponent(slug)}`;
  const title = `${profile.username} (${profile.handle || '@user'}) | Omni Network`;
  const description = profile.bio || `Sieh dir das Profil und die Videos von ${profile.username} auf Omni an.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Omni BY INWEBDESIGN',
      type: 'profile',
      images: [
        {
          url: profile.avatarUrl || `${baseUrl}/media/avatars/default.png`,
          width: 300,
          height: 300,
          alt: profile.username,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [profile.avatarUrl || `${baseUrl}/media/avatars/default.png`],
    },
    alternates: { canonical: url },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const data = await getProfileData(slug);

  if (!data || !data.profile) {
    notFound();
  }

  const profile = data.profile;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const profileUrl = `${baseUrl}/user/${encodeURIComponent(slug)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.username,
      alternateName: profile.handle,
      description: profile.bio,
      image: profile.avatarUrl,
      url: profileUrl,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Kanäle',
        item: `${baseUrl}/videos`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: profile.username,
        item: profileUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <UserPageClient profileDataInit={data} />
    </>
  );
}