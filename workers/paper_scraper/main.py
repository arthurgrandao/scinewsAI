import sys
from workers.paper_scraper.modules.pipeline import run_curation_pipeline

def main():
    """
    Main entry point. Directly runs the curation pipeline.
    """
    try:
        run_curation_pipeline()
    except Exception as e:
        print(f"Pipeline execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
