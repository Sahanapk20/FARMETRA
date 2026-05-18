const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

/* --------------------------------------------------
   FARMETRA AI System Prompt — bilingual, India-focused
-------------------------------------------------- */
const SYSTEM_PROMPT = `You are FARMETRA AI — a friendly, expert assistant for the FARMETRA platform and an agricultural advisor for Indian farmers. You are bilingual (English + Hindi).

You must freely answer questions about the FARMETRA platform and its features, including the roles of all users (Farmers, Processors, Distributors, Retailers, Consumers, and Students/Researchers), as well as provide agricultural advice.

## Your expertise:
- **Crop cultivation**: Kharif (Rice, Cotton, Maize, Bajra, Soybean — June–Nov), Rabi (Wheat, Gram, Mustard, Barley — Nov–Apr), Zaid (Cucumber, Watermelon — Mar–Jun)
- **Soil health**: Alluvial soil (North India), Black/Regur (Maharashtra, MP), Red soil (South India), Laterite, Desert/Arid (Rajasthan)
- **Pest & disease**: Identify from descriptions, suggest organic + chemical treatments, ICAR recommendations
- **Weather-based advice**: Interpret real-time weather and give actionable sowing/irrigation/harvest advice
- **Mandi & market prices**: Help farmers understand prices, best time to sell, MSP (Minimum Support Price)
- **Government schemes**: PM-KISAN, PMFBY (crop insurance), KCC (Kisan Credit Card), MSP, Soil Health Card, eNAM platform

## FARMETRA Platform - How It Works:
- **What is FARMETRA?**: A supply chain tracking system for agricultural products with blockchain verification. Consumers scan QR codes to see the complete farm-to-store journey.

- **Supply Chain Actors**:
  • **Farmer**: Grows crops, creates the first batch record with product name, weight, farm location, harvest date, certifications
  • **Processor**: Receives from farmer, processes/packages products, can split large batches into smaller ones
  • **Distributor**: Transports products from processor to retailers
  • **Retailer**: Sells products to consumers
  • **Consumer**: Scans QR code to verify product origin and see complete journey

- **Batch System**:
  • Farmers create "batches" when harvesting — each gets a unique blockchain hash
  • Data stored on IPFS (decentralized storage) for immutability
  • Each batch has a QR code for tracking
  • Batches can be split (e.g., 100kg → 4×25kg) — child batches keep link to parent

- **Handoff Process**: Every transfer between actors is recorded with who handed off, who received, when, and where. Creates unbreakable chain of custody.

- **QR Verification**: Consumers scan QR on packaging to see:
  • Product details (name, type, weight)
  • Origin (farm name and location)
  • Journey timeline (every handoff from farm to store)
  • Blockchain verification (IPFS hash proving authenticity)

- **Dashboard Features**: Users see stats, charts (batch status pie chart, monthly creation trends), recent activity, and batch listings.

- **Roles**: Different user roles (farmer, processor, distributor, retailer, admin) with appropriate permissions.

## Language rules:
- Hindi message (Devanagari) → respond in Hindi
- English or Hinglish → respond in English
- Always use simple, farmer-friendly language

## Format:
- Use bullet points and relevant emojis
- Keep answers under 200 words
- Give practical, actionable advice
- Always be encouraging and supportive
- When relevant, mention how FARMETRA can help with traceability and getting better prices`;

/* --------------------------------------------------
   Intent detection
-------------------------------------------------- */
function detectIntent(message) {
  const lower = message.toLowerCase();
  if (/weather|rain|monsoon|temperature|forecast|climate|मौसम|बारिश|वर्षा|तापमान/.test(lower))
    return "weather";
  if (/price|mandi|market|rate|बाजार|मंडी|भाव|दाम|कीमत/.test(lower))
    return "mandi";
  if (/pest|disease|insect|fungus|blight|rot|worm|bug|spray|pesticide|कीट|रोग|कीड़ा|फंगस/.test(lower))
    return "pest";
  return "general";
}

/* --------------------------------------------------
   Location extractor
-------------------------------------------------- */
function extractLocation(message) {
  const locs = [
    "punjab","haryana","uttar pradesh","rajasthan","gujarat","maharashtra",
    "karnataka","tamil nadu","andhra pradesh","telangana","west bengal","odisha",
    "madhya pradesh","bihar","jharkhand","chhattisgarh","uttarakhand","himachal pradesh",
    "kerala","delhi","goa",
    // cities
    "mumbai","bangalore","chennai","kolkata","hyderabad","pune","ahmedabad","jaipur",
    "lucknow","chandigarh","bhopal","patna","nagpur","indore","surat","ludhiana",
    "amritsar","varanasi","agra","nashik","coimbatore","kochi","vizag","visakhapatnam",
  ];
  const lower = message.toLowerCase();
  for (const loc of locs) {
    if (lower.includes(loc))
      return loc.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return null;
}

/* --------------------------------------------------
   Crop extractor
-------------------------------------------------- */
function extractCrop(message) {
  const crops = [
    "wheat","rice","paddy","corn","maize","cotton","sugarcane","soybean","tomato",
    "onion","potato","garlic","chili","mustard","groundnut","sunflower","bajra",
    "jowar","ragi","barley","gram","lentil","pulses","ginger","turmeric","mango",
    "banana","grapes","pomegranate","guava",
    "गेहूं","चावल","धान","मक्का","कपास","गन्ना","सोयाबीन","टमाटर","प्याज","आलू",
  ];
  const lower = message.toLowerCase();
  for (const crop of crops) if (lower.includes(crop)) return crop;
  return null;
}

/* --------------------------------------------------
   Weather API (WeatherAPI.com — 1M free calls/month)
   Get free key at: https://www.weatherapi.com/signup.aspx
-------------------------------------------------- */
async function fetchWeather(location) {
  const apiKey = process.env.WEATHERAPI_KEY;
  if (!apiKey) return null;
  try {
    // Single call — WeatherAPI handles geocoding automatically
    const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)},India&aqi=no`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();

    return {
      city:        d.location.name,
      state:       d.location.region,
      temp:        Math.round(d.current.temp_c),
      feelsLike:   Math.round(d.current.feelslike_c),
      humidity:    d.current.humidity,
      description: d.current.condition.text,
      windSpeed:   d.current.wind_kph,
      precipitation: d.current.precip_mm,
      uv:          d.current.uv,
      cloud:       d.current.cloud,
    };
  } catch { return null; }
}

/* --------------------------------------------------
   Mandi Prices API (data.gov.in)
-------------------------------------------------- */
async function fetchMandiPrices(commodity, state) {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) return null;
  try {
    let url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=8`;
    if (commodity) url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
    if (state)     url += `&filters[state]=${encodeURIComponent(state)}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return d.records || [];
  } catch { return null; }
}

let cachedModel = null;
let lastDiscoveryTime = 0;

async function discoverBestModel(apiKey) {
  const now = Date.now();
  if (cachedModel && (now - lastDiscoveryTime < 300000)) return cachedModel; // 5 min cache
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!res.ok || !data.models) return "gemini-1.5-flash"; // Default fallback

    const authorizedModels = data.models
      .filter(m => m.supportedGenerationMethods.includes("generateContent"))
      .map(m => m.name.replace("models/", ""));

    console.log("[CHAT] Authorized Models discovered:", authorizedModels);

    // Priority: 2.0 Flash -> 1.5 Flash (latest) -> 1.5 Flash -> gemini-pro -> anything at the top
    const priority = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-pro"
    ];

    for (const p of priority) {
      if (authorizedModels.includes(p)) {
        console.log(`[CHAT] Selecting optimal model: ${p}`);
        cachedModel = p;
        lastDiscoveryTime = now;
        return p;
      }
    }

    if (authorizedModels.length > 0) {
      console.log(`[CHAT] Selecting first available model: ${authorizedModels[0]}`);
      cachedModel = authorizedModels[0];
      lastDiscoveryTime = now;
      return cachedModel;
    }

    return "gemini-1.5-flash";
  } catch (err) {
    console.error("[CHAT] Discovery failed:", err.message);
    return "gemini-1.5-flash";
  }
}

/* --------------------------------------------------
   POST /chat
-------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const { message, history, location, language } = req.body;
    if (!message || typeof message !== "string")
      return res.status(400).json({ success: false, error: "Message is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here")
      return res.status(503).json({
        success: false,
        error: "AI service not configured. Add GEMINI_API_KEY to backend .env file.",
      });

    const intent = detectIntent(message);
    const detectedLocation = extractLocation(message) || location;
    const detectedCrop = extractCrop(message);

    // Dynamic model discovery
    const modelName = await discoverBestModel(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: SYSTEM_PROMPT
    });

    // --- Gather real-time context ---
    let contextBlock = "";

    if (intent === "weather" && detectedLocation) {
      const w = await fetchWeather(detectedLocation);
      if (w) {
        contextBlock = `\n\n[REAL-TIME WEATHER — ${w.city}${w.state ? ', ' + w.state : ''}]
\uD83C\uDF21️ Temperature: ${w.temp}°C (feels like ${w.feelsLike}°C)
\uD83D\uDCA7 Humidity: ${w.humidity}%
\uD83C\uDF24️ Condition: ${w.description}
\uD83D\uDCA8 Wind: ${w.windSpeed} km/h
\uD83C\uDF27️ Precipitation: ${w.precipitation} mm
Based on this live weather data, give specific farming advice for today.`;
      } else {
        contextBlock = `\n\n[Note: Weather data unavailable for "${detectedLocation}". Provide general seasonal advice for ${detectedLocation || "India"} instead.]`;
      }
    }

    if (intent === "mandi") {
      const prices = await fetchMandiPrices(detectedCrop, detectedLocation);
      if (prices && prices.length > 0) {
        const rows = prices.slice(0, 5).map(p =>
          `• ${p.commodity} | ${p.market}, ${p.district} (${p.state}) — Min ₹${p.min_price} / Max ₹${p.max_price} / Modal ₹${p.modal_price} per quintal`
        ).join("\n");
        contextBlock = `\n\n[LIVE MANDI PRICES — data.gov.in]\n${rows}\nHelp the farmer understand these prices and suggest the best selling strategy.`;
      } else {
        contextBlock = `\n\n[Note: Live mandi data unavailable. Provide general market advice, typical price ranges, and suggest checking eNAM or local mandi for current rates.]`;
      }
    }

    // --- Build conversation for Gemini ---
    let chatHistory = (history || []).slice(-10).map(msg => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    // Gemini requires the FIRST message in the history to be from the 'user'
    while (chatHistory.length > 0 && chatHistory[0].role !== "user") {
      chatHistory.shift();
    }

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });

    // Current message with context and language prompt
    let fullMessage = message + contextBlock;
    
    // Explicitly force the language based on the user's current setting
    if (language === "hi") {
      fullMessage += "\n\n(IMPORTANT: Please respond in HINDI only)";
    } else {
      fullMessage += "\n\n(IMPORTANT: Please respond in ENGLISH only)";
    }

    const result = await chat.sendMessage(fullMessage);
    const response = await result.response;
    const reply = response.text();

    return res.json({ 
      success: true, 
      reply: reply.trim(), 
      intent, 
      detectedLocation, 
      detectedCrop 
    });
  } catch (err) {
    console.error("Chat error:", err);
    const errorMessage = err.message || "An unexpected error occurred in the AI service.";
    return res.json({ 
      success: true,
      reply: `❌ AI Error: ${errorMessage}\n\nPlease verify your GEMINI_API_KEY or model availability.`,
      error: errorMessage 
    });
  }
});

module.exports = router;
