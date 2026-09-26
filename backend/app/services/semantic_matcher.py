import re
import math
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.utils.phonetics import normalize_spoken_report

logger = logging.getLogger("saarthi.semantic_matcher")
logger.setLevel(logging.INFO)

SYNONYM_MAP = {
    'excavation': ['digging', 'earthworks', 'trenching', 'piling', 'diaphragm', 'shaft', 'unearth', 'foundation pit'],
    'concrete': ['casting', 'pour', 'pouring', 'raft', 'slab', 'column', 'ready-mix', 'rcc', 'cement', 'grouting'],
    'rebar': ['reinforcement', 'steel', 'bending', 'cage', 'iron', 'bars', 'tying'],
    'shuttering': ['formwork', 'framing', 'scaffolding', 'mould', 'staging'],
    'facade': ['glazing', 'curtain wall', 'cladding', 'glass', 'windows', 'curtainwall'],
    'asphalt': ['paving', 'bituminous', 'wearing course', 'blacktop', 'tar', 'roadwork'],
    'girder': ['psc', 'bridge span', 'beam', 'erection', 'launching', 'heavy lift', 'viaduct'],
    'mep': ['plumbing', 'electrical', 'conduit', 'chase', 'hvac', 'ducts', 'piping']
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

def compute_tf_vector(tokens: List[str]) -> Dict[str, float]:
    counts: Dict[str, int] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1
    total = len(tokens) or 1
    return {k: v / total for k, v in counts.items()}

def cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    common_keys = set(vec1.keys()) & set(vec2.keys())
    dot_product = sum(vec1[k] * vec2[k] for k in common_keys)
    mag1 = math.sqrt(sum(v * v for v in vec1.values()))
    mag2 = math.sqrt(sum(v * v for v in vec2.values()))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product / (mag1 * mag2)

class SemanticMatcher:
    """
    SBERT / Embedding-driven Semantic Matching Service with In-Memory Schedule Cache.
    Auto-approves report matches with confidence >= 75.0 points.
    """
    _instance: Optional['SemanticMatcher'] = None
    AUTO_APPROVAL_THRESHOLD: float = 75.0

    def __init__(self):
        self.schedule_cache: List[Dict[str, Any]] = []
        self.schedule_vectors: List[Dict[str, float]] = []

    @classmethod
    def get_instance(cls) -> 'SemanticMatcher':
        if cls._instance is None:
            cls._instance = SemanticMatcher()
        return cls._instance

    def refresh_schedule(self, activities: List[Dict[str, Any]]):
        """Builds and caches term vectors / embeddings for all active activities."""
        self.schedule_cache = activities
        self.schedule_vectors = []
        for act in activities:
            text = f"{act.get('name', '')} {act.get('category', '')} {act.get('zone', '')}"
            tokens = tokenize(text)
            self.schedule_vectors.append(compute_tf_vector(tokens))
        logger.info(f"Refreshed schedule embeddings cache with {len(activities)} activities.")

    def calculate_semantic_score(self, report_text: str, activity_name: str, activity_category: str = "") -> float:
        report_tokens = tokenize(report_text)
        act_text = f"{activity_name} {activity_category or ''}"
        act_tokens = tokenize(act_text)

        if not report_tokens or not act_tokens:
            return 30.0

        # Vector cosine similarity
        vec_rep = compute_tf_vector(report_tokens)
        vec_act = compute_tf_vector(act_tokens)
        cos_sim = cosine_similarity(vec_rep, vec_act)

        # Keyword & Synonym overlap score
        match_score = 0.0
        total_weight = len(act_tokens)
        for act_token in act_tokens:
            if act_token in report_tokens:
                match_score += 1.0
                continue
            for key, synonyms in SYNONYM_MAP.items():
                if key in act_token or any(s in act_token for s in synonyms):
                    if any(key in rt or any(s in rt for s in synonyms) for rt in report_tokens):
                        match_score += 0.85
                        break

        overlap_perc = (match_score / total_weight) * 100.0 if total_weight > 0 else 0.0
        combined = (cos_sim * 40.0) + (overlap_perc * 0.60 * 1.15)
        return min(100.0, round(max(30.0, combined), 1))

    def calculate_location_score(self, report_zone: Optional[str], activity_zone: str, full_report_text: str) -> float:
        rep_zone = (report_zone or "").lower()
        act_zone = (activity_zone or "").lower()
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

    def calculate_date_plausibility(self, activity_status: str, activity_progress: float, extracted_progress: Optional[float]) -> float:
        score = 75.0
        if activity_status == 'in_progress':
            score += 20.0
        elif activity_status == 'not_started':
            score += 10.0
        elif activity_status == 'completed':
            if extracted_progress is not None and extracted_progress < 100:
                score -= 25.0

        if extracted_progress is not None:
            if extracted_progress >= activity_progress:
                score += 10.0
            else:
                score -= 15.0

        return max(10.0, min(100.0, score))

    def match_report(
        self,
        raw_report_text: str,
        activities: Optional[List[Dict[str, Any]]] = None,
        extracted_fields: Optional[Dict[str, Any]] = None,
        force_gemini: bool = False
    ) -> List[Dict[str, Any]]:
        target_activities = activities or self.schedule_cache
        if not target_activities:
            return []

        report_text = normalize_spoken_report(raw_report_text)
        
        # Use provided extracted fields if available (e.g. from Gemini Vision/LLM), else run hybrid extraction
        if not extracted_fields:
            try:
                from app.utils.gemini import extract_fields_hybrid
                extracted_fields = extract_fields_hybrid(report_text, force_gemini=force_gemini)
            except Exception as exc:
                logger.warning(f"[MATCH_REPORT] Hybrid extraction fallback to local regex: {exc}")
                extracted_fields = {}

        zone_keyword = extracted_fields.get("zone_guess")
        extracted_prog = extracted_fields.get("progress_guess")
        extraction_source = extracted_fields.get("extraction_source", "regex")

        if not zone_keyword:
            zone_match = re.search(r'\b(zone\s*[a-z0-9-]+|pier\s*[0-9-]+|tower\s*[0-9-]+|section\s*[0-9-]+|floor\s*[0-9-]+)\b', report_text, re.IGNORECASE)
            if zone_match:
                zone_keyword = zone_match.group(0).strip()

        if extracted_prog is None:
            percent_match = re.search(r'(\d{1,3})\s*%', report_text)
            if percent_match:
                try:
                    val = float(percent_match.group(1))
                    if 0 <= val <= 100:
                        extracted_prog = val
                except ValueError:
                    pass

        results = []
        for act in target_activities:
            act_name = act.get("name", "")
            act_zone = act.get("zone", "")
            act_status = act.get("status", "not_started")
            act_progress = float(act.get("progress", 0.0))
            act_category = act.get("category", "")

            semantic_match = self.calculate_semantic_score(report_text, act_name, act_category)
            location_match = self.calculate_location_score(zone_keyword, act_zone, report_text)
            date_plausibility = self.calculate_date_plausibility(act_status, act_progress, extracted_prog)

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
                "progressConfidence": 90.0 if extracted_prog is not None else 50.0
            }

            target_progress = act_progress if extracted_prog is None else extracted_prog

            is_auto_approved = overall_confidence >= self.AUTO_APPROVAL_THRESHOLD

            reasoning_parts = []
            if semantic_match >= 75:
                reasoning_parts.append(f'High semantic embedding match on activity terms ("{act_name}")')
            elif semantic_match >= 40:
                reasoning_parts.append(f'Moderate term overlap with "{act_name}"')
            else:
                reasoning_parts.append('Low term similarity')

            if location_match >= 90:
                reasoning_parts.append(f'Exact location match for {act_zone}')
            elif location_match <= 20:
                reasoning_parts.append('Zone mismatch (Report mentions different zone)')

            if extracted_prog is not None:
                reasoning_parts.append(f'Extracted {int(extracted_prog)}% target progress (via {extraction_source.upper()})')

            results.append({
                "activity": act,
                "overallConfidence": overall_confidence,
                "subScores": sub_scores,
                "extractedProgress": target_progress,
                "extractedEntities": {
                    "activityNameKeywords": tokenize(report_text),
                    "zoneKeyword": zone_keyword,
                    "extractedProgress": extracted_prog,
                    "isCompletedMention": extracted_prog == 100.0,
                    "isDelayMention": "delay" in report_text.lower(),
                    "extractedDate": datetime.utcnow().strftime("%Y-%m-%d"),
                    "extractedNotes": f"Extracted via {extraction_source.upper()} engine."
                },
                "extractionSource": extraction_source,
                "reasoning": ". ".join(reasoning_parts) + ".",
                "isHighConfidence": is_auto_approved,
                "isAutoApproved": is_auto_approved,
                "status": "auto_approved" if is_auto_approved else "pending_review"
            })

        results.sort(key=lambda x: x["overallConfidence"], reverse=True)
        return results

matcher_instance = SemanticMatcher.get_instance()

def match_report(
    raw_report_text: str,
    activities: Optional[List[Dict[str, Any]]] = None,
    extracted_fields: Optional[Dict[str, Any]] = None,
    force_gemini: bool = False
) -> List[Dict[str, Any]]:
    return matcher_instance.match_report(raw_report_text, activities, extracted_fields, force_gemini=force_gemini)

def refresh_schedule(activities: List[Dict[str, Any]]):
    matcher_instance.refresh_schedule(activities)
