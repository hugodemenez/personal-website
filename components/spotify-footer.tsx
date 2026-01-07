import { getSpotifyData } from "@/server/spotify";
import Image from "next/image";

export async function SpotifyFooter() {
  const data = await getSpotifyData();
  if (!data.recentTrack) return null;

  const { recentTrack, topTracks } = data;

  return (
    <footer className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-sm border-t border-border z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-3">
        <p className="text-xs text-muted mb-2">Favorite track</p>
        <div className="flex items-center gap-3">
          <a
            href={recentTrack.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 flex-1 min-w-0 group"
          >
            <Image
              src={recentTrack.albumArt}
              alt={recentTrack.name}
              width={48}
              height={48}
              className="rounded shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                {recentTrack.name}
              </p>
              <p className="text-xs text-muted truncate">{recentTrack.artist}</p>
            </div>
            <svg
              className="w-4 h-4 text-muted group-hover:text-accent transition-colors shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
          {topTracks.length > 0 && (
            <div className="hidden sm:flex gap-2">
              {topTracks.slice(0, 5).map((track) => (
                <a
                  key={track.url}
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                  title={`${track.name} - ${track.artist}`}
                >
                  <Image
                    src={track.albumArt}
                    alt={track.name}
                    width={32}
                    height={32}
                    className="rounded"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
