from shared.db.database import SessionLocal
from shared.celery.app import celery_app
from shared.config.celery import CelerySettings

from workers.paper_scraper.modules.arxiv_source import get_arxiv_articles_by_date_window
from workers.paper_scraper.modules.categories import ARXIV_CS_CATEGORY_MAP
from workers.paper_scraper.modules.config import S2_API_KEY
from workers.paper_scraper.modules.network import get_robust_session
from workers.paper_scraper.modules.pdf_processing import download_pdf_bytes
from workers.paper_scraper.modules.repository import insert_article
from workers.paper_scraper.modules.semantic_audit import score_candidates
from workers.paper_scraper.modules.text_utils import extract_full_text_from_pdf_bytes


TRANSLATOR_TASK_NAME = "workers.ai_translator.src.celery_tasks.process_article_task"


def _map_keywords(raw_tags):
    mapped_keywords = []
    for tag in raw_tags:
        mapped_keywords.append(ARXIV_CS_CATEGORY_MAP.get(tag, tag))
    # Deduplicate while preserving order.
    return list(dict.fromkeys(mapped_keywords))


def run_curation_pipeline():
    print("=== INICIANDO PIPELINE DE CURADORIA SEMANAL ===")

    if S2_API_KEY:
        print(f"[Config] API Key detectada: {S2_API_KEY[:5]}...")
    else:
        print("[Config] AVISO: Sem API Key. Isso vai demorar muito devido aos limites.")

    days_back = 1
    try:
        raw_candidates = get_arxiv_articles_by_date_window(days_back=days_back)
    except KeyboardInterrupt:
        raise
    except Exception as error:
        print(f"[Erro] Falha ao buscar no ArXiv: {error}")
        return

    if not raw_candidates:
        print("Nenhum artigo encontrado no periodo.")
        return

    print(f"\n=== FASE 2: AUDITORIA DE {len(raw_candidates)} ARTIGOS ===")
    session_db = SessionLocal()
    http = get_robust_session()

    try:
        scored_candidates = score_candidates(
            raw_candidates=raw_candidates,
            session_db=session_db,
            http_session=http,
        )
    except KeyboardInterrupt:
        print("\n[!] Interrompido durante a auditoria. Seguindo para ranking parcial...")
        scored_candidates = [p for p in raw_candidates if "final_score" in p]

    if not scored_candidates:
        print("\n[!] Nenhum candidato foi processado antes da interrupcao.")
        session_db.close()
        return

    print("\n=== FASE 3: RANKING E SELECAO (PARCIAL/TOTAL) ===")
    scored_candidates.sort(key=lambda item: item["final_score"], reverse=True)

    top_n = 20
    winners = scored_candidates[:top_n]

    print(f"Selecionados os Top {len(winners)} artigos.")
    print("-" * 60)
    for index, paper in enumerate(winners[:5]):
        print(f"#{index + 1} [Score: {paper['final_score']:.1f}] {paper['title']}")
    print("-" * 60)

    print(f"\n=== FASE 4: DOWNLOAD E PERSISTENCIA ({len(winners)} itens) ===")
    saved_count = 0
    queued_count = 0
    celery_settings = CelerySettings.from_env()

    try:
        for paper in winners:
            print(f"Processando Vencedor: {paper['title'][:50]}...")

            mapped_keywords = _map_keywords(paper.get("tags", []))

            try:
                pdf_bytes = download_pdf_bytes(http_session=http, pdf_url=paper["pdf_url"])
                if not pdf_bytes:
                    print("  [!] Falha no download do PDF.")
                    continue

                full_text = extract_full_text_from_pdf_bytes(pdf_bytes)
                if not full_text or len(full_text) < 500:
                    print("  [!] PDF vazio/ilegivel.")
                    continue

                article_payload = {
                    "id": paper["arxiv_id"],
                    "title": paper["title"],
                    "authors": paper["authors"],
                    "publication_date": paper["published_date"],
                    "abstract": paper["abstract"],
                    "keywords": mapped_keywords,
                    "full_text": full_text.replace("\x00", ""),
                    "source_url": paper["arxiv_url"],
                    "original_pdf_path": None,
                    "processing_status": "parsed",
                    "relevance_score": paper["final_score"],
                }

                was_inserted = insert_article(session_db=session_db, article_payload=article_payload)

                if was_inserted:
                    saved_count += 1
                    print("  [*] Salvo com sucesso.")
                    try:
                        celery_app.send_task(
                            TRANSLATOR_TASK_NAME,
                            args=[paper["arxiv_id"]],
                            queue=celery_settings.translator_queue,
                        )
                        queued_count += 1
                        print("  [*] Enfileirado para traducao.")
                    except Exception as queue_error:
                        print(f"  [!] Falha ao enfileirar traducao: {queue_error}")
                else:
                    print("  [i] Artigo ja existente, sem novo enfileiramento.")

            except Exception as error:
                print(f"  [!] Erro critico ao salvar: {error}")
                session_db.rollback()

    except KeyboardInterrupt:
        print("\n[!] Interrupcao durante o salvamento. O banco permanece integro.")
        raise
    finally:
        session_db.close()

    print("\n=== CURADORIA FINALIZADA ===")
    print(f"Total salvo no DB: {saved_count}")
    print(f"Total enfileirado para traducao: {queued_count}")
