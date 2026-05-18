const fs = require('fs');
const content = fs.readFileSync('src/locales/translations.ts.old', 'utf-8');
const keys = ['batchId', 'verified', 'organicWheat', 'goldenValleyFarm', 'harvested', 'processing', 'inTransit', 'scanToVerify', 'blockchainVerified', 'supplyChainCoverage'];

for (const key of keys) {
  const regex = new RegExp(key + ':\\s*[\'"]([^\'"]+)[\'"]', 'g');
  const matches = content.match(regex);
  console.log(key + ' matches: ' + (matches ? matches.length : 0));
}
