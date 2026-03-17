import time

from sqlalchemy import text

from .text_utils import calculate_relevance_score


S2_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search"


def score_candidates(raw_candidates, session_db, http_session):
    """Score new papers with Semantic Scholar metadata when available."""
    scored_candidates = []
    processed_count = 0
    total_count = len(raw_candidates)

    for paper in raw_candidates:
        processed_count += 1
        arxiv_id = paper["arxiv_id"]
        title = paper["title"]

        exists = session_db.execute(
            text("SELECT 1 FROM articles WHERE id = :id"), {"id": arxiv_id}
        ).fetchone()
        if exists:
            continue

        s2_score = 0.0
        s2_data_found = False

        try:
            params = {
                "query": title,
                "fields": "title,authors.name,authors.hIndex,authors.citationCount,citationCount",
                "limit": 1,
            }
            time.sleep(0.5)
            response = http_session.get(S2_SEARCH_URL, params=params, timeout=5)

            if response.status_code == 200:
                data = response.json()
                if data.get("data"):
                    s2_paper = data["data"][0]
                    if s2_paper["title"].lower()[:30] in title.lower():
                        s2_score = calculate_relevance_score(s2_paper)
                        s2_data_found = True
        except Exception:
            # Keep pipeline resilient when external API is unstable.
            pass

        paper["final_score"] = s2_score
        scored_candidates.append(paper)

        status = f"Score: {s2_score:.1f}" if s2_data_found else "S2: N/A"
        print(f"[{processed_count}/{total_count}] Analisado: {title[:40]}... | {status}")

    return scored_candidates
