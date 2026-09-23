import re
from datetime import datetime
from typing import List, Dict, Any
from app.utils.phonetics import normalize_spoken_report

SYNONYM_MAP = {
    'excavation': ['digging', 'earthworks', 'trenching', 'piling', 'diaphragm', 'shaft', 'unearth'],
    'concrete': ['casting', 'pour', 'pouring', 'raft', 'slab', 'column', 'ready-mix', 'rcc', 'cement'],
    'rebar': ['reinforcement', 'steel', 'bending', 'cage', 'iron', 'bars'],
    'shuttering': ['formwork', 'framing', 'scaffolding', 'mould'],
    'facade': ['glazing', 'curtain wall', 'cladding', 'glass', 'windows'],
    'asphalt': ['paving', 'bituminous', 'wearing course', 'blacktop', 'tar'],
    'girder': ['psc', 'bridge span', 'beam', 'erection', 'launching', 'heavy lift'],
    'mep': ['plumbing', 'electrical', 'conduit', 'chase', 'hvac', 'ducts']
}

STOP_WORDS = {
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'is', 'are', 'was', 'were', 'been', 'be', 'has', 'have', 'had', 'done', 'today',
    'yesterday', 'this', 'that', 'work', 'site', 'report', 'we', 'our', 'and', 'or'
}

def tokenize(text: str) -> List[str]:
    cleaned = re.sub(r'[^a-z0-9\s%-]', ' ', text.lower())
    tokens = cleaned.split()
    return [t for t in tokens if len(t) > 1 and t not in STOP_WORDS]

def levenshtein_similarity(s1: str, s2: str) -> float:
    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    len1, len2 = len(s1), len(s2)
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]

    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            matrix[i][j] = min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            )

    distance = matrix[len1][len2]
    max_len = max(len1, len2)
    return 1.0 - (distance / max_len)

def extract_entities_from_report(raw_report_text: str) -> Dict[str, Any]:
    report_text = normalize_spoken_report(raw_report_text)
    lower = report_text.lower()

    # 1. Progress Percentage Extraction
    extracted_progress = None
    percent_match = re.search(r'(\d{1,3})\s*%', report_text)
    if percent_match:
        try:
            val = int(percent_match.group(1))
            if 0 <= val <= 100:
                extracted_progress = float(val)
        except ValueError:
            pass

    is_completed_mention = bool(re.search(r'\b(finished|completed|done|wrapped up|finalized|100%|complete)\b', lower))
    if extracted_progress is None:
        if is_completed_mention:
            extracted_progress = 100.0
        elif re.search(r'\b(halfway|half done|50%|50 percent)\b', lower):
            extracted_progress = 50.0
        elif re.search(r'\b(started|commenced|begun|just started|10%)\b', lower):
            extracted_progress = 20.0
        elif re.search(r'\b(three quarters|75%|almost done|nearly finished)\b', lower):
            extracted_progress = 75.0

    # 2. Zone/Location Extraction
    zone_keyword = None
    zone_regexes = [
        r'\bzone\s*([a-z0-9-]+)\b',
        r'\bpier\s*([0-9-]+)\b',
        r'\btower\s*([0-9-]+)\b',
        r'\bfloor\s*([0-9-]+)\b',
        r'\blevel\s*([0-9-]+)\b',
        r'\bspan\s*([0-9-]+)\b',
        r'\bshaft\b',
        r'\bsection\s*([0-9-]+)\b'
    ]

    for regex in zone_regexes:
        match = re.search(regex, report_text, re.IGNORECASE)
        if match:
            zone_keyword = match.group(0).strip()
            break

    # 3. Delay Extraction
    is_delay_mention = bool(re.search(r'\b(delayed|delay|shortage|rain|breakdown|stuck|behind|issue|stoppage)\b', lower))
    tokens = tokenize(report_text)

    return {
        "activityNameKeywords": tokens,
        "zoneKeyword": zone_keyword,
        "extractedProgress": extracted_progress,
        "isCompletedMention": is_completed_mention,
        "isDelayMention": is_delay_mention,
        "extractedDate": datetime.utcnow().strftime("%Y-%m-%d"),
        "extractedNotes": "Potential delay or bottleneck noted in report." if is_delay_mention else "Normal progress update."
    }

def calculate_semantic_score(report_text: str, activity_name: str, activity_category: str = "") -> float:
    report_tokens = tokenize(report_text)
    activity_tokens = tokenize(f"{activity_name} {activity_category or ''}")

    if not report_tokens or not activity_tokens:
        return 30.0

    match_score = 0.0
    total_weight = len(activity_tokens)

    for act_token in activity_tokens:
        token_matched = False

        if act_token in report_tokens:
            match_score += 1.0
            token_matched = True
            continue

        for key, synonyms in SYNONYM_MAP.items():
            if key in act_token or any(s in act_token for s in synonyms):
                if any(key in rt or any(s in rt for s in synonyms) for rt in report_tokens):
                    match_score += 0.85
                    token_matched = True
                    break

        if not token_matched:
            for rep_token in report_tokens:
                sim = levenshtein_similarity(act_token, rep_token)
                if sim > 0.75:
                    match_score += sim * 0.8
                    break

    raw_percentage = (match_score / total_weight) * 100.0
    return min(100.0, round(raw_percentage * 1.15, 1))

def calculate_location_score(extracted_entities: Dict[str, Any], activity_zone: str, full_report_text: str) -> float:
    rep_zone = (extracted_entities.get("zoneKeyword") or "").lower()
    act_zone = activity_zone.lower()
    report_lower = full_report_text.lower()

    if rep_zone and (act_zone == rep_zone or rep_zone in act_zone or act_zone in rep_zone):
        return 100.0

    if act_zone and act_zone in report_lower:
        return 95.0

    act_zone_tokens = tokenize(act_zone)
    if rep_zone and any(tok in rep_zone for tok in act_zone_tokens if len(tok) > 1):
        return 80.0

    if rep_zone and act_zone:
        rep_num = re.sub(r'[^a-z0-9]', '', rep_zone)
        act_num = re.sub(r'[^a-z0-9]', '', act_zone)
        if rep_num and act_num and rep_num != act_num:
            return 15.0

    return 60.0

def calculate_date_plausibility(activity_status: str, activity_progress: float, extracted_entities: Dict[str, Any]) -> float:
    score = 75.0

    if activity_status == 'in_progress':
        score += 20.0
    elif activity_status == 'not_started':
        score += 10.0
    elif activity_status == 'completed':
        ext_prog = extracted_entities.get("extractedProgress")
        if ext_prog is not None and ext_prog < 100:
            score -= 25.0

    ext_prog = extracted_entities.get("extractedProgress")
    if ext_prog is not None:
        if ext_prog >= activity_progress:
            score += 10.0
        else:
            score -= 15.0

    return max(10.0, min(100.0, score))

def match_report_to_schedule(raw_report_text: str, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not activities:
        return []

    report_text = normalize_spoken_report(raw_report_text)
    entities = extract_entities_from_report(report_text)

    results = []
    for act in activities:
        act_name = act.get("name", "")
        act_zone = act.get("zone", "")
        act_status = act.get("status", "not_started")
        act_progress = float(act.get("progress", 0.0))
        act_category = act.get("category", "")

        semantic_match = calculate_semantic_score(report_text, act_name, act_category)
        location_match = calculate_location_score(entities, act_zone, report_text)
        date_plausibility = calculate_date_plausibility(act_status, act_progress, entities)

        overall_confidence = round(
            (semantic_match * 0.50) +
            (location_match * 0.35) +
            (date_plausibility * 0.15),
            1
        )

        if location_match <= 20.0:
            overall_confidence = min(overall_confidence, 45.0)

        sub_scores = {
            "semanticMatch": semantic_match,
            "locationMatch": location_match,
            "datePlausibility": date_plausibility,
            "progressConfidence": 90.0 if entities.get("extractedProgress") is not None else 50.0
        }

        target_progress = act_progress
        if entities.get("extractedProgress") is not None:
            target_progress = entities["extractedProgress"]
        elif entities.get("isCompletedMention"):
            target_progress = 100.0

        reasoning_parts = []
        if semantic_match > 75:
            reasoning_parts.append(f'High semantic match on activity terms ("{act_name}")')
        elif semantic_match > 40:
            reasoning_parts.append(f'Moderate keyword overlap with "{act_name}"')
        else:
            reasoning_parts.append('Low keyword similarity')

        if location_match >= 90:
            reasoning_parts.append(f'Exact location match for {act_zone}')
        elif location_match <= 20:
            reasoning_parts.append('Zone mismatch (Report mentions different zone)')

        if entities.get("extractedProgress") is not None:
            reasoning_parts.append(f'Extracted {int(entities["extractedProgress"])}% target progress')

        is_high_confidence = overall_confidence >= 78.0

        results.append({
            "activity": act,
            "overallConfidence": overall_confidence,
            "subScores": sub_scores,
            "extractedProgress": target_progress,
            "extractedEntities": entities,
            "reasoning": ". ".join(reasoning_parts) + ".",
            "isHighConfidence": is_high_confidence
        })

    results.sort(key=lambda x: x["overallConfidence"], reverse=True)
    return results
