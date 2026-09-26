import io
import re
import pandas as pd
from typing import Dict, Any, List, Tuple

def parse_report_spreadsheet(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Task 1: Parses ad-hoc Excel or CSV report file.
    Validates required fields (activity_name, progress_percent between 0 and 100).
    Returns (accepted_rows, rejected_rows).
    """
    fname_lower = filename.lower()
    if fname_lower.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    # Normalize column names: lowercase, strip whitespace, replace spaces with underscores
    df.columns = [re.sub(r'[\s%]+', '_', str(c).strip().lower()).strip('_') for c in df.columns]

    # Map possible column name variations
    col_map = {}
    for col in df.columns:
        if 'act' in col or 'name' in col or 'item' in col:
            col_map[col] = 'activity_name'
        elif 'prog' in col or 'percent' in col or 'pct' in col:
            col_map[col] = 'progress_percent'
        elif 'zone' in col or 'loc' in col:
            col_map[col] = 'zone'
        elif 'date' in col or 'time' in col:
            col_map[col] = 'date'
        elif 'note' in col or 'desc' in col or 'remark' in col:
            col_map[col] = 'notes'

    df.rename(columns=col_map, inplace=True)

    accepted = []
    rejected = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2 # 1-indexed row number excluding header
        
        act_name = str(row.get('activity_name', '')).strip() if pd.notna(row.get('activity_name')) else ''
        if not act_name or act_name.lower() in ('nan', 'none', 'null'):
            rejected.append({"row": row_num, "reason": "Missing or empty 'activity_name'"})
            continue

        raw_prog = row.get('progress_percent')
        try:
            if pd.isna(raw_prog):
                rejected.append({"row": row_num, "reason": "Missing 'progress_percent'"})
                continue
            prog_val = float(raw_prog)
            if prog_val < 0.0 or prog_val > 100.0:
                rejected.append({"row": row_num, "reason": f"progress_percent '{prog_val}' is out of range 0-100"})
                continue
        except (ValueError, TypeError):
            rejected.append({"row": row_num, "reason": f"Invalid numeric progress_percent '{raw_prog}'"})
            continue

        zone = str(row.get('zone', '')).strip() if pd.notna(row.get('zone')) else ''
        if zone.lower() in ('nan', 'none', 'null'):
            zone = ''

        date_val = str(row.get('date', '')).strip() if pd.notna(row.get('date')) else ''
        if date_val.lower() in ('nan', 'none', 'null'):
            date_val = ''

        notes = str(row.get('notes', '')).strip() if pd.notna(row.get('notes')) else ''
        if notes.lower() in ('nan', 'none', 'null'):
            notes = ''

        # Construct unified raw text for semantic matching engine
        text_parts = [f"{act_name}"]
        if zone:
            text_parts.append(f"in {zone}")
        text_parts.append(f"is {int(prog_val)}% completed.")
        if notes:
            text_parts.append(notes)

        raw_text = " ".join(text_parts)

        accepted.append({
            "row": row_num,
            "activity_name": act_name,
            "zone": zone,
            "progress_percent": prog_val,
            "date": date_val,
            "notes": notes,
            "raw_text": raw_text
        })

    return accepted, rejected


def parse_schedule_spreadsheet(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Task 2: Parses baseline schedule file (.xlsx or .csv).
    Explicitly rejects binary .mpp and .xer files.
    Returns (accepted_activities, rejected_rows).
    """
    fname_lower = filename.lower()
    
    if fname_lower.endswith(".mpp") or fname_lower.endswith(".xer"):
        raise ValueError(
            "Native MS Project (.mpp) and Primavera P6 (.xer) files are not supported directly. "
            "Please export your schedule to Excel (.xlsx) or CSV format from P6 / MS Project first."
        )

    if fname_lower.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df.columns = [re.sub(r'[\s%]+', '_', str(c).strip().lower()).strip('_') for c in df.columns]

    accepted = []
    rejected = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2

        act_name = str(row.get('activity_name', row.get('name', row.get('activity', '')))).strip()
        if not act_name or act_name.lower() in ('nan', 'none', 'null'):
            rejected.append({"row": row_num, "reason": "Missing or empty 'activity_name'"})
            continue

        zone = str(row.get('zone', row.get('location', 'Zone A'))).strip()
        if not zone or zone.lower() in ('nan', 'none', 'null'):
            zone = 'Zone A'

        category = str(row.get('category', row.get('type', 'General'))).strip()
        if category.lower() in ('nan', 'none', 'null'):
            category = 'General'

        planned_start = str(row.get('planned_start', row.get('start_date', '2026-01-01'))).strip()
        planned_end = str(row.get('planned_end', row.get('finish_date', row.get('end_date', '2026-12-31')))).strip()

        status_val = str(row.get('status', 'not_started')).strip().lower().replace(' ', '_')
        if status_val not in ('not_started', 'in_progress', 'delayed', 'completed'):
            status_val = 'not_started'

        unit = str(row.get('unit', '')).strip()
        if unit.lower() in ('nan', 'none', 'null'):
            unit = None

        target_qty = None
        if pd.notna(row.get('quantity', row.get('target_quantity'))):
            try:
                target_qty = float(row.get('quantity', row.get('target_quantity')))
            except (ValueError, TypeError):
                pass

        accepted.append({
            "name": act_name,
            "category": category,
            "zone": zone,
            "planned_start": planned_start[:10],
            "planned_end": planned_end[:10],
            "status": status_val,
            "unit": unit,
            "target_quantity": target_qty,
            "progress": 0.0 if status_val == 'not_started' else (100.0 if status_val == 'completed' else 10.0)
        })

    return accepted, rejected
