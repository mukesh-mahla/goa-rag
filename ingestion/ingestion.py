import os
import time

import numpy as np
import pyarrow.parquet as pq
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone

# ============================================================
# Configuration
# ============================================================

load_dotenv()

PARQUET_FILE = r"C:\Users\mukes\Downloads\hintrain.parquet"

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = "brainly-content"
PINECONE_NAMESPACE = "msmarco-hi"

GEMINI_API_KEY = os.getenv("gemini_api_key")

# Read this many Parquet rows at a time.
PARQUET_BATCH_SIZE = 100

# Number of texts sent to the embedding API at once.
EMBEDDING_BATCH_SIZE = 100

# Pinecone recommends batching upserts; up to 1000 vectors per request
# is supported in the referenced API documentation.
PINECONE_BATCH_SIZE = 100

# Truncated output dimension for gemini-embedding-001.
EMBEDDING_DIMENSION = 768

# Set this to an integer while testing.
# Example: 10
# Set to None to process the entire file.
MAX_PARQUET_BATCHES = None


# ============================================================
# Validation
# ============================================================

if not PINECONE_API_KEY:
    raise RuntimeError("PINECONE_API_KEY is missing from .env")

if not PINECONE_INDEX:
    raise RuntimeError("PINECONE_INDEX is missing from .env")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

if not os.path.exists(PARQUET_FILE):
    raise FileNotFoundError(
        f"Parquet file not found:\n{PARQUET_FILE}"
    )


# ============================================================
# Clients
# ============================================================

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)

pinecone_client = Pinecone(
    api_key=PINECONE_API_KEY
)

index = pinecone_client.Index(
    PINECONE_INDEX
)


# ============================================================
# Embedding helper
# ============================================================

def create_embeddings(texts):
    """
    Create embeddings for a list of texts.

    gemini-embedding-001 returns one vector per input text.
    Vectors are truncated to EMBEDDING_DIMENSION and re-normalized
    to unit length, since truncated Matryoshka embeddings are not
    unit-length by default.
    """

    for attempt in range(5):
        try:
            response = gemini_client.models.embed_content(
                model="gemini-embedding-001",
                contents=texts,
                config={"output_dimensionality": EMBEDDING_DIMENSION}
            )

            # Keep the order exactly the same as the input order.
            embeddings = [
                item.values
                for item in response.embeddings
            ]

            normalized = []

            for embedding in embeddings:
                array = np.array(embedding)
                norm = np.linalg.norm(array)
                normalized.append((array / norm).tolist())

            return normalized

        except Exception as error:
            print(
                f"Embedding request failed "
                f"(attempt {attempt + 1}/5): {error}"
            )

            if attempt == 4:
                raise

            time.sleep(2 ** attempt)


# ============================================================
# Pinecone helper
# ============================================================

def upsert_vectors(vectors):
    """
    Upload vectors to Pinecone in smaller batches.
    """

    for start in range(
        0,
        len(vectors),
        PINECONE_BATCH_SIZE
    ):
        end = start + PINECONE_BATCH_SIZE

        chunk = vectors[start:end]

        for attempt in range(5):
            try:
                index.upsert(
                    vectors=chunk,
                    namespace=PINECONE_NAMESPACE
                )

                break

            except Exception as error:
                print(
                    f"Pinecone upsert failed "
                    f"(attempt {attempt + 1}/5): {error}"
                )

                if attempt == 4:
                    raise

                time.sleep(2 ** attempt)


# ============================================================
# Main ingestion
# ============================================================

def main():

    print("Opening Parquet file...")

    parquet_file = pq.ParquetFile(
        PARQUET_FILE
    )

    total_rows = parquet_file.metadata.num_rows

    print(f"Total Parquet rows: {total_rows:,}")
    print(f"Parquet batch size: {PARQUET_BATCH_SIZE}")
    print(f"Namespace: {PINECONE_NAMESPACE}")
    print()

    total_rows_processed = 0
    total_selected_passages = 0
    total_vectors_uploaded = 0

    # --------------------------------------------------------
    # Iterate through Parquet without loading the whole file
    # --------------------------------------------------------

    for batch_number, batch in enumerate(
        parquet_file.iter_batches(
            batch_size=PARQUET_BATCH_SIZE
        ),
        start=1
    ):

        if (
            MAX_PARQUET_BATCHES is not None
            and batch_number > MAX_PARQUET_BATCHES
        ):
            print(
                "\nReached MAX_PARQUET_BATCHES. Stopping."
            )
            break

        rows = batch.to_pylist()

        total_rows_processed += len(rows)

        records = []

        # ----------------------------------------------------
        # Extract selected Hindi + English passage pairs
        # ----------------------------------------------------

        for row in rows:

            passages = row.get("passages")

            if not passages:
                continue

            hindi_passages = (
                passages.get("Translated_passages") or []
            )

            english_passages = (
                passages.get("English_passages") or []
            )

            selected = (
                passages.get("is_selected") or []
            )

            # These lists correspond by index.
            for passage_index, (
                hindi_text,
                english_text,
                is_selected
            ) in enumerate(
                zip(
                    hindi_passages,
                    english_passages,
                    selected
                )
            ):

                # IMPORTANT:
                # 1 means the passage was selected/relevant
                # in the MSMARCO annotation.
                if is_selected != 1:
                    continue

                if not hindi_text:
                    continue

                hindi_text = hindi_text.strip()
                english_text = (
                    english_text.strip()
                    if english_text
                    else ""
                )

                if not hindi_text:
                    continue

                records.append({
                    "id": (
                        f"hi-{row['query_id']}"
                        f"-{passage_index}"
                    ),
                    "hindi": hindi_text,
                    "english": english_text,
                    "query": row.get("query", ""),
                    "english_query": row.get("Eng_Query", ""),
                    "answer": row.get("Answer", ""),
                    "english_answer": row.get("Eng_Answer", ""),
                    "query_id": row.get("query_id"),
                    "query_type": row.get("query_type", "")
                })

        if not records:
            print(
                f"Batch {batch_number}: "
                f"no selected passages"
            )
            continue

        total_selected_passages += len(records)

        # ----------------------------------------------------
        # Create embeddings in batches
        # ----------------------------------------------------

        vectors = []

        for start in range(
            0,
            len(records),
            EMBEDDING_BATCH_SIZE
        ):

            embedding_records = records[
                start:start + EMBEDDING_BATCH_SIZE
            ]

            texts_to_embed = [
                record["hindi"]
                for record in embedding_records
            ]

            embeddings = create_embeddings(
                texts_to_embed
            )

            # ------------------------------------------------
            # Build Pinecone records
            # ------------------------------------------------

            for record, embedding in zip(
                embedding_records,
                embeddings
            ):

                vectors.append({
                    "id": record["id"],

                    "values": embedding,

                    "metadata": {
                        # Main retrieved text
                        "text_hi": record["hindi"],

                        # English equivalent
                        "text_en": record["english"],

                        # Dataset information
                        "query_id": record["query_id"],
                        "query": record["query"],
                        "query_en": record["english_query"],

                        # Useful for evaluation/debugging
                        "answer": record["answer"],
                        "answer_en": record["english_answer"],

                        "query_type": record["query_type"],

                        "language": "hi"
                    }
                })

        # ----------------------------------------------------
        # Upload to Pinecone
        # ----------------------------------------------------

        upsert_vectors(vectors)

        total_vectors_uploaded += len(vectors)

        print(
            f"Batch {batch_number}: "
            f"rows={len(rows)}, "
            f"selected={len(records)}, "
            f"uploaded={len(vectors)}, "
            f"total_uploaded={total_vectors_uploaded}"
        )

    # ========================================================
    # Finished
    # ========================================================

    print("\n======================================")
    print("INGESTION COMPLETE")
    print("======================================")

    print(
        f"Rows processed: "
        f"{total_rows_processed:,}"
    )

    print(
        f"Selected passages: "
        f"{total_selected_passages:,}"
    )

    print(
        f"Vectors uploaded: "
        f"{total_vectors_uploaded:,}"
    )

    print(
        f"Namespace: "
        f"{PINECONE_NAMESPACE}"
    )


if __name__ == "__main__":
    main()