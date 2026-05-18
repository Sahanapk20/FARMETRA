const fs = require('fs');

const landingPath = 'src/locales/translations/landing.ts';
let landingContent = fs.readFileSync(landingPath, 'utf-8');

const extracted = JSON.parse(fs.readFileSync('extracted_keys.json', 'utf-8'));

const langs = Object.keys(extracted);

for (const lang of langs) {
  const keys = extracted[lang];
  if (Object.keys(keys).length === 0) continue;
  
  // Build the string to insert
  let insertStr = '\n';
  for (const [k, v] of Object.entries(keys)) {
    // Only insert if it doesn't already exist in the landing block
    // We'll just append it to the end of the block
    insertStr += `    ${k}: '${v.replace(/'/g, "\\'")}',\n`;
  }
  
  // Find the language block
  const blockRegex = new RegExp(`(^|\\n)  ${lang}: \\{[\\s\\S]*?(?=\\n  \\},|\\n  \\})`, 'g');
  
  landingContent = landingContent.replace(blockRegex, (match) => {
    // Check which keys are already in this block to avoid duplicates
    let finalInsert = '\n    // Injected missing keys\n';
    let added = 0;
    for (const [k, v] of Object.entries(keys)) {
      if (!match.includes(`${k}:`)) {
        finalInsert += `    ${k}: '${v.replace(/'/g, "\\'")}',\n`;
        added++;
      }
    }
    if (added === 0) return match;
    return match + finalInsert;
  });
}

fs.writeFileSync(landingPath, landingContent);
console.log('landing.ts updated with extracted keys.');
