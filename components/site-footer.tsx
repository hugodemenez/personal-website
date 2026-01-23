import { getSpotifyData } from "@/server/spotify";
import Image from "next/image";
import Link from "next/link";

export async function SiteFooter() {
  const data = await getSpotifyData();
  if (!data.recentTrack) return null;

  const { recentTrack, topTracks } = data;

  return (
    <footer className="border-t border-border z-50">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-3">
        <p className="text-xs text-muted mb-2">Socials</p>
        <div className="flex items-center gap-3">
          <Link
            href="https://x.com/hugodemenez"
            rel="noopener noreferrer"
            className="text-sm text-muted font-bold hover:text-accent transition-colors flex items-center gap-2 group"
          >
            <svg width="16" height="16" viewBox="0 0 1200 1227" xmlns="http://www.w3.org/2000/svg">
              <path className="fill-foreground group-hover:fill-accent transition-colors" d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
            </svg>
            @hugodemenez
          </Link>
          <Link
            href="https://github.com/hugodemenez"
            rel="noopener noreferrer"
            className="flex gap-2 group text-sm text-muted hover:text-accent transition-colors items-center font-bold"
          >
            <svg width="24" height="24" viewBox="0 0 98 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_730_27126)">
                <path className="fill-foreground group-hover:fill-accent transition-colors" d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" />
              </g>
            </svg>
            hugodemenez
          </Link>
        </div>
      </div>
    </footer>
  );
}
