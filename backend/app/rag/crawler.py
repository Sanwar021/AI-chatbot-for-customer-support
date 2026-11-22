import asyncio
from typing import Dict, List, Set
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from app.rag.parser import DocumentParser
from app.utils.ssrf import is_safe_url, safe_fetch

class WebsiteCrawler:
    """Safe website crawler with SSRF prevention and same-domain traversal limit."""

    def __init__(self, max_pages: int = 5):
        self.max_pages = max_pages

    async def crawl_site(self, start_url: str) -> List[Dict[str, str]]:
        """Crawl starting URL and up to max_pages same-domain internal links."""
        if not is_safe_url(start_url):
            raise ValueError(f"SSRF Protection: Access to URL {start_url} is not allowed.")

        parsed_start = urlparse(start_url)
        base_domain = parsed_start.netloc.lower()

        visited: Set[str] = set()
        to_visit: List[str] = [start_url]
        results: List[Dict[str, str]] = []

        while to_visit and len(visited) < self.max_pages:
            current_url = to_visit.pop(0)
            # Normalize
            normalized_url = current_url.split("#")[0].rstrip("/")
            if normalized_url in visited:
                continue

            visited.add(normalized_url)

            try:
                html = await safe_fetch(current_url)
                soup = BeautifulSoup(html, "html.parser")
                title = soup.title.string.strip() if soup.title and soup.title.string else current_url

                cleaned_text = DocumentParser.clean_html(html)
                if cleaned_text:
                    results.append({
                        "url": current_url,
                        "title": title,
                        "content": cleaned_text,
                    })

                # Extract same-domain internal links
                if len(visited) < self.max_pages:
                    for link in soup.find_all("a", href=True):
                        href = link["href"].strip()
                        full_link = urljoin(current_url, href)
                        parsed_link = urlparse(full_link)

                        if parsed_link.scheme in ("http", "https") and parsed_link.netloc.lower() == base_domain:
                            link_norm = full_link.split("#")[0].rstrip("/")
                            if link_norm not in visited and link_norm not in to_visit and is_safe_url(full_link):
                                to_visit.append(full_link)
            except Exception:
                continue

        return results
