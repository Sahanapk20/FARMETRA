const QRCode = require("qrcode");

/**
 * Generate QR code as base64 data URL
 * @param {string} url - The URL to encode in the QR code
 * @returns {Promise<string>} - Base64 data URL of the QR code
 */
async function generateQR(url) {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    throw err;
  }
}

module.exports = generateQR;
