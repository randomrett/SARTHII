import os
import sys
import unittest

# Ensure app package is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.semantic_matcher import SemanticMatcher, match_report, refresh_schedule
from app.utils.gemini import extract_fields_hybrid

SAMPLE_ACTIVITIES = [
    {
        "id": "ACT-101",
        "name": "Raft Foundation Reinforcement & Pour",
        "zone": "Zone A",
        "category": "Concrete",
        "status": "in_progress",
        "progress": 30.0
    },
    {
        "id": "ACT-102",
        "name": "Mass Excavation & Earthworks",
        "zone": "Zone A",
        "category": "Excavation",
        "status": "completed",
        "progress": 100.0
    },
    {
        "id": "ACT-103",
        "name": "Pier 4 Concrete Column Casting",
        "zone": "Pier 4",
        "category": "Concrete",
        "status": "in_progress",
        "progress": 10.0
    },
    {
        "id": "ACT-104",
        "name": "Bituminous Asphalt Paving",
        "zone": "Section 1",
        "category": "Roadwork",
        "status": "not_started",
        "progress": 0.0
    }
]

class TestTaskPipeline(unittest.TestCase):
    def setUp(self):
        refresh_schedule(SAMPLE_ACTIVITIES)

    def test_task1_semantic_matching_and_threshold(self):
        """Test Task 1: Semantic matching against sample report transcripts."""
        # 1. Exact match with clear zone and percentage
        report1 = "poured the raft slab in zone A today, about 85% done"
        results1 = match_report(report1, SAMPLE_ACTIVITIES)
        self.assertTrue(len(results1) > 0)
        top1 = results1[0]
        self.assertEqual(top1["activity"]["id"], "ACT-101")
        print(f"\n[TEST 1] Report: '{report1}'")
        print(f"       -> Matched: '{top1['activity']['name']}' (Score: {top1['overallConfidence']}%, Auto-Approved: {top1['isAutoApproved']})")
        self.assertGreaterEqual(top1["overallConfidence"], 75.0, "Confident correct match should meet/exceed 75 auto-approval threshold")

        # 2. Synonym match ("casting column in Pier 4 reached 40%")
        report2 = "casting column in Pier 4 reached 40%"
        results2 = match_report(report2, SAMPLE_ACTIVITIES)
        top2 = results2[0]
        self.assertEqual(top2["activity"]["id"], "ACT-103")
        print(f"[TEST 2] Report: '{report2}'")
        print(f"       -> Matched: '{top2['activity']['name']}' (Score: {top2['overallConfidence']}%, Auto-Approved: {top2['isAutoApproved']})")

        # 3. Off-target report should NOT reach 78 auto-approval threshold
        report3 = "landscaping and garden fence installed in Section 5"
        results3 = match_report(report3, SAMPLE_ACTIVITIES)
        top3 = results3[0]
        print(f"[TEST 3] Unrelated Report: '{report3}'")
        print(f"       -> Best match: '{top3['activity']['name']}' (Score: {top3['overallConfidence']}%, Auto-Approved: {top3['isAutoApproved']})")
        self.assertLess(top3["overallConfidence"], 78.0, "Irrelevant report should not be auto-approved")

    def test_task2_hybrid_extraction(self):
        """Test Task 2: Hybrid regex vs Gemini entity extraction."""
        # Clear report text: regex catches both zone and progress %
        clear_text = "Excavation completed in Zone A reaching 100%"
        hybrid_res = extract_fields_hybrid(clear_text)
        self.assertEqual(hybrid_res["extraction_source"], "regex", "Clear text should be extracted deterministically via regex")
        self.assertEqual(hybrid_res["zone_guess"], "Zone A")
        self.assertEqual(hybrid_res["progress_guess"], 100.0)
        print(f"\n[TEST TASK 2 HYBRID] Clear Text -> Source: {hybrid_res['extraction_source']}, Zone: {hybrid_res['zone_guess']}, Progress: {hybrid_res['progress_guess']}%")

if __name__ == '__main__':
    unittest.main()
