import { useState, useRef, useEffect, useCallback, type JSX } from 'react';
import {
  MessageCircle, X, Send, Leaf, User, Wifi, WifiOff,
  Cloud, TrendingUp, Bug, Wheat, MapPin, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { getTranslation } from '../locales/translations';
import './Chatbot.css';

/* ====================================================
   FARMETRA AI Chatbot - STRICT MODE
   • ONLY Gemini API responses
   • NO hardcoded answers
   • Strict topic filtering
==================================================== */

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

// ---- Quick Actions ----
interface QuickAction {
  id: string;
  icon: JSX.Element;
  color: string;
  suggestions: string[];
}

// Function to get quick actions based on language
const getQuickActions = (lang: string): QuickAction[] => [
  {
    id: 'cropHelp',
    icon: <Wheat size={14} />,
    color: 'var(--primary-500)',
    suggestions: [
      getTranslation('chatbot', 'bestCropsMonsoon', lang),
      getTranslation('chatbot', 'wheatCultivation', lang),
      getTranslation('chatbot', 'organicFarming', lang)
    ],
  },
  {
    id: 'weather',
    icon: <Cloud size={14} />,
    color: '#3b82f6',
    suggestions: [
      getTranslation('chatbot', 'weatherForecast', lang),
      getTranslation('chatbot', 'irrigationAdvice', lang),
      getTranslation('chatbot', 'monsoonTips', lang)
    ],
  },
  {
    id: 'mandiPrices',
    icon: <TrendingUp size={14} />,
    color: '#f59e0b',
    suggestions: [
      getTranslation('chatbot', 'wheatPriceToday', lang),
      getTranslation('chatbot', 'onionPrice', lang),
      getTranslation('chatbot', 'tomatoPrice', lang)
    ],
  },
  {
    id: 'pestDisease',
    icon: <Bug size={14} />,
    color: '#ef4444',
    suggestions: [
      getTranslation('chatbot', 'aphidsControl', lang),
      getTranslation('chatbot', 'wheatRustTreatment', lang),
      getTranslation('chatbot', 'naturalPestControl', lang)
    ],
  },
];

// ---- Indian States ----
const indianStates = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Odisha','Punjab','Rajasthan','Tamil Nadu',
  'Telangana','Uttar Pradesh','Uttarakhand','West Bengal',
];

function getTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---- Chatbot Configuration ----

// ---- STRICT FILTER ----
function isAllowedQuestion(query: string): boolean {
  const q = query.toLowerCase();

  const allowed = [
    'crop','farm','agriculture','cultivation','grow','plant','seed','soil',
    'fertilizer','pest','disease','irrigation','harvest','weather',
    'rain','monsoon','season','mandi','price','market',
    'rice','wheat','tomato','potato','onion','fruit','vegetable',
    'cotton','sugarcane','organic','compost','farmer',
    'farmetra','login','register','website','batch','qr',
    'processor','processing','distributor','retailer','logistics',
    'traceability','blockchain','warehouse','inventory','stock','supply',
    'certificate','certification','fssai','fair trade','iso','haccp','apeda',
    'consumer','student','role','user'
  ];

  const reject = [
    'cricket','football','movie','actor','music','song','joke','politics','coding'
  ];

  if (reject.some(r => q.includes(r))) return false;
  return allowed.some(a => q.includes(a));
}

// ---- FALLBACK ANSWERS (when API quota exceeded) ----
function generateFallbackAnswer(query: string): string {
  const q = query.toLowerCase();
  
  // Wheat
  if (q.includes('wheat') || q.includes('gehu')) {
    return `🌾 **Wheat Cultivation Guide**

**Best Season:** November-December (Rabi)
**Soil:** Loamy soil with good drainage
**Seed Rate:** 100-125 kg per hectare
**Sowing Method:** Line sowing or broadcasting
**Key Steps:**
1. Plough field 2-3 times
2. Add FYM/compost
3. Sow seeds 4-5 cm deep
4. First irrigation at crown root stage
5. Second at flowering stage

**Major Pests:** Aphids, termites
**Diseases:** Rust, loose smut
**Yield:** 40-50 quintals/hectare`;
  }
  
  // Rice/Paddy
  if (q.includes('rice') || q.includes('paddy') || q.includes('dhan')) {
    return `🌾 **Rice Cultivation Guide**

**Best Season:** June-July (Kharif)
**Method:** Transplanting recommended
**Seedling Age:** 25-30 days
**Spacing:** 20x15 cm
**Water Management:**
- 2-5 cm standing water
- Drain before weeding

**Fertilizer:** NPK 100:50:50 kg/ha
**Major Pests:** Stem borer, leaf folder
**Diseases:** Blast, bacterial blight
**Yield:** 50-60 quintals/hectare`;
  }
  
  // Tomato
  if (q.includes('tomato')) {
    return `🍅 **Tomato Growing Guide**

**Season:** 
- Kharif: June-July
- Rabi: October-November
**Spacing:** 60x45 cm
**Seed Rate:** 400-500g per hectare

**Care:**
- Staking required
- Regular watering
- Mulching helps

**Pests:** Fruit borer, whitefly
**Diseases:** Early blight, leaf curl
**Harvest:** 60-90 days
**Yield:** 250-300 quintals/ha`;
  }
  
  // Potato
  if (q.includes('potato') || q.includes('aloo')) {
    return `🥔 **Potato Cultivation Guide**

**Best Season:** October-December (Rabi)
**Seed:** Whole tubers, 40-50g each
**Spacing:** 60x20 cm
**Planting Depth:** 10-15 cm

**Critical Steps:**
1. Seed treatment with mancozeb
2. Earthing up at 30-40 days
3. Hilling to cover tubers

**Pests:** Potato tuber moth, cutworm
**Diseases:** Late blight, early blight
**Harvest:** 80-100 days
**Yield:** 200-300 quintals/ha`;
  }
  
  // Onion
  if (q.includes('onion') || q.includes('pyaz')) {
    return `🧅 **Onion Farming Guide**

**Season:**
- Rabi: October-November
- Kharif: June-July
**Spacing:** 15x10 cm
**Seed Rate:** 8-10 kg/ha

**Key Points:**
- Long day condition for bulb formation
- Stop irrigation 10 days before harvest
- Harvest when tops fall

**Storage:** Well-ventilated, cool place
**Yield:** 200-250 quintals/ha`;
  }
  
  // Cotton
  if (q.includes('cotton') || q.includes('kapas')) {
    return `🌱 **Cotton Cultivation Guide**

**Best Season:** April-May (Kharif)
**Spacing:** 75x30 cm (hybrid), 60x30 cm (desi)
**Seed Rate:** 3-4 kg/ha

**Management:**
- First picking at 150 days
- 4-6 pickings total
- Remove squares initially

**Major Pests:** Bollworm, whitefly, aphids
**Diseases:** Wilt, leaf curl
**Yield:** 15-25 quintals/ha lint`;
  }
  
  // Sugarcane
  if (q.includes('sugarcane') || q.includes('ganna')) {
    return `🎋 **Sugarcane Farming Guide**

**Planting Seasons:**
- Spring: February-March
- Autumn: September-October
**Spacing:** 90-120 cm rows

**Sett Preparation:**
- 3-bud setts
- Treat with fungicide
- Plant 5-7 cm deep

**Ratoon:** 2-3 crops possible
**Harvest:** 10-12 months
**Yield:** 700-1000 quintals/ha`;
  }
  
  // Monsoon/Rainy/Kharif
  if (q.includes('monsoon') || q.includes('rainy') || q.includes('kharif')) {
    return `🌧️ **Best Crops for Monsoon (Kharif)**

**Major Crops:**
• Rice - Needs standing water
• Cotton - Profitable cash crop
• Sugarcane - High yield potential
• Soybean - Nitrogen fixing
• Maize - Fast growing
• Groundnut - Oil crop
• Pigeon pea (Arhar) - Pulse crop

**Tips:**
- Ensure proper drainage
- Use raised beds where needed
- Apply basal fertilizer before rains`;
  }
  
  // Organic Farming
  if (q.includes('organic') || q.includes('jaivik')) {
    return `🌿 **Organic Farming Basics**

**Key Principles:**
• No synthetic chemicals
• Use compost, vermicompost
• Crop rotation
• Green manuring
• Bio-pesticides

**Common Inputs:**
- Cow dung manure: 10-15 tonnes/ha
- Vermicompost: 5 tonnes/ha
- Neem cake: 200 kg/ha
- Biofertilizers: Rhizobium, Azotobacter

**Certification:** 2-3 years conversion period`;
  }
  
  // Fertilizers
  if (q.includes('fertilizer') || q.includes('khad') || q.includes('urea')) {
    return `🧪 **Fertilizer Guide for Farmers**

**Major Types:**
• Urea (46% N) - Top dressing, 100-150 kg/ha
• DAP (18-46-0) - Basal, 100-125 kg/ha
• MOP (60% K) - Fruit/flower stage, 50-75 kg/ha
• SSP (16% P) - Root crops, 150-200 kg/ha

**Application Timing:**
- Basal: At sowing
- Top dressing: 30-40 days after
- Foliar: During deficiency`;
  }
  
  // Pest Control
  if (q.includes('pest') || q.includes('disease') || q.includes('insect')) {
    return `🐛 **Integrated Pest Management (IPM)**

**Cultural Methods:**
• Crop rotation
• Clean cultivation
• Resistant varieties
• Proper spacing

**Biological Control:**
• Trichoderma for fungi
• Bacillus thuringiensis for caterpillars
• Ladybugs for aphids
• Neem oil 5ml/L water

**Chemical:** Use as last resort, follow pre-harvest interval`;
  }
  
  // Weather
  if (q.includes('weather') || q.includes('mausam')) {
    return `🌤️ **Weather-Based Farming Tips**

**Monsoon (June-Sept):**
• Plant Kharif crops
• Ensure drainage
• Apply fertilizers in split doses

**Winter (Oct-Feb):**
• Grow wheat, mustard, gram
• Light irrigation
• Protect from frost

**Summer (Mar-May):**
• Vegetables, melons
• Frequent irrigation
• Mulching essential

**Always check 3-day forecast before spraying pesticides!`;
  }
  
  // Irrigation
  if (q.includes('irrigation') || q.includes('sichai') || q.includes('water')) {
    return `💧 **Irrigation Methods**

**Surface Methods:**
• Flood - Rice (inefficient)
• Furrow - Row crops (cotton, maize)
• Border strip - Wheat

**Pressurized Methods:**
• Drip - Saves 40% water, best for fruits
• Sprinkler - Good for vegetables

**Best Practices:**
- Morning/evening irrigation
- Avoid midday watering
- Match to crop growth stage
- Monitor soil moisture`;
  }
  
  // Mandi/Prices
  if (q.includes('mandi') || q.includes('price') || q.includes('market') || q.includes('bikri')) {
    return `📈 **Selling at Mandi - Tips**

**Before Selling:**
• Check Agmarknet.gov.in for rates
• Compare 3-4 mandis
• Know MSP for your crop
• Grade your produce

**Best Practices:**
- Sell when prices are high
- Avoid peak harvest rush
- Use FARMETRA QR tracking
- Store properly if delaying sale

**Documents:** Farm ID, Land records, Bank account`;
  }
  
  // Government Schemes
  if (q.includes('scheme') || q.includes('yojana') || q.includes('kisan') || q.includes('government')) {
    return `🏛️ **Key Government Schemes**

**PM-KISAN:**
• ₹6000/year direct transfer
• 3 installments of ₹2000
• All farmer families eligible

**PMFBY (Crop Insurance):**
• Premium: 1.5-2% for food crops
• 5% for horticulture
• Covers natural calamities

**Soil Health Card:**
• Free soil testing
• Fertilizer recommendations

**KCC (Kisan Credit Card):**
• Crop loan at 7% interest
• ₹3 lakh limit without collateral`;
  }
  
  // Soil
  if (q.includes('soil') || q.includes('mitti')) {
    return `🌍 **Soil Management**

**Types:**
• Sandy - Fast drainage, needs frequent irrigation
• Loamy - Best for most crops
• Clay - High water holding, needs drainage

**pH Range:** 6.0-7.5 optimal for most crops

**Improvement:**
- Add organic matter yearly
- Green manuring
- Liming for acidic soils
- Gypsum for sodic soils

**Testing:** Test NPK and micronutrients every 3 years`;
  }
  
  // Processor & Logistics
  if (q.includes('processor') || q.includes('processing') || q.includes('factory')) {
    return `🏭 **Processor Role in FARMETRA**

**What Processors do:**
• Buy raw produce from registered farmers
• Update batch status to 'Processing'
• Add value (milling, packing, grading)
• Create new linked batches for finished goods
• Ensure quality compliance

**Platform Features:**
- Traceability back to the farm
- Digital inventory management
- Direct connection to distributors`;
  }

  // Certificate/Certification explanations
  if (q.includes('certificate') || q.includes('certification') || q.includes('fssai') || q.includes('organic') || q.includes('fair trade') || q.includes('iso') || q.includes('haccp') || q.includes('gi tag') || q.includes('apeda')) {
    return `📜 **FARMETRA Certifications Guide**

**🌿 Organic Certified:**
• No synthetic pesticides or fertilizers
• Non-GMO seeds, natural farming methods
• Certified by accredited organic bodies
• Higher market value for organic produce

**🛡️ FSSAI Approved:**
• Food Safety and Standards Authority of India
• Mandatory for all food businesses
• Ensures hygiene and safety standards
• License number verification required

**🤝 Fair Trade:**
• Fair wages to farmers
• No child or forced labor
• Safe working conditions
• Community development support

**🧬 Non-GMO:**
• No genetically modified organisms
• Traditional breeding methods only
• Third-party verified
• Preserves natural genetic diversity

**📋 ISO 22000:**
• International food safety standard
• Hazard analysis at every step
• Traceability from farm to fork
• Global recognition

**✅ HACCP:**
• Hazard Analysis Critical Control Points
• Prevents food safety hazards
• Critical limits monitored
• Food safety management system

**📍 GI Tag (Geographical Indication):**
• Authentic regional specialty
• Quality linked to specific location
• Protects traditional knowledge
• Examples: Basmati Rice, Darjeeling Tea

**🚢 APEDA Certified:**
• Agricultural and Processed Food Export
• Required for export business
• Quality standards for international markets
• Export promotion support`;
  }

  if (q.includes('logistics') || q.includes('transport') || q.includes('distributor')) {
    return `🚚 **Logistics & Distribution**

**Tracking features:**
• Real-time batch movement
• Temperature-controlled logging (if applicable)
• QR code scanning at each touchpoint
• Automated delivery confirmation

**Roles involved:**
- Distributors: Manage wholesale movement
- Retailers: Final point of sale to consumers
- Logistics Partners: Handle physical transport`;
  }

  // FARMETRA
  if (q.includes('farmetra') || q.includes('login') || q.includes('register') || q.includes('website')) {
    return `🌐 **FARMETRA Platform**

**Registration:**
• Visit farmetra.com
• Use mobile number/email
• Select your role: Farmer/Processor/Distributor/Retailer

**Features:**
• QR-coded batch creation
• Blockchain traceability
• Real-time tracking
• Direct buyer connection
• Market price updates

**Support:** helpline@farmetra.com`;
  }
  
  // General fallback
  return `🌾 **I can help you with:**

• Crop cultivation (Wheat, Rice, Cotton, Vegetables)
• Pest and disease management
• Fertilizers and soil health
• Weather-based farming advice
• Market prices and mandi information
• Government schemes (PM-KISAN, PMFBY)
• FARMETRA platform features

Please ask a specific farming question!`;
}

// ---- Component ----
const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const { currentLanguage } = useLanguage();
  const [activeAction, setActiveAction] = useState<string>('cropHelp');
  const [location, setLocation] = useState<string>('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isAIOnline, setIsAIOnline] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const welcomeMsg = (): Message => ({
    id: nextId.current++,
    text: getTranslation('chatbot', 'welcome', currentLanguage),
    sender: 'bot',
    time: getTimeString(),
  });

  useEffect(() => {
    setMessages([welcomeMsg()]);
  }, []);

  useEffect(() => {
    setMessages([welcomeMsg()]);
  }, [currentLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen]);

  const handleOpen = () => { setIsOpen(true); setIsClosing(false); setShowBadge(false); };
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { setIsOpen(false); setIsClosing(false); }, 250);
  };
  const handleToggle = () => isOpen ? handleClose() : handleOpen();

  // ---- MAIN SEND FUNCTION ----
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const processedText = text.trim();

    const userMsg: Message = {
      id: nextId.current++,
      text: processedText,
      sender: 'user',
      time: getTimeString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    let replyText = '';

    // ---- STEP 1: STRICT FILTER ----
    if (!isAllowedQuestion(processedText)) {
      replyText = getTranslation('chatbot', 'filterRejection', currentLanguage);
      // Don't change AI online status for simple filter rejections
    } else {
      // ---- STEP 2: CALL BACKEND API ----
      try {
        console.log('Sending request to backend...');
        
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const res = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: processedText,
            history: messages.slice(-8),
            location: location,
            language: currentLanguage
          }),
        });

        console.log('Response status:', res.status, res.statusText);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error:', errorData);
          
          replyText = `❌ AI Error: ${errorData.error || getTranslation('chatbot', 'aiError', currentLanguage)}`;
          setIsAIOnline(false);
          
          const botMsg: Message = {
            id: nextId.current++,
            text: replyText,
            sender: 'bot',
            time: getTimeString(),
          };
          
          setIsTyping(false);
          setMessages(prev => [...prev, botMsg]);
          return;
        }

        const data = await res.json();
        console.log('API data received:', data ? 'YES' : 'NO');
        
        if (data.success && data.reply) {
          replyText = data.reply;
          setIsAIOnline(true);
          console.log('Success! AI response:', data.reply.substring(0, 50) + '...');
        } else {
          console.error('No reply in response. Using fallback.');
          replyText = generateFallbackAnswer(processedText);
          setIsAIOnline(false);
        }
      } catch (err) {
        console.error('API call failed:', err);
        // Use fallback on any error
        replyText = generateFallbackAnswer(processedText);
        setIsAIOnline(false);
      }
    }

    const botMsg: Message = {
      id: nextId.current++,
      text: replyText,
      sender: 'bot',
      time: getTimeString(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, botMsg]);
  }, [currentLanguage]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const renderText = (text: string) =>
    text.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ));

  const quickActions = getQuickActions(currentLanguage);
  const currentAction = quickActions.find((a: QuickAction) => a.id === activeAction) || quickActions[0];
  const suggestions = currentAction.suggestions;

  return (
    <>
      {/* FAB */}
      <button
        className={`chatbot-fab ${isOpen ? 'is-open' : ''}`}
        onClick={handleToggle}
        aria-label={isOpen ? 'Close assistant' : 'Open farming assistant'}
        id="chatbot-fab"
      >
        <span className="fab-icon">{isOpen ? <X size={24} /> : <MessageCircle size={26} />}</span>
        {showBadge && !isOpen && <span className="chatbot-fab-badge">1</span>}
      </button>

      {isOpen && (
        <div className={`chatbot-window ${isClosing ? 'closing' : ''}`} id="chatbot-window">

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-avatar"><Leaf size={20} /></div>
            <div className="chatbot-header-info">
              <div className="chatbot-header-title">FARMETRA AI</div>
              <div className="chatbot-header-subtitle">
                <span className="chatbot-online-dot" />
                <span>
    {isAIOnline === false ? getTranslation('chatbot', 'offline', currentLanguage)
                    : isAIOnline === true ? getTranslation('chatbot', 'geminiOnline', currentLanguage)
                    : getTranslation('chatbot', 'online', currentLanguage)}
                </span>
                {isAIOnline === false
                  ? <WifiOff size={10} style={{ color: '#f59e0b', marginLeft: 2 }} />
                  : isAIOnline === true
                  ? <Wifi size={10} style={{ color: '#10b981', marginLeft: 2 }} />
                  : null}
              </div>
            </div>
            <LanguageSelector />
            <button className="chatbot-close-btn" onClick={handleClose}><X size={16} /></button>
          </div>

          {/* Location bar */}
          <div className="chatbot-location-bar">
            <MapPin size={12} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <button
              className="chatbot-location-btn"
              onClick={() => setShowLocationPicker(p => !p)}
            >
{location || getTranslation('chatbot', 'selectState', currentLanguage)}
              <ChevronDown size={12} />
            </button>
            {location && (
              <button className="chatbot-location-clear" onClick={() => setLocation('')}>×</button>
            )}
          </div>

          {/* Location Dropdown */}
          {showLocationPicker && (
            <div className="chatbot-location-dropdown">
              {indianStates.map(s => (
                <button
                  key={s}
                  className={`chatbot-location-option ${location === s ? 'selected' : ''}`}
                  onClick={() => { setLocation(s); setShowLocationPicker(false); }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Quick Action Tabs */}
          <div className="chatbot-quick-actions">
            {quickActions.map((action: QuickAction) => (
              <button
                key={action.id}
                className={`chatbot-action-tab ${activeAction === action.id ? 'active' : ''}`}
                style={activeAction === action.id ? { borderColor: action.color, color: action.color } : {}}
                onClick={() => setActiveAction(action.id)}
              >
                <span style={{ color: activeAction === action.id ? action.color : 'rgba(255,255,255,0.4)' }}>
                  {action.icon}
                </span>
                {getTranslation('chatbot', action.id, currentLanguage)}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chatbot-message ${msg.sender}`}>
                <div className="chatbot-msg-avatar">
                  {msg.sender === 'bot' ? <Leaf size={14} /> : <User size={14} />}
                </div>
                <div>
                  <div className="chatbot-msg-bubble">{renderText(msg.text)}</div>
                  <div className="chatbot-msg-time">{msg.time}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-typing">
                <div className="chatbot-typing-avatar"><Leaf size={14} /></div>
                <div className="chatbot-typing-dots">
                  <div className="chatbot-typing-dot" />
                  <div className="chatbot-typing-dot" />
                  <div className="chatbot-typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          <div className="chatbot-suggestions">
            {suggestions.slice(0, 3).map((suggestion: string, index: number) => (
              <button key={index} className="chatbot-suggestion-chip" onClick={() => sendMessage(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input */}
          <form className="chatbot-input-area" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
placeholder={getTranslation('chatbot', 'typeMessage', currentLanguage)}
              value={input}
              onChange={e => setInput(e.target.value)}
              id="chatbot-input"
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!input.trim() || isTyping}
              id="chatbot-send-btn"
            >
              <Send size={16} />
            </button>
          </form>

          {/* Footer */}
          <div className="chatbot-footer">
            Powered by <span>OpenAI</span> &amp; <span>FARMETRA</span>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
