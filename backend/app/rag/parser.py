import csv
import io
import os
from typing import Optional
from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from pypdf import PdfReader

class DocumentParser:
    """Extract clean plain text from PDF, DOCX, TXT, CSV, MD, and HTML files."""

    @staticmethod
    def extract_text(file_path: str, file_type: str) -> str:
        file_type = file_type.lower().lstrip(".")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if file_type == "pdf":
            return DocumentParser._parse_pdf(file_path)
        elif file_type == "docx":
            return DocumentParser._parse_docx(file_path)
        elif file_type in ("txt", "md", "markdown"):
            return DocumentParser._parse_txt(file_path)
        elif file_type == "csv":
            return DocumentParser._parse_csv(file_path)
        elif file_type in ("html", "htm", "url"):
            return DocumentParser._parse_html_file(file_path)
        else:
            # Fallback to UTF-8 plain text read
            return DocumentParser._parse_txt(file_path)

    @staticmethod
    def _parse_pdf(file_path: str) -> str:
        text_parts = []
        reader = PdfReader(file_path)
        for page_idx, page in enumerate(reader.pages):
            content = page.extract_text()
            if content:
                text_parts.append(f"--- Page {page_idx + 1} ---\n{content.strip()}")
        return "\n\n".join(text_parts)

    @staticmethod
    def _parse_docx(file_path: str) -> str:
        doc = DocxDocument(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        return "\n\n".join(paragraphs)

    @staticmethod
    def _parse_txt(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    @staticmethod
    def _parse_csv(file_path: str) -> str:
        lines = []
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            header = None
            for row in reader:
                if not row:
                    continue
                if header is None:
                    header = row
                    lines.append("Columns: " + " | ".join(header))
                else:
                    paired = [f"{header[i]}: {val}" for i, val in enumerate(row) if i < len(header) and val.strip()]
                    lines.append(", ".join(paired))
        return "\n".join(lines)

    @staticmethod
    def _parse_html_file(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            html = f.read()
        return DocumentParser.clean_html(html)

    @staticmethod
    def clean_html(html_content: str) -> str:
        soup = BeautifulSoup(html_content, "html.parser")
        # Remove navigation, scripts, styles, footers
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "form", "iframe"]):
            tag.decompose()

        text = soup.get_text(separator="\n")
        # Clean consecutive blank lines
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)
