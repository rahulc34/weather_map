/**
 * Bilingual content for the rule-based fallback guidance. Pure data — the
 * selection logic lives in fallbackPlan.js. Every tip carries the same
 * "impact" information the AI is required to provide.
 */

/**
 * @typedef {{ en: string, hi: string }} Bilingual
 * @typedef {object} FallbackTip
 * @property {Bilingual} title
 * @property {Bilingual} details
 * @property {'exposure'|'emissions'|'both'} reduces
 * @property {Bilingual} explanation
 * @property {Bilingual} estimate
 * @property {'low'|'medium'|'high'} confidence
 */

/** @type {Readonly<Record<string, FallbackTip>>} */
export const TIPS = Object.freeze({
  mask: {
    title: {
      en: 'Wear a well-fitted N95 outdoors',
      hi: 'बाहर अच्छी तरह फिट N95 मास्क पहनें',
    },
    details: {
      en: 'Use an N95/FFP2 mask that seals around the nose and chin. Cloth and surgical masks do little against PM2.5.',
      hi: 'नाक और ठुड्डी पर सील होने वाला N95/FFP2 मास्क पहनें। कपड़े या सर्जिकल मास्क PM2.5 से कम बचाते हैं।',
    },
    reduces: 'exposure',
    explanation: {
      en: 'Filters most fine particles before you breathe them in.',
      hi: 'सांस लेने से पहले अधिकांश सूक्ष्म कण छन जाते हैं।',
    },
    estimate: {
      en: '~80–95% less PM2.5 inhaled if well fitted',
      hi: 'ठीक से फिट होने पर ~80–95% कम PM2.5',
    },
    confidence: 'high',
  },
  timing: {
    title: {
      en: 'Go out in the cleaner afternoon hours',
      hi: 'साफ़ दोपहर के समय बाहर जाएँ',
    },
    details: {
      en: 'In winter, smog is usually worst early morning and late evening. Shift walks, errands and exercise to early afternoon.',
      hi: 'सर्दियों में स्मॉग आमतौर पर सुबह जल्दी और देर शाम सबसे ज़्यादा होता है। सैर, काम और व्यायाम दोपहर में करें।',
    },
    reduces: 'exposure',
    explanation: {
      en: 'Sunlight mixes pollution upward, so afternoon air is often cleaner.',
      hi: 'धूप से प्रदूषण ऊपर फैलता है, इसलिए दोपहर की हवा अक्सर साफ़ होती है।',
    },
    estimate: {
      en: 'Often ~20–40% lower PM2.5 than peak hours',
      hi: 'अक्सर व्यस्त घंटों से ~20–40% कम PM2.5',
    },
    confidence: 'medium',
  },
  ventilate: {
    title: {
      en: 'Ventilate briefly at the cleanest time',
      hi: 'सबसे साफ़ समय पर थोड़ी देर हवा आने दें',
    },
    details: {
      en: 'Keep windows closed during peak smog; open them for 10–15 minutes when outdoor AQI is lowest.',
      hi: 'स्मॉग के समय खिड़कियाँ बंद रखें; जब बाहर AQI सबसे कम हो तब 10–15 मिनट खोलें।',
    },
    reduces: 'exposure',
    explanation: {
      en: 'Limits smog entering while still clearing indoor CO2 and cooking fumes.',
      hi: 'स्मॉग अंदर आने से रुकता है और अंदर की CO2 व धुआँ बाहर जाता है।',
    },
    estimate: {
      en: 'Not quantifiable — depends on the home',
      hi: 'मापा नहीं जा सकता — घर पर निर्भर',
    },
    confidence: 'low',
  },
  diyFilter: {
    title: {
      en: 'Build a DIY box-fan filter',
      hi: 'घर पर बॉक्स-फ़ैन फ़िल्टर बनाएँ',
    },
    details: {
      en: 'Strap a MERV-13 or HEPA-type filter to a box fan and run it in the room you sleep in.',
      hi: 'MERV-13 या HEPA जैसा फ़िल्टर पंखे पर बाँधें और सोने वाले कमरे में चलाएँ।',
    },
    reduces: 'exposure',
    explanation: {
      en: 'Recirculates room air through a filter that traps fine particles.',
      hi: 'कमरे की हवा फ़िल्टर से गुज़रती है जो सूक्ष्म कण पकड़ता है।',
    },
    estimate: {
      en: '~40–60% lower indoor PM2.5 in a closed room',
      hi: 'बंद कमरे में ~40–60% कम PM2.5',
    },
    confidence: 'medium',
  },
  purifier: {
    title: {
      en: 'Run your purifier on high in the bedroom',
      hi: 'बेडरूम में प्यूरीफ़ायर तेज़ चलाएँ',
    },
    details: {
      en: 'Keep doors and windows closed and run it continuously, especially overnight.',
      hi: 'दरवाज़े-खिड़कियाँ बंद रखें और इसे लगातार, खासकर रात भर चलाएँ।',
    },
    reduces: 'exposure',
    explanation: {
      en: 'HEPA filtration removes most fine particles from the air you breathe while sleeping.',
      hi: 'HEPA फ़िल्टर सोते समय सांस की हवा से अधिकांश सूक्ष्म कण हटाता है।',
    },
    estimate: {
      en: '~50–80% lower bedroom PM2.5',
      hi: 'बेडरूम में ~50–80% कम PM2.5',
    },
    confidence: 'medium',
  },
  noSmoke: {
    title: {
      en: 'Avoid incense, mosquito coils and deep-frying',
      hi: 'अगरबत्ती, मच्छर कॉइल और तलने से बचें',
    },
    details: {
      en: 'These create heavy indoor smoke. Use lids, the exhaust fan and steaming or boiling instead of frying.',
      hi: 'इनसे घर में बहुत धुआँ बनता है। ढक्कन, एग्ज़ॉस्ट फ़ैन और तलने की जगह उबालना/भाप पकाना अपनाएँ।',
    },
    reduces: 'both',
    explanation: {
      en: 'Removes major indoor sources of particles and gases.',
      hi: 'घर के अंदर कणों और गैसों के बड़े स्रोत हटते हैं।',
    },
    estimate: {
      en: 'Not quantifiable — source dependent',
      hi: 'मापा नहीं जा सकता — स्रोत पर निर्भर',
    },
    confidence: 'medium',
  },
  transit: {
    title: {
      en: 'Use metro, bus or a carpool',
      hi: 'मेट्रो, बस या कारपूल का उपयोग करें',
    },
    details: {
      en: 'Swap solo car or two-wheeler trips for public transport or shared rides at least a few days a week.',
      hi: 'हफ़्ते में कुछ दिन अकेले कार/दोपहिया की जगह सार्वजनिक परिवहन या साझा सवारी लें।',
    },
    reduces: 'emissions',
    explanation: {
      en: 'Fewer vehicles on the road directly cuts exhaust, a major winter smog source.',
      hi: 'सड़क पर कम वाहन यानी सर्दियों के स्मॉग का बड़ा स्रोत — धुआँ — कम।',
    },
    estimate: {
      en: '~1–2 kg CO2 saved per 10 km by car avoided',
      hi: 'कार से बचाए हर 10 किमी पर ~1–2 किग्रा CO2 कम',
    },
    confidence: 'medium',
  },
  noBurning: {
    title: {
      en: 'Never burn waste or leaves',
      hi: 'कचरा या पत्ते कभी न जलाएँ',
    },
    details: {
      en: 'Compost leaves and report open burning in your area to the local authority.',
      hi: 'पत्तों से खाद बनाएँ और अपने इलाके में खुले में जलाने की सूचना स्थानीय प्रशासन को दें।',
    },
    reduces: 'emissions',
    explanation: {
      en: 'Open burning releases dense smoke at street level where people breathe it.',
      hi: 'खुले में जलाने से सड़क स्तर पर घना धुआँ फैलता है जिसे लोग सांस में लेते हैं।',
    },
    estimate: {
      en: 'Not quantifiable — but a top local source',
      hi: 'मापा नहीं जा सकता — पर बड़ा स्थानीय स्रोत',
    },
    confidence: 'high',
  },
  cleanCooking: {
    title: {
      en: 'Switch to LPG or induction cooking',
      hi: 'LPG या इंडक्शन पर खाना बनाएँ',
    },
    details: {
      en: 'Replace wood, dung or kerosene with LPG or an induction cooktop, starting with daily meals.',
      hi: 'लकड़ी, उपले या केरोसिन की जगह LPG या इंडक्शन अपनाएँ, रोज़ के खाने से शुरुआत करें।',
    },
    reduces: 'both',
    explanation: {
      en: 'Solid fuels are one of the largest sources of household smoke exposure.',
      hi: 'ठोस ईंधन घर में धुएँ के सबसे बड़े स्रोतों में से हैं।',
    },
    estimate: {
      en: 'Up to ~90% less kitchen smoke',
      hi: 'रसोई में ~90% तक कम धुआँ',
    },
    confidence: 'medium',
  },
});

/** Safety steps shown for very poor / severe air or vulnerable households. */
export const URGENT_PRECAUTIONS = Object.freeze({
  en: [
    'Stay indoors as much as possible and keep windows closed.',
    'Children, older adults and anyone with asthma or heart disease should avoid outdoor exertion.',
    'Seek medical help for breathlessness, chest pain or a persistent cough.',
  ],
  hi: [
    'जितना हो सके घर के अंदर रहें और खिड़कियाँ बंद रखें।',
    'बच्चे, बुज़ुर्ग और अस्थमा या हृदय रोग वाले लोग बाहर मेहनत वाले काम न करें।',
    'सांस फूलने, सीने में दर्द या लगातार खांसी हो तो डॉक्टर से मिलें।',
  ],
});

/** Plan summary explaining why basic guidance is shown. */
export const FALLBACK_SUMMARY = Object.freeze({
  en: 'AI-personalised advice is temporarily unavailable, so here is basic guidance for smoggy days. Try again shortly for a plan tailored to your household.',
  hi: 'AI आधारित व्यक्तिगत सलाह अभी उपलब्ध नहीं है, इसलिए स्मॉग वाले दिनों के लिए बुनियादी सलाह दी गई है। अपने परिवार के अनुसार योजना के लिए थोड़ी देर बाद फिर कोशिश करें।',
});

/** Chat answer used when the AI is unavailable. */
export const FALLBACK_CHAT = Object.freeze({
  en: {
    answer:
      'The AI assistant is temporarily unavailable. General rule: when AQI is "Poor" or worse, limit outdoor activity, choose the cleanest time window and wear an N95 mask.',
    safetyNote: 'Consult a doctor if anyone has symptoms.',
  },
  hi: {
    answer:
      'AI सहायक अभी उपलब्ध नहीं है। सामान्य नियम: AQI "खराब" या उससे बुरा हो तो बाहर की गतिविधियाँ कम करें, सबसे साफ़ समय चुनें और N95 मास्क पहनें।',
    safetyNote: 'लक्षण होने पर डॉक्टर से सलाह लें।',
  },
});
