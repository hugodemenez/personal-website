/**
 * Zero-dependency HTML to Markdown converter.
 * Optimized for Substack's HTML structure.
 *
 * This is a best-effort converter that handles common HTML elements
 * and gracefully falls back for unknown tags.
 */

interface Token {
  type: "tag" | "text" | "comment";
  name?: string;
  attributes?: Record<string, string>;
  selfClosing?: boolean;
  isClosing?: boolean;
  content?: string;
}

/**
 * Simple HTML tokenizer that extracts tags and text content.
 * Handles basic HTML parsing without DOM APIs.
 */
function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < html.length) {

    // Comment
    if (html.slice(i, i + 4) === "<!--") {
      const end = html.indexOf("-->", i);
      if (end !== -1) {
        tokens.push({
          type: "comment",
          content: html.slice(i + 4, end),
        });
        i = end + 3;
        continue;
      }
    }

    // Opening tag
    if (html[i] === "<") {
      const tagEnd = html.indexOf(">", i);
      if (tagEnd === -1) break;

      const tagContent = html.slice(i + 1, tagEnd);
      const isClosing = tagContent.startsWith("/");
      const isSelfClosing = !isClosing && tagContent.endsWith("/");

      if (isClosing) {
        const tagName = tagContent.slice(1).trim().toLowerCase();
        tokens.push({
          type: "tag",
          name: tagName,
          isClosing: true,
        });
        i = tagEnd + 1;
        continue;
      }

      // Parse tag name and attributes
      const cleanContent = isSelfClosing
        ? tagContent.slice(0, -1).trim()
        : tagContent.trim();
      const spaceIndex = cleanContent.search(/\s/);
      const tagName =
        spaceIndex === -1
          ? cleanContent
          : cleanContent.slice(0, spaceIndex);

      const attributes: Record<string, string> = {};
      if (spaceIndex !== -1) {
        const attrsStr = cleanContent.slice(spaceIndex).trim();
        // Simple attribute parsing: name="value" or name='value' or name=value
        // Allow data-* and other hyphenated attribute names
        const attrRegex = /([\w-]+)(?:=["']([^"']*)["']|=(?:([^\s>]+)))?/g;
        let match;
        while ((match = attrRegex.exec(attrsStr)) !== null) {
          const [, name, quotedValue, unquotedValue] = match;
          attributes[name] = quotedValue || unquotedValue || "";
        }
      }

      tokens.push({
        type: "tag",
        name: tagName.toLowerCase(),
        attributes,
        selfClosing: isSelfClosing,
        isClosing: false,
      });
      i = tagEnd + 1;
      continue;
    }

    // Text content
    const nextTag = html.indexOf("<", i);
    if (nextTag === -1) {
      const text = html.slice(i);
      if (text.trim()) {
        tokens.push({ type: "text", content: text });
      }
      break;
    }

    const text = html.slice(i, nextTag);
    if (text.trim()) {
      tokens.push({ type: "text", content: text });
    }
    i = nextTag;
  }

  return tokens;
}

/**
 * Converts HTML tokens to Markdown string.
 */
function tokensToMarkdown(tokens: Token[]): string {
  const output: string[] = [];
  let i = 0;
  const stack: Token[] = [];

  function ensureSpaceBeforeInline(): void {
    if (output.length === 0) return;
    const last = output[output.length - 1];
    if (!last || typeof last !== "string") return;
    if (last.endsWith(" ") || last.endsWith("\n")) return;
    const lastChar = last[last.length - 1];
    if (lastChar && /[a-zA-Z0-9]/.test(lastChar)) {
      output.push(" ");
    }
  }

  function getContextTag(): string | undefined {
    return stack.length > 0 ? stack[stack.length - 1]?.name : undefined;
  }

  function isInCodeBlock(): boolean {
    return stack.some((t) => t.name === "pre" || t.name === "code");
  }

  function isInList(): boolean {
    return stack.some((t) => t.name === "ul" || t.name === "ol");
  }

  function isInBlockquote(): boolean {
    return stack.some((t) => t.name === "blockquote");
  }

  function getListMarker(): string {
    const listTag = stack.find((t) => t.name === "ul" || t.name === "ol");
    return listTag?.name === "ol" ? "1." : "-";
  }

  function needsNewlineBefore(tagName: string): boolean {
    const blockTags = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "div",
      "ul",
      "ol",
      "blockquote",
      "pre",
      "hr",
      "figure",
    ];
    return blockTags.includes(tagName);
  }

  function needsNewlineAfter(tagName: string): boolean {
    const blockTags = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "div",
      "ul",
      "ol",
      "blockquote",
      "pre",
      "hr",
      "li",
      "figure",
    ];
    return blockTags.includes(tagName);
  }

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === "comment") {
      i++;
      continue;
    }

    if (token.type === "text") {
      if (!isInCodeBlock() && token.content) {
        // Normalize whitespace: collapse multiple spaces/tabs/newlines to single space
        // But preserve the text content
        let text = token.content.replace(/[\s]+/g, " ");
        
        // Only process if there's actual content (not just whitespace)
        if (text.trim()) {
          // Add blockquote prefix if inside blockquote
          if (isInBlockquote() && output.length > 0) {
            const lastLine = output[output.length - 1];
            if (lastLine && !lastLine.endsWith("\n") && lastLine !== "> ") {
              if (!lastLine.startsWith(">")) {
                output.push("> ");
              }
            } else if (lastLine?.endsWith("\n")) {
              output.push("> ");
            }
          }
          
          // Check if we need a space before this text
          // Add space if previous output doesn't end with space/newline and this text starts with alphanumeric
          // BUT don't add space if previous ends with ** or * (bold/emphasis markers) - those need no space inside
          // Also check if we're inside formatting tags - if so, don't add space
          if (output.length > 0) {
            const last = output[output.length - 1];
            const trimmedText = text.trim();
            const firstChar = trimmedText[0];
            const isInFormatting = stack.some(t => t.name === "strong" || t.name === "b" || t.name === "em" || t.name === "i");
            
            if (last && !last.endsWith(" ") && !last.endsWith("\n")) {
              // Don't add space if:
              // 1. Previous ends with opening bracket/paren (link/code starting)
              // 2. Previous ends with ** or * (bold/emphasis markers - no space inside markers)
              // 3. We're inside formatting tags (no space inside formatting)
              if (!last.match(/[\[\(`]$/) && !last.endsWith("**") && !last.endsWith("*") && !isInFormatting) {
                // Add space if text starts with alphanumeric (likely a word)
                if (firstChar && /[a-zA-Z0-9]/.test(firstChar)) {
                  output.push(" ");
                }
              }
            }
          }
          
          // Output the trimmed text
          output.push(text.trim());
        } else if (text && text.includes(" ")) {
          // If it's just whitespace, add a space if needed
          if (output.length > 0) {
            const last = output[output.length - 1];
            if (last && !last.endsWith(" ") && !last.endsWith("\n") && !last.match(/[\[\(`]$/)) {
              output.push(" ");
            }
          }
        }
      } else if (token.content) {
        // Preserve whitespace in code blocks exactly as-is
        output.push(token.content);
      }
      i++;
      continue;
    }

    if (token.type === "tag") {
      const { name, attributes, selfClosing, isClosing } = token;

      if (!name) {
        i++;
        continue;
      }

      // Handle closing tags
      if (isClosing) {
        // Find matching opening tag in stack (search from top)
        let found = false;
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j]?.name === name) {
            // Close any tags that were opened after this one (nested tags)
            // Pop from top of stack until we reach the matching tag
            while (stack.length > j + 1) {
              const nestedTag = stack.pop();
              if (!nestedTag) break;

              // Add closing markdown syntax for nested tags
              switch (nestedTag.name) {
                case "strong":
                case "b":
                  output.push("**");
                  // Add space after ** if next content is text
                  if (i + 1 < tokens.length) {
                    const nextToken = tokens[i + 1];
                    if (nextToken?.type === "text" && nextToken.content) {
                      const firstChar = nextToken.content.trim()[0];
                      if (firstChar && /[a-zA-Z0-9]/.test(firstChar)) {
                        output.push(" ");
                      }
                    } else if (nextToken?.type === "tag" && !nextToken.isClosing) {
                      // If next is an opening tag, check if we need space
                      const tagName = nextToken.name;
                      if (tagName && !["strong", "b", "em", "i", "code"].includes(tagName)) {
                        output.push(" ");
                      }
                    }
                  }
                  break;
                case "em":
                case "i":
                  output.push("*");
                  // Add space after * if next content is text
                  if (i + 1 < tokens.length) {
                    const nextToken = tokens[i + 1];
                    if (nextToken?.type === "text" && nextToken.content) {
                      const firstChar = nextToken.content.trim()[0];
                      if (firstChar && /[a-zA-Z0-9]/.test(firstChar)) {
                        output.push(" ");
                      }
                    } else if (nextToken?.type === "tag" && !nextToken.isClosing) {
                      const tagName = nextToken.name;
                      if (tagName && !["strong", "b", "em", "i", "code"].includes(tagName)) {
                        output.push(" ");
                      }
                    }
                  }
                  break;
                case "code": {
                  const inPre = stack.some((t) => t.name === "pre");
                  if (!inPre) {
                    output.push("`");
                  }
                  break;
                }
                case "a": {
                  const href = nestedTag.attributes?.href || "";
                  output.push(`](${href})`);
                  // Add space after link if next content is text starting with alphanumeric
                  if (i + 1 < tokens.length) {
                    const nextToken = tokens[i + 1];
                    if (nextToken?.type === "text" && nextToken.content) {
                      const firstChar = nextToken.content.trim()[0];
                      if (firstChar && /[a-zA-Z0-9]/.test(firstChar)) {
                        output.push(" ");
                      }
                    } else if (nextToken?.type === "tag" && !nextToken.isClosing) {
                      const tagName = nextToken.name;
                      if (tagName && !["strong", "b", "em", "i", "code", "a"].includes(tagName)) {
                        output.push(" ");
                      }
                    }
                  }
                  break;
                }
              }
            }

            // Now close the matching tag itself
            const matchingTag = stack.pop();
            if (matchingTag) {
              switch (matchingTag.name) {
                case "strong":
                case "b": {
                  // Simply output ** - no spacing logic here
                  // But first, trim any trailing whitespace from the last output item if it's text
                  // BUT preserve newlines (they're needed for paragraph breaks)
                  if (output.length > 0) {
                    const last = output[output.length - 1];
                    if (typeof last === "string" && last.trim() !== last) {
                      // Last item has trailing whitespace - remove spaces/tabs but keep newlines
                      const trimmed = last.replace(/[ \t]+$/, "");
                      output[output.length - 1] = trimmed;
                    }
                  }
                  output.push("**");
                  break;
                }
                case "em":
                case "i":
                  // Simply output * - no spacing logic here
                  // Spacing will be handled by text node processing for content outside the emphasis markers
                  output.push("*");
                  break;
                case "code": {
                  const inPre = stack.some((t) => t.name === "pre");
                  if (!inPre) {
                    output.push("`");
                  }
                  break;
                }
                case "pre":
                  output.push("\n```\n");
                  break;
                case "a": {
                  const href = matchingTag.attributes?.href || "";
                  output.push(`](${href})`);
                  // Add space after link if next token is text starting with alphanumeric
                  if (i + 1 < tokens.length) {
                    const nextToken = tokens[i + 1];
                    if (nextToken?.type === "text" && nextToken.content) {
                      const firstChar = nextToken.content.trim()[0];
                      if (firstChar && /[a-zA-Z0-9]/.test(firstChar)) {
                        output.push(" ");
                      }
                    } else if (nextToken?.type === "tag" && !nextToken.isClosing) {
                      const tagName = nextToken.name;
                      if (tagName && !["strong", "b", "em", "i", "code", "a"].includes(tagName)) {
                        output.push(" ");
                      }
                    }
                  }
                  break;
                }
                case "blockquote":
                  // Ensure newline after blockquote
                  if (!output[output.length - 1]?.endsWith("\n")) {
                    output.push("\n");
                  }
                  break;
                case "h1":
                case "h2":
                case "h3":
                case "h4":
                case "h5":
                case "h6":
                  if (needsNewlineAfter(matchingTag.name)) {
                    output.push("\n");
                  }
                  break;
                case "p":
                case "li":
                  if (needsNewlineAfter(matchingTag.name)) {
                    // Ensure we have proper spacing after paragraph
                    // If last output doesn't end with newline, add one
                    if (output.length > 0) {
                      const last = output[output.length - 1];
                      if (typeof last === "string" && !last.endsWith("\n")) {
                        output.push("\n");
                      }
                    } else {
                      output.push("\n");
                    }
                  }
                  break;
              }
            }
            found = true;
            break;
          }
        }

        if (found) {
          // Special handling for lists
          if (name === "ul" || name === "ol") {
            output.push("\n");
          }
          i++;
          continue;
        }
        // If no matching tag found, ignore the closing tag
        i++;
        continue;
      }

      // Handle opening/self-closing tags
      switch (name) {
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6": {
          const level = parseInt(name[1]);
          if (output.length > 0 && !output[output.length - 1]?.endsWith("\n")) {
            output.push("\n");
          }
          output.push("\n");
          output.push("#".repeat(level));
          output.push(" ");
          stack.push(token);
          break;
        }

        case "p": {
          // When opening a paragraph, ensure we have proper spacing
          // If previous output doesn't end with \n\n, add it
          if (output.length > 0) {
            const last = output[output.length - 1];
            if (typeof last === "string") {
              if (!last.endsWith("\n\n")) {
                // If it ends with \n, modify the last item to add one more \n (make it \n\n)
                if (last.endsWith("\n") && !last.endsWith("\n\n")) {
                  output[output.length - 1] = last + "\n";
                } else {
                  // Otherwise add \n\n
                  output.push("\n\n");
                }
              }
            } else {
              output.push("\n\n");
            }
          } else {
            output.push("\n\n");
          }
          stack.push(token);
          break;
        }

        case "br": {
          output.push("\n");
          break;
        }

        case "strong":
        case "b": {
          ensureSpaceBeforeInline();
          // Simply output ** - no spacing logic here
          // Spacing will be handled by text node processing for content outside the bold markers
          output.push("**");
          if (!selfClosing) stack.push(token);
          break;
        }

        case "em":
        case "i": {
          ensureSpaceBeforeInline();
          // Simply output * - no spacing logic here
          // Spacing will be handled by text node processing for content outside the emphasis markers
          output.push("*");
          if (!selfClosing) stack.push(token);
          break;
        }

        case "code": {
          ensureSpaceBeforeInline();
          const inPre = getContextTag() === "pre";
          if (inPre) {
            // Inside <pre><code>, preserve as-is
            if (!selfClosing) stack.push(token);
          } else {
            // Inline code
            output.push("`");
            if (!selfClosing) stack.push(token);
          }
          break;
        }

        case "pre": {
          if (output.length > 0 && !output[output.length - 1]?.endsWith("\n\n")) {
            output.push("\n\n");
          }
          output.push("```");
          const lang = attributes?.class?.match(/language-(\w+)/)?.[1];
          if (lang) {
            output.push(lang);
          }
          output.push("\n");
          if (!selfClosing) stack.push(token);
          break;
        }

        case "a": {
          // Add space before [ if previous content ends with alphanumeric character
          if (output.length > 0) {
            const last = output[output.length - 1];
            if (last && typeof last === "string") {
              const trimmed = last.trim();
              const lastChar = trimmed[trimmed.length - 1];
              // If last character is alphanumeric and output doesn't already end with space/newline
              if (lastChar && /[a-zA-Z0-9]/.test(lastChar)) {
                if (!last.endsWith(" ") && !last.endsWith("\n") && !last.match(/\s$/)) {
                  output.push(" ");
                }
              }
            }
          }
          const href = attributes?.href || "";
          output.push("[");
          if (!selfClosing) stack.push(token);
          break;
        }

        case "img": {
          const src = attributes?.src || "";
          const alt = attributes?.alt || "";
          output.push(`![${alt}](${src})`);
          break;
        }

        case "ul":
        case "ol": {
          if (output.length > 0 && !output[output.length - 1]?.endsWith("\n")) {
            output.push("\n");
          }
          if (!selfClosing) stack.push(token);
          break;
        }

        case "li": {
          if (!isInList()) {
            output.push("\n");
          }
          const marker = getListMarker();
          output.push(`${marker} `);
          if (!selfClosing) stack.push(token);
          break;
        }

        case "blockquote": {
          if (output.length > 0 && !output[output.length - 1]?.endsWith("\n\n")) {
            output.push("\n\n");
          }
          output.push("> ");
          if (!selfClosing) stack.push(token);
          break;
        }

        case "hr": {
          if (output.length > 0 && !output[output.length - 1]?.endsWith("\n\n")) {
            output.push("\n\n");
          }
          output.push("---\n\n");
          break;
        }

        case "figure": {
          if (output.length > 0 && !output[output.length - 1]?.endsWith("\n\n")) {
            output.push("\n\n");
          }
          if (!selfClosing) stack.push(token);
          break;
        }

        case "figcaption": {
          if (!selfClosing) stack.push(token);
          break;
        }

        default:
          // Unknown tags: ignore but track if not self-closing
          if (!selfClosing) {
            stack.push(token);
          }
          break;
      }

      i++;
    }
  }

  // Close any remaining open tags
  while (stack.length > 0) {
    const tag = stack.pop();
    if (!tag) break;

    switch (tag.name) {
      case "strong":
      case "b":
        output.push("**");
        break;
      case "em":
      case "i":
        output.push("*");
        break;
      case "code": {
        const inPre = getContextTag() === "pre";
        if (!inPre) {
          output.push("`");
        }
        break;
      }
      case "pre":
        output.push("\n```\n");
        break;
      case "a": {
        // Try to find href from attributes
        const href = tag.attributes?.href || "";
        output.push(`](${href})`);
        break;
      }
      case "blockquote":
        output.push("\n");
        break;
      case "p":
      case "li":
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        if (needsNewlineAfter(tag.name)) {
          output.push("\n");
        }
        break;
    }
  }

  return output.join("").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Converts HTML string to Markdown.
 *
 * @param html - HTML content to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) {
    return "";
  }

  // Clean up common Substack HTML patterns
  let cleaned = html
    // Remove script and style tags entirely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove common Substack wrapper divs that don't add meaning
    .replace(/<div[^>]*class="[^"]*subscribe[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    // Don't normalize whitespace here - let the tokenizer handle it per-text-node
    // This preserves spaces between tags and text
    .trim();

  const tokens = tokenize(cleaned);
  return postProcessMarkdown(tokensToMarkdown(tokens));
}

function postProcessMarkdown(markdown: string): string {
  return (
    markdown
      // Newline-safe: remove spaces/tabs *inside* emphasis markers only (avoid eating newlines or
      // removing the required space after closing markers).
      .replace(/(^|[\s([{"'“‘>])\*\*[ \t]+/g, "$1**")
      .replace(/[ \t]+\*\*(?=($|[\s.,;:!?)}\]”’"']))/g, "**")
      .replace(/(^|[\s([{"'“‘>])\*[ \t]+/g, "$1*")
      .replace(/[ \t]+\*(?=($|[\s.,;:!?)}\]”’"']))/g, "*")
      // If a closing marker is immediately followed by a word char, add a space
      .replace(/(?<=\S)\*\*(?=[a-zA-Z0-9])/g, "** ")
      .replace(/(\))([a-zA-Z0-9])/g, "$1 $2")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

