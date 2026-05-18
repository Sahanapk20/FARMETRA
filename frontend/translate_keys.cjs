const fs = require('fs');

async function translateText(text, targetLang) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text; // fallback to english on error
    const data = await res.json();
    return data[0][0][0];
  } catch (e) {
    return text;
  }
}

const keysToTranslate = {
  batchId: 'Batch ID',
  verified: 'Verified',
  organicWheat: 'Organic Wheat',
  goldenValleyFarm: 'Golden Valley Farm, Punjab',
  harvested: 'Harvested',
  processing: 'Processing',
  inTransit: 'In Transit',
  scanToVerify: 'Scan to verify',
  blockchainVerified: 'Blockchain Verified',
  supplyChainCoverage: 'Complete Supply Chain Coverage',
  everyStakeholder: 'Every stakeholder in the agricultural supply chain, connected and transparent.',
  platformFeatures: 'Platform Features',
  everythingYouNeed: 'Everything You Need for',
  supplyChainTransparency: 'Supply Chain Transparency',
  powerfulTools: 'Powerful tools to track, verify, and manage your agricultural products from origin to consumer.',
  learnMore: 'Learn More',
  simpleProcess: 'Simple Process',
  howFARMETRAWorks: 'How FARMETRA Works',
  getStartedMinutes: 'Get started in minutes with our simple 4-step process.',
  step01: '01',
  step02: '02',
  step03: '03',
  step04: '04',
  createBatch: 'Create a Batch',
  createBatchDesc: 'Register your harvest or product batch with details like origin, date, and quality parameters.',
  trackEvents: 'Track Events',
  trackEventsDesc: 'Record every event in the supply chain — processing, packaging, transport, and storage.',
  generateQR: 'Generate QR Code',
  generateQRDesc: 'Get a unique QR code for each batch that encodes the complete product history.',
  consumerVerifies: 'Consumer Verifies',
  consumerVerifiesDesc: 'End consumers scan the QR code to see the full journey and verify authenticity.',
  whyChooseUs: 'Why Choose Us',
  buildTrust: 'Build Trust with',
  transparency: 'Transparency',
  benefitsIntro: 'FARMETRA provides the tools and technology to ensure complete transparency in your agricultural supply chain.',
  startBuildingTrust: 'Start Building Trust',
  reductionCounterfeits: 'Reduction in Counterfeits',
  fasterRecall: 'Faster Product Recall',
  trustIncrease: 'Consumer Trust Increase',
  readyToTransform: 'Ready to Transform Your Supply Chain?',
  joinAgriBusinesses: 'Join thousands of agricultural businesses already using FARMETRA for complete traceability.',
  getStartedFree: 'Get Started Free',
  scheduleDemo: 'Schedule a Demo',
  buildingTrust: 'Building trust in agriculture through technology and transparency.',
  platform: 'Platform',
  pricing: 'Pricing',
  resources: 'Resources',
  documentation: 'Documentation',
  apiReference: 'API Reference',
  support: 'Support',
  company: 'Company',
  about: 'About',
  contact: 'Contact',
  careers: 'Careers',
  allRightsReserved: 'All Rights Reserved.',
  privacyPolicy: 'Privacy Policy',
  termsOfService: 'Terms of Service'
};

const languages = {
  kn: 'kn',
  or: 'or',
  as: 'as',
  sd: 'sd',
  ks: 'ks',
  ne: 'ne',
  kok: 'gom', // Konkani
  doi: 'doi', // Dogri
  mai: 'mai', // Maithili
  sa: 'sa', // Sanskrit
  mni: 'mni-Mtei', // Manipuri
  bho: 'bho' // Bhojpuri
};

async function main() {
  const landingPath = 'src/locales/translations/landing.ts';
  let landingContent = fs.readFileSync(landingPath, 'utf-8');

  for (const [langCode, gtCode] of Object.entries(languages)) {
    console.log(`Translating for ${langCode}...`);
    
    let translatedKeys = {};
    for (const [key, text] of Object.entries(keysToTranslate)) {
      if (['step01', 'step02', 'step03', 'step04'].includes(key)) {
        translatedKeys[key] = text;
        continue;
      }
      
      const translated = await translateText(text, gtCode);
      translatedKeys[key] = translated;
      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Inject into landingContent
    const blockRegex = new RegExp(`(^|\\n)  ${langCode}: \\{[\\s\\S]*?(?=\\n  \\},|\\n  \\})`, 'g');
    
    landingContent = landingContent.replace(blockRegex, (match) => {
      let finalInsert = '\n    // Auto-translated missing keys\n';
      let added = 0;
      for (const [k, v] of Object.entries(translatedKeys)) {
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
  console.log('Finished translating and injecting all languages.');
}

main();
