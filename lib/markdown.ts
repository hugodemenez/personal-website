export function processMarkdown(markdown: string): string {
  return markdown
    // Fix images wrapped in broken links with newlines: [ \n ![](...) \n ](...)
    .replace(/\[\s*(!\[.*?\]\(.*?\))\s*\]\(.*?\)/g, "$1")
    // Convert Twitter/X links (plain or markdown format) on their own line to Tweet components
    // Match plain links: https://x.com/user/status/123456
    .replace(
      /^[ \t]*https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n]*)?[ \t\r]*$/gm,
      '\n<Tweet id="$1" />\n'
    )
    // Match markdown links: [text](https://x.com/user/status/123456)
    .replace(
      /^[ \t]*\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n\)]*)?\)[ \t\r]*$/gm,
      '\n<Tweet id="$1" />\n'
    )
    // Match markdown links anywhere: [text](https://x.com/user/status/123456)
    .replace(
      /\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n\)]*)?\)/g,
      '\n\n<Tweet id="$1" />\n\n'
    )
    // Match inline links: text https://x.com/user/status/123456
    .replace(
      /(^|[^\[(])(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \s\n)]*)?)/g,
      '$1\n\n<Tweet id="$3" />\n\n'
    )
    // Fix lowercase tweet tags
    .replace(/<tweet\s+id="(\d+)"\s*\/>/g, '<Tweet id="$1" />');
}
