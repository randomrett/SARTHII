import re

SPOKEN_NUMBERS = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7,
    'eight': 8, 'nine': 9, 'ten': 10, 'fifteen': 15, 'twenty': 20, 'twenty five': 25,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'seventy five': 75,
    'eighty': 80, 'eighty five': 85, 'ninety': 90, 'hundred': 100
}

PHONETIC_CORRECTIONS = [
    # Zones & Locations
    (r'\b(jon|joen|joan|john|zohn|zonn)\s*([a-z0-9]+)\b', r'Zone \2'),
    (r'\b(peer|pear|pete)\s*([0-9]+)\b', r'Pier \2'),
    (r'\b(tower|towar)\s*([0-9]+)\b', r'Tower \2'),
    (r'\b(floor|flor)\s*([0-9]+)\b', r'Floor \2'),

    # Construction Terminology & Jargon Misinterpretations
    (r'\b(rough|wrap|draft|raft|ref)\s+(foundation|concreting)\b', r'Raft Foundation'),
    (r'\b(shadowing|shutter|shuttering|shuttery|formwork|framing)\b', r'Shuttering'),
    (r'\b(read bar|red bar|river|rebar|re bar)\b', r'Rebar'),
    (r'\b(diagram|diaphram|diaphragm|diaphram)\s+wall\b', r'Diaphragm Wall'),
    (r'\b(piles|piling|pilling|digging|excavating|excavation)\b', r'Excavation & Piling'),
    (r'\b(concrete pour|concreteing|concreting|casting|pouring)\b', r'Concrete Pour'),
    (r'\b(girders|girder|span|beam|heavy lift)\b', r'Girder Launching'),
    (r'\b(asphalt|bituminous|wearing course|tarr|tar|paving)\b', r'Asphalt Paving'),

    # Common Status & Delay Phrases
    (r'\b(finished|completed|done|wrapped up|finalized|100 percent|hundred percent)\b', r'finished today (100%)'),
    (r'\b(delayed|delay|material shortage|rain|rainfall|breakdown)\b', r'delayed due to site issue'),
    (r'\b(halfway|half done|50 percent|fifty percent)\b', r'50% completion'),
    (r'\b(three quarters|75 percent|seventy five percent)\b', r'75% completion')
]

def normalize_spoken_report(spoken_text: str) -> str:

    if not spoken_text:
        return ""

    normalized = spoken_text

    # 1. Apply Phonetic Jargon Auto-Corrections
    for pattern, replacement in PHONETIC_CORRECTIONS:
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

    # 2. Convert spoken number words to digits
    for word, num in SPOKEN_NUMBERS.items():
        pattern = r'\b' + re.escape(word) + r'\s*(percent|%)?'
        normalized = re.sub(pattern, f"{num}%", normalized, flags=re.IGNORECASE)

    # 3. Clean duplicate percentages & extra spaces
    normalized = re.sub(r'(\d+)\s*%\s*%', r'\1%', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    if normalized:
        normalized = normalized[0].upper() + normalized[1:]

    return normalized
