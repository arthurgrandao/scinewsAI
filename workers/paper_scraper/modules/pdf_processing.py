def download_pdf_bytes(http_session, pdf_url):
    """Download PDF content directly to memory and return raw bytes."""
    response = http_session.get(pdf_url, timeout=60)
    if response.status_code != 200:
        return None
    return response.content
