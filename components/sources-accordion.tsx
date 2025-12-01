"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ExternalLinkIcon } from "lucide-react";

interface Source {
  type: string;
  sourceType: string;
  id: string;
  url: string;
}

interface SourcesAccordionProps {
  sources: Source[];
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${url}&sz=32`;
  }
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceItem({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 hover:bg-accent/10 transition-colors duration-200 ease rounded-sm"
    >
      <img
        src={getFaviconUrl(source.url)}
        alt=""
        className="w-4 h-4 flex-shrink-0"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E";
        }}
      />
      <span className="text-sm text-foreground truncate flex-1">
        {getDomainFromUrl(source.url)}
      </span>
      <ExternalLinkIcon className="w-4 h-4 text-muted flex-shrink-0" />
    </a>
  );
}

export function SourcesAccordion({ sources }: SourcesAccordionProps) {
  const isMobile = useIsMobile();

  if (sources.length === 0) return null;

  const triggerButton = (
    <button
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium h-auto bg-surface border-border hover:bg-surface/80"
    >
      <span className="text-foreground">Sources</span>
      <span className="text-muted">({sources.length})</span>
    </button>
  );

  const sourceItems = (
    <>
      {sources.map((source) => (
        <SourceItem key={source.id} source={source} />
      ))}
    </>
  );

  if (isMobile) {
    return (
      <Drawer modal={false}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="border-border">
          <DrawerHeader>
            <DrawerTitle>Sources</DrawerTitle>
            <DrawerDescription>
              {sources.length} source{sources.length !== 1 ? "s" : ""} used
              for this content
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">{sourceItems}</div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-background border-border" align="end">
        <DropdownMenuLabel>Sources ({sources.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {sources.map((source) => (
            <DropdownMenuItem key={source.id} asChild>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full"
              >
                <img
                  src={getFaviconUrl(source.url)}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E";
                  }}
                />
                <span className="text-sm text-foreground truncate flex-1">
                  {getDomainFromUrl(source.url)}
                </span>
                <ExternalLinkIcon className="w-4 h-4 text-muted flex-shrink-0" />
              </a>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
