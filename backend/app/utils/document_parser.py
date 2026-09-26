import io
import logging
from typing import Optional

logger = logging.getLogger("saarthi.docparser")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file using pdfplumber with pypdf fallback."""
    extracted_text = ""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [page.extract_text() for page in pdf.pages if page.extract_text()]
            extracted_text = "\n".join(pages)
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}. Trying pypdf fallback.")
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages = [page.extract_text() for page in reader.pages if page.extract_text()]
            extracted_text = "\n".join(pages)
        except Exception as pdf_err:
            logger.error(f"pypdf extraction failed: {pdf_err}")
            raise ValueError(f"Could not extract text from PDF file: {pdf_err}")
    
    return extracted_text.strip()

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from Microsoft Word (.docx) file."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = [p.text for p in doc.paragraphs if p.text]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    full_text.append(row_text)
        return "\n".join(full_text).strip()
    except Exception as e:
        logger.error(f"Docx extraction failed: {e}")
        raise ValueError(f"Could not extract text from DOCX file: {e}")

def extract_text_from_plain(file_bytes: bytes) -> str:
    """Extract text from plain text or CSV file."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="ignore")

def parse_document_file(file_bytes: bytes, filename: str) -> str:
    """
    Task 1 & Task 2: Standard OCR / Document text processing.
    Routes uploaded document file by extension and returns extracted raw text.
    """
    fname_lower = filename.lower()
    
    if fname_lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif fname_lower.endswith(".docx") or fname_lower.endswith(".doc"):
        return extract_text_from_docx(file_bytes)
    elif fname_lower.endswith(".txt") or fname_lower.endswith(".csv") or fname_lower.endswith(".json") or fname_lower.endswith(".log"):
        return extract_text_from_plain(file_bytes)
    else:
        # Fallback text attempt
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            raise ValueError(f"Unsupported file format for document ingestion: {filename}")
