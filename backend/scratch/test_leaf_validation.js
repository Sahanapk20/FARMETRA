const Jimp = require('jimp');
const path = require('path');

// Dynamically require preprocessImage from mlInference.js
// Since preprocessImage is not exported directly, we can read the file and wrap/evaluate it,
// or we can test it directly by temporarily exporting it, or we can write a test function in the script that duplicates the validation logic to verify the metrics.
// Let's duplicate the exact validation logic in this test script to verify that the math/logic works perfectly for Jimp images.

async function runTests() {
  console.log('Running Leaf Validation Logic Tests...\n');

  // Helper to run the exact scan logic
  function validateLeafImage(image) {
    const totalPixels = 224 * 224;
    let brightPixels = 0;
    let greyPixels = 0;
    let organicColorPixels = 0;
    let bluePixels = 0;
    let rSum = 0, gSum = 0, bSum = 0;

    image.scan(0, 0, 224, 224, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      rSum += r;
      gSum += g;
      bSum += b;
      
      const brightness = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      // Check for bright near-white (background of app/browser screenshots)
      if (brightness > 220 && saturation < 0.1) {
        brightPixels++;
      }
      
      // Check for neutral grey/white/black (UI frames, text, lines)
      if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && Math.abs(r - b) < 12) {
        greyPixels++;
      }
      
      // Check for organic plant colors (greens, yellows, browns, oranges)
      if (brightness >= 20 && brightness <= 245) {
        if ((g > r && g > b) || (r > b && g > b && Math.abs(r - g) < 60)) {
          organicColorPixels++;
        }
      }
      
      // Blue pixels (UI buttons/links, screen blues, extremely rare in leaves)
      if (b > r && b > g && (b - r > 20) && (b - g > 20)) {
        bluePixels++;
      }
    });

    const avgR = rSum / totalPixels;
    const avgG = gSum / totalPixels;
    const avgB = bSum / totalPixels;
    const avgSaturation = (Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB)) / (Math.max(avgR, avgG, avgB) || 1);

    const brightRatio = brightPixels / totalPixels;
    const greyRatio = greyPixels / totalPixels;
    const organicRatio = organicColorPixels / totalPixels;
    const blueRatio = bluePixels / totalPixels;

    console.log(`Metrics:
  - brightRatio: ${brightRatio.toFixed(3)} (threshold > 0.35 with low organic)
  - greyRatio: ${greyRatio.toFixed(3)} (threshold > 0.65 with low organic)
  - avgSaturation: ${avgSaturation.toFixed(3)} (threshold < 0.12 with low organic)
  - organicRatio: ${organicRatio.toFixed(3)} (leaf colors)
  - blueRatio: ${blueRatio.toFixed(3)} (threshold > 0.5)`);

    const isInvalid = (brightRatio > 0.35 && organicRatio < 0.15) || 
                       (greyRatio > 0.65 && organicRatio < 0.15) || 
                       (avgSaturation < 0.12 && organicRatio < 0.15) ||
                       (blueRatio > 0.5);

    if (isInvalid) {
      console.log('❌ REJECTED: Not a valid plant leaf image.');
      return false;
    } else {
      console.log('✅ ACCEPTED: Valid plant leaf image characteristics.');
      return true;
    }
  }

  // Test 1: Solid white screenshot-like background
  console.log('--- Test 1: Solid White / Screenshot Background ---');
  const whiteImg = new Jimp(224, 224, 0xFFFFFFFF);
  const result1 = validateLeafImage(whiteImg);
  console.log(`Expected: REJECTED, Got: ${result1 ? 'ACCEPTED' : 'REJECTED'}\n`);

  // Test 2: Solid blue screen/UI panel
  console.log('--- Test 2: UI Blue / Flat Blue ---');
  const blueImg = new Jimp(224, 224, 0x0000FFFF);
  const result2 = validateLeafImage(blueImg);
  console.log(`Expected: REJECTED, Got: ${result2 ? 'ACCEPTED' : 'REJECTED'}\n`);

  // Test 3: Mostly Green (Organic plant leaf)
  console.log('--- Test 3: Green Plant Leaf ---');
  const greenImg = new Jimp(224, 224, 0x34A853FF);
  // Add some leaf color variation
  greenImg.scan(50, 50, 100, 100, function(x, y, idx) {
    this.bitmap.data[idx + 0] = 0x24; // slightly darker green
    this.bitmap.data[idx + 1] = 0x88;
    this.bitmap.data[idx + 2] = 0x33;
  });
  const result3 = validateLeafImage(greenImg);
  console.log(`Expected: ACCEPTED, Got: ${result3 ? 'ACCEPTED' : 'REJECTED'}\n`);

  // Test 4: Screenshot of the application (mixed elements: white background, grey text/UI, few/no greens)
  console.log('--- Test 4: App Screenshot Mock (80% white, 20% grey, 0% green) ---');
  const mockScreenshot = new Jimp(224, 224, 0xFFFFFFFF);
  // Scan and draw some grey text/lines
  mockScreenshot.scan(0, 0, 224, 40, function(x, y, idx) { // browser header
    this.bitmap.data[idx + 0] = 230;
    this.bitmap.data[idx + 1] = 230;
    this.bitmap.data[idx + 2] = 230;
  });
  mockScreenshot.scan(20, 80, 180, 20, function(x, y, idx) { // grey UI blocks
    this.bitmap.data[idx + 0] = 240;
    this.bitmap.data[idx + 1] = 240;
    this.bitmap.data[idx + 2] = 240;
  });
  mockScreenshot.scan(40, 120, 140, 40, function(x, y, idx) { // black text lines
    this.bitmap.data[idx + 0] = 50;
    this.bitmap.data[idx + 1] = 50;
    this.bitmap.data[idx + 2] = 50;
  });
  const result4 = validateLeafImage(mockScreenshot);
  console.log(`Expected: REJECTED, Got: ${result4 ? 'ACCEPTED' : 'REJECTED'}\n`);
}

runTests().catch(err => console.error(err));
