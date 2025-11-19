const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(process.cwd(), 'app/posts');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatterRaw = match[1];
  const remainingContent = content.replace(match[0], '').trim();
  
  const metadata = {};
  frontmatterRaw.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      let value = valueParts.join(':').trim();
      // Remove quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (key.trim() === 'tag' || key.trim() === 'tags') {
         // Handle tag which might be single or list, but here treating as string or array
         // Based on existing files, it looks like single values mostly, but let's handle comma split
         // The previous reader split by comma, so we will too to be safe, or just store as string if that's what it is
         // Actually, to match the interface, let's make it an array
         metadata['tags'] = value.split(',').map(t => t.trim());
      } else {
        metadata[key.trim()] = value;
      }
    }
  });

  return { metadata, remainingContent };
}

function migrate() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('Posts directory not found');
    return;
  }

  const dirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true });

  dirs.forEach(dir => {
    if (!dir.isDirectory()) return;

    const filePath = path.join(POSTS_DIR, dir.name, 'page.mdx');
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(content);

    if (parsed) {
      const { metadata, remainingContent } = parsed;
      
      // Construct export string
      const exportString = `export const metadata = ${JSON.stringify(metadata, null, 2)};\n\n`;
      
      const newContent = exportString + remainingContent;
      
      fs.writeFileSync(filePath, newContent);
      console.log(`Migrated ${dir.name}`);
    } else {
      console.log(`Skipping ${dir.name} (no frontmatter found)`);
    }
  });
}

migrate();

