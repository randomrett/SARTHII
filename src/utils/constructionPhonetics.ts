/**
 * Construction Domain Phonetic Normalizer & Speech Auto-Corrector
 * Corrects misheard speech recognition tokens into accurate construction terminology.
 */

const SPOKEN_NUMBERS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7,
  'eight': 8, 'nine': 9, 'ten': 10, 'fifteen': 15, 'twenty': 20, 'twenty five': 25,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'seventy five': 75,
  'eighty': 80, 'eighty five': 85, 'ninety': 90, 'hundred': 100
};

const PHONETIC_CORRECTIONS: Array<[RegExp, string]> = [
  // Zones & Locations
  [/\b(jon|joen|joan|john|zohn|zonn)\s*([a-z0-9]+)\b/gi, 'Zone $2'],
  [/\b(peer|pear|pete)\s*([0-9]+)\b/gi, 'Pier $2'],
  [/\b(tower|towar)\s*([0-9]+)\b/gi, 'Tower $2'],
  [/\b(floor|flor)\s*([0-9]+)\b/gi, 'Floor $2'],

  // Construction Terminology & Jargon Misinterpretations
  [/\b(rough|wrap|draft|raft|ref)\s+(foundation|concreting)\b/gi, 'Raft Foundation'],
  [/\b(shadowing|shutter|shuttering|shuttery|formwork|framing)\b/gi, 'Shuttering'],
  [/\b(read bar|red bar|river|rebar|re bar)\b/gi, 'Rebar'],
  [/\b(diagram|diaphram|diaphragm|diaphram)\s+wall\b/gi, 'Diaphragm Wall'],
  [/\b(piles|piling|pilling|digging|excavating|excavation)\b/gi, 'Excavation & Piling'],
  [/\b(concrete pour|concreteing|concreting|casting|pouring)\b/gi, 'Concrete Pour'],
  [/\b(girders|girder|span|beam|heavy lift)\b/gi, 'Girder Launching'],
  [/\b(asphalt|bituminous|wearing course|tarr|tar|paving)\b/gi, 'Asphalt Paving'],

  // Common Status & Delay Phrases
  [/\b(finished|completed|done|wrapped up|finalized|100 percent|hundred percent)\b/gi, 'finished today (100%)'],
  [/\b(delayed|delay|material shortage|rain|rainfall|breakdown)\b/gi, 'delayed due to site issue'],
  [/\b(halfway|half done|50 percent|fifty percent)\b/gi, '50% completion'],
  [/\b(three quarters|75 percent|seventy five percent)\b/gi, '75% completion']
];

/**
 * Normalizes raw spoken speech input from browser SpeechRecognition
 */
export function normalizeSpokenReport(spokenText: string): string {
  if (!spokenText) return '';

  let normalized = spokenText;

  // 1. Apply Phonetic Jargon Auto-Corrections
  for (const [pattern, replacement] of PHONETIC_CORRECTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // 2. Convert spoken number words (e.g. "eighty five percent") to digits ("85%")
  for (const [word, num] of Object.entries(SPOKEN_NUMBERS)) {
    const regex = new RegExp(`\\b${word}\\s*(percent|%)?`, 'gi');
    normalized = normalized.replace(regex, `${num}%`);
  }

  // 3. Clean duplicate percentages & extra spaces
  normalized = normalized
    .replace(/(\d+)\s*%\s*%/g, '$1%')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return normalized;
}
