import LocationPill from "./_components/location-pill";
import SubstackPosts from "./_components/substack-posts";
import { getCurrentLocationWeather } from "@/server/location";
import { getSpotifyData } from "@/server/spotify";
import { cacheLife } from "next/cache";
import { Suspense } from "react";

function LocationPillSkeleton() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-28 animate-pulse rounded-full bg-surface"
    />
  );
}

async function CurrentLocationPill() {
  "use cache";
  cacheLife("seconds");

  const weather = await getCurrentLocationWeather();

  return <LocationPill weather={weather} />;
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-2.5 shrink-0 fill-current"
      viewBox="0 0 1200 1227"
    >
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894L144.011 79.694h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 shrink-0 fill-current"
      viewBox="0 0 98 96"
    >
      <path d="M41.44 69.385C28.807 67.854 19.906 58.762 19.906 46.99c0-4.785 1.723-9.953 4.594-13.398-1.244-3.158-1.053-9.858.383-12.633 3.828-.479 8.996 1.531 12.058 4.307 3.637-1.149 7.465-1.723 12.155-1.723s8.517.574 11.963 1.627c2.966-2.68 8.23-4.69 12.058-4.211 1.34 2.584 1.531 9.283.287 12.537 3.063 3.637 4.69 8.518 4.69 13.494 0 11.772-8.901 20.672-21.725 22.3 3.254 2.104 5.455 6.698 5.455 11.962v9.953c0 2.871 2.393 4.498 5.264 3.35C84.41 87.95 98 70.628 98 49.191 98 22.107 75.988 0 48.904 0 21.82 0 0 22.107 0 49.191c0 21.247 13.494 38.856 31.678 45.46 2.584.957 5.072-.766 5.072-3.35v-7.657c-1.34.574-3.062.957-4.594.957-6.316 0-10.048-3.445-12.728-9.857-1.053-2.584-2.201-4.115-4.402-4.402-1.149-.096-1.532-.574-1.532-1.149 0-1.148 1.914-2.01 3.828-2.01 2.776 0 5.168 1.723 7.657 5.264 1.914 2.776 3.923 4.02 6.316 4.02s3.924-.861 6.125-3.062c1.627-1.627 2.871-3.063 4.02-4.02Z" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mr-1 inline size-3 -translate-y-px fill-current"
      viewBox="0 0 24 24"
    >
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34.36.22.47.68.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.55-11.96-1.4a.94.94 0 1 1-.54-1.8c4.36-1.31 9.78-.68 13.48 1.6.44.27.58.85.31 1.29Zm.13-3.4C15.23 8.33 8.84 8.12 5.14 9.24a1.13 1.13 0 1 1-.65-2.16c4.25-1.28 11.32-1.03 15.76 1.6a1.13 1.13 0 0 1-1.15 1.95Z" />
    </svg>
  );
}

function TradingBarsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mx-1 inline size-3.5 -translate-y-px"
      viewBox="0 0 12 12"
      fill="none"
    >
      <rect x="1" y="7" width="2.5" height="4" rx="0.75" className="fill-current">
        <animate
          attributeName="height"
          values="4;7;3;6;4"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="7;4;8;5;7"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </rect>
      <rect x="4.75" y="4" width="2.5" height="7" rx="0.75" className="fill-current">
        <animate
          attributeName="height"
          values="7;3;8;4;7"
          dur="1.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="4;8;3;7;4"
          dur="1.4s"
          repeatCount="indefinite"
        />
      </rect>
      <rect x="8.5" y="6" width="2.5" height="5" rx="0.75" className="fill-current">
        <animate
          attributeName="height"
          values="5;8;4;7;5"
          dur="1.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="6;3;7;4;6"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
}

function DeltalytixIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 shrink-0 fill-current"
      viewBox="0 0 255 255"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M159 63L127.5 0V255H255L236.5 218H159V63Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 255L127.5 0V255H0ZM64 217L121 104V217H64Z"
      />
    </svg>
  );
}

const socialLinkClass =
  "inline-flex items-center gap-1 align-baseline font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent";
const musicLinkClass =
  "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent";

export default async function Home() {
  const { recentTrack: track } = await getSpotifyData();

  return (
    <>
      <main>
        <section className="space-y-4 text-muted">
          <div className="mb-7">
            <div className="mb-3 flex">
              <Suspense fallback={<LocationPillSkeleton />}>
                <CurrentLocationPill />
              </Suspense>
            </div>
            <h1 className="font-serif text-5xl leading-[0.95] tracking-[-0.04em] text-foreground sm:text-6xl">
              Hugo Demenez
            </h1>
            <p className="mt-2 font-serif text-xl tracking-[-0.02em] text-muted">
              Software writer
            </p>
          </div>
          <p className="leading-relaxed">
            I write about the work as I go: building products, staying focused,
            discretionary trading
            <TradingBarsIcon />
            and turning rough ideas into useful systems.
            {track ? (
              <>
                {" "}Most days have a soundtrack; lately it has been{" "}
                <a
                  className={musicLinkClass}
                  href={track.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <SpotifyIcon />
                  {track.name} by {track.artist}
                </a>
                .
              </>
            ) : null}
          </p>
          <p className="leading-relaxed">
            I keep a small social footprint. I’m{" "}
            <a
              className={socialLinkClass}
              href="https://x.com/hugodemenez"
              rel="noopener noreferrer"
              target="_blank"
            >
              <XIcon />
              @hugodemenez
            </a>
            —mostly reposting things worth keeping and occasionally sharing a
            thought of my own.
          </p>
          <p className="leading-relaxed">
            The work itself is less private: I build{" "}
            <a
              className={socialLinkClass}
              href="https://deltalytix.app"
              rel="noopener noreferrer"
              target="_blank"
            >
              <DeltalytixIcon />
              Deltalytix
            </a>{" "}
            in public on GitHub as{" "}
            <span className="whitespace-nowrap">
              <a
                className={socialLinkClass}
                href="https://github.com/hugodemenez"
                rel="noopener noreferrer"
                target="_blank"
              >
                <GitHubIcon />
                hugodemenez
              </a>
              .
            </span>
          </p>
        </section>
      </main>
      <SubstackPosts />
    </>
  );
}
