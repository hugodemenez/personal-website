/** CSS <custom-ident> used as a view-transition-name. Slugs are kebab-case. */
function ident(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function postTitleTransitionName(slug: string): string {
  return `post-title-${ident(slug)}`;
}

export function postStampTransitionName(slug: string): string {
  return `post-stamp-${ident(slug)}`;
}
