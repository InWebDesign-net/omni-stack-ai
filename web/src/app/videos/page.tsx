import { Metadata } from "next";
import { Suspense } from "react";
import VideosPageClient from "@/app/videos/VideosPageClient";
import { VideosSkeleton } from "@/app/videos/skeleton";

// Hilfsfunktion für SEO-Titel basierend auf Querys
function getTitle(searchParams: any) {
    const { q, includetag } = searchParams;
    if (q) return `Search: ${q} | Omni Videos`;
    if (includetag) return `Videos about #${includetag.replace(/,/g, ", #")} | Omni by InWebDesign.net`;
    return "All Videos | Omni by InWebDesign.net";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<any> }): Promise<Metadata> {
    const params = await searchParams;
    const title = getTitle(params);
    const baseDescription = "Explore clips by cool creators on Omni by InWebDesign.net";
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
    const url = `${baseUrl}/videos`;

    const canonical = params.page ? `${url}?page=${params.page}` : url;

    const description = params.q
        ? `Search results for "${params.q}" on Omni by InWebdesign.net ${baseDescription}`
        : params.includetag
            ? `Watch videos tagged with #${params.includetag.replace(/,/g, ", #")} on Omni by InWebDesign.net ${baseDescription}`
            : baseDescription;

    return {
        title,
        description,
        alternates: {
            canonical: canonical,
        },
        robots: params.includetag || params.q ? "noindex, follow" : "index, follow", // Filterseiten nicht indexieren
    };
}

export default async function Page({ searchParams }: { searchParams: Promise<any> }) {
    // Wir warten auf die Params (Next.js 15+ Standard)
    const resolvedParams = await searchParams;
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
    const url = `${baseUrl}/videos`;

    const collectionJsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: getTitle(resolvedParams),
        url: resolvedParams.page
            ? `${url}?page=${encodeURIComponent(String(resolvedParams.page))}`
            : url,
        description: "Browse our extensive video library on Omni by InWebDesign.net",
        publisher: {
            "@type": "Organization",
            name: "Omni by InWebDesign.net",
            logo: {
                "@type": "ImageObject",
                url: `${baseUrl}/icon.png`,
            },
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
            />
            <Suspense fallback={<VideosSkeleton />}>
                <VideosPageClient initialParams={resolvedParams} />
            </Suspense>
        </>
    );
}
