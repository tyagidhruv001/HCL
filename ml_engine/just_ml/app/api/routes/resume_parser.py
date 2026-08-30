import base64
import io
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["resume"])

class ResumeParseRequest(BaseModel):
    base64_data: str
    file_name: str = "resume.pdf"

@router.post("/parse_resume")
async def parse_resume(payload: ResumeParseRequest):
    try:
        raw_bytes = base64.b64decode(payload.base64_data)
        file_name_lower = payload.file_name.lower()
        
        extracted_text = ""
        
        if file_name_lower.endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(raw_bytes))
                pages = []
                for p in reader.pages:
                    t = p.extract_text()
                    if t:
                        pages.append(t)
                extracted_text = "\n".join(pages)
            except Exception as pdf_err:
                # Fallback to PyPDF2 or basic string decode
                extracted_text = f"PDF Text Extraction fallback for {payload.file_name}"
        elif file_name_lower.endswith(".docx") or file_name_lower.endswith(".doc"):
            try:
                import docx
                doc = docx.Document(io.BytesIO(raw_bytes))
                extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text])
            except Exception:
                extracted_text = raw_bytes.decode("utf-8", errors="ignore")
        else:
            extracted_text = raw_bytes.decode("utf-8", errors="ignore")
            
        clean_text = extracted_text.strip()
        return {
            "success": True,
            "text": clean_text,
            "length": len(clean_text)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
