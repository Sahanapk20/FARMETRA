const fs = require('fs');
const content = fs.readFileSync('src/locales/translations.ts.old', 'utf-8');
const keys = [
  'batchId', 'verified', 'organicWheat', 'goldenValleyFarm', 'harvested', 'processing', 'inTransit', 'scanToVerify', 'blockchainVerified',
  'supplyChainCoverage', 'everyStakeholder', 'platformFeatures', 'everythingYouNeed', 'supplyChainTransparency', 'powerfulTools', 'learnMore',
  'simpleProcess', 'howFARMETRAWorks', 'getStartedMinutes', 'step01', 'step02', 'step03', 'step04',
  'createBatch', 'createBatchDesc', 'trackEvents', 'trackEventsDesc', 'generateQR', 'generateQRDesc', 'consumerVerifies', 'consumerVerifiesDesc',
  'whyChooseUs', 'buildTrust', 'transparency', 'benefitsIntro', 'startBuildingTrust', 'reductionCounterfeits', 'fasterRecall', 'trustIncrease',
  'readyToTransform', 'joinAgriBusinesses', 'getStartedFree', 'scheduleDemo',
  'buildingTrust', 'platform', 'pricing', 'resources', 'documentation', 'apiReference', 'support', 'company', 'about', 'contact', 'careers', 'allRightsReserved', 'privacyPolicy', 'termsOfService'
];

const langs = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'sd', 'ks', 'ne', 'kok', 'doi', 'mai', 'sa', 'mni', 'bho'];

const extracted = {};
for (const lang of langs) {
  extracted[lang] = {};
  
  // Find the language section in the file
  const regex = new RegExp(lang + ':\\s*\\{([\\s\\S]*?)\\}', 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const section = match[1];
    for (const key of keys) {
      const keyRegex = new RegExp(key + ':\\s*[\'"]([^\'"]+)[\'"]');
      const keyMatch = section.match(keyRegex);
      if (keyMatch) {
        extracted[lang][key] = keyMatch[1];
      }
    }
  }
}

let foundCount = 0;
for (const lang of langs) {
  const c = Object.keys(extracted[lang]).length;
  console.log(`${lang}: found ${c} keys`);
  foundCount += c;
}
console.log('Total extracted keys: ' + foundCount);
fs.writeFileSync('extracted_keys.json', JSON.stringify(extracted, null, 2));
