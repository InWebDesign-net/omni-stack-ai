"use client";

export function VideosSkeleton() {
  return (
    <section className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-slate-800/60 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-slate-800/40 rounded-md animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-10 w-64 bg-slate-800/60 rounded-xl animate-pulse" />
            <div className="h-10 w-44 bg-slate-800/60 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Video Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`skeleton-card-${i}`}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg animate-pulse flex flex-col"
            >
              {/* Thumbnail Area */}
              <div className="aspect-video w-full bg-slate-800/80 relative" />

              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-5/6 bg-slate-800/60 rounded" />
                  <div className="h-4 w-3/4 bg-slate-800/40 rounded" />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800/80 shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-24 bg-slate-800/60 rounded" />
                    <div className="h-2.5 w-16 bg-slate-800/40 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}