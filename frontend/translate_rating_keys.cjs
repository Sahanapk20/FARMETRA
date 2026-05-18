const fs = require('fs');

async function translateText(text, targetLang) {
  if (targetLang === 'en') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data[0][0][0];
  } catch (e) {
    return text;
  }
}

const keysToTranslate = {
  rateYourExperience: 'Rate Your Experience',
  howWouldYouRate: 'How would you rate FARMETRA?',
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  veryGood: 'Very Good',
  excellent: 'Excellent',
  clickStarToRate: 'Click a star to rate',
  yourReviewOptional: 'Your Review (Optional)',
  reviewPlaceholder: 'Write your detailed review about the website, farming features, or your experience...',
  reviewMinChars: 'Minimum 10 characters recommended',
  selectRatingError: 'Please select a rating (1-5 stars)',
  submitReview: 'Submit Review',
  averageRating: 'Average Rating:',
  reviewsCount: '(128 reviews)',
  feedbackThanks: 'Thank you for your feedback!',
  feedbackSuccess: 'Your review has been submitted successfully.'
};

const languages = {
  en: 'en',
  hi: 'hi',
  bn: 'bn',
  te: 'te',
  mr: 'mr',
  ta: 'ta',
  ur: 'ur',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  or: 'or',
  as: 'as',
  sd: 'sd',
  ks: 'ks',
  ne: 'ne',
  kok: 'gom',
  doi: 'doi',
  mai: 'mai',
  sa: 'sa',
  mni: 'mni-Mtei',
  bho: 'bho'
};

async function main() {
  const landingPath = 'src/locales/translations/landing.ts';
  let landingContent = fs.readFileSync(landingPath, 'utf-8');

  for (const [langCode, gtCode] of Object.entries(languages)) {
    console.log(`Translating review keys for ${langCode}...`);
    
    let translatedKeys = {};
    for (const [key, text] of Object.entries(keysToTranslate)) {
      const translated = await translateText(text, gtCode);
      translatedKeys[key] = translated;
      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Inject into landingContent
    const blockRegex = new RegExp(`(^|\\n)  ${langCode}: \\{[\\s\\S]*?(?=\\n  \\},|\\n  \\})`, 'g');
    
    landingContent = landingContent.replace(blockRegex, (match) => {
      let finalInsert = '\n    // Website Rating component keys\n';
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
  console.log('Finished translating and injecting review keys for all languages.');
}

main();
