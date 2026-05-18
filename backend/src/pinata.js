const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

if (!PINATA_JWT) {
  console.warn("PINATA_JWT not set in .env — Pinata uploads will fail.");
}

async function uploadJSONToPinata(jsonData) {
  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      jsonData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );
    return { ipfsHash: res.data.IpfsHash, url: PINATA_GATEWAY + res.data.IpfsHash };
  } catch (err) {
    const info = err.response?.data || err.message;
    console.error("Pinata JSON upload error:", info);
    throw new Error("Pinata JSON upload failed");
  }
}

async function uploadFileToPinata(filePath) {
  try {
    const data = new FormData();
    data.append("file", fs.createReadStream(filePath));

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
      maxBodyLength: Infinity,
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        ...data.getHeaders(),
      },
    });

    return { ipfsHash: res.data.IpfsHash, url: PINATA_GATEWAY + res.data.IpfsHash };
  } catch (err) {
    console.error("Pinata file upload error:", err.response?.data || err.message);
    throw new Error("Pinata file upload failed");
  }
}

module.exports = { uploadJSONToPinata, uploadFileToPinata };