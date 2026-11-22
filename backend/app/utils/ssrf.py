import ipaddress
import socket
from urllib.parse import urlparse
import httpx

DISALLOWED_HOSTS = {
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "metadata.google.internal",
    "instance-data",
}

def is_safe_url(url: str) -> bool:
    """Validate that a URL does not point to internal, private, loopback, or cloud metadata IP ranges."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        if hostname.lower() in DISALLOWED_HOSTS:
            return False

        # Resolve hostname to all IP addresses
        addr_info = socket.getaddrinfo(hostname, None)
        for entry in addr_info:
            ip_str = entry[4][0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
            # Check 169.254.169.254 (Cloud metadata)
            if str(ip).startswith("169.254."):
                return False

        return True
    except Exception:
        return False

async def safe_fetch(url: str, timeout_seconds: float = 10.0, max_bytes: int = 5 * 1024 * 1024) -> str:
    """Fetch URL content while strictly enforcing SSRF protection."""
    if not is_safe_url(url):
        raise ValueError(f"SSRF Protection: Access to URL {url} is forbidden.")

    async with httpx.AsyncClient(follow_redirects=False, timeout=timeout_seconds) as client:
        response = await client.get(url, headers={"User-Agent": "SupportPilot-Crawler/1.0"})
        if response.is_redirect:
            redirect_url = response.headers.get("location")
            if not redirect_url or not is_safe_url(redirect_url):
                raise ValueError("SSRF Protection: Redirect to unsafe destination blocked.")
            # Follow 1 safe redirect
            response = await client.get(redirect_url, headers={"User-Agent": "SupportPilot-Crawler/1.0"})

        response.raise_for_status()
        content = response.text
        if len(content.encode("utf-8")) > max_bytes:
            raise ValueError(f"Payload too large. Max limit is {max_bytes} bytes.")
        return content
