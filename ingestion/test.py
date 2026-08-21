import sys
import pyarrow.parquet as pq

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

PARQUET_FILE = r"C:\Users\mukes\Downloads\hintrain.parquet"

parquet_file = pq.ParquetFile(PARQUET_FILE)

print("Total rows:", parquet_file.metadata.num_rows)

for batch in parquet_file.iter_batches(batch_size=5):
    rows = batch.to_pylist()

    for i, row in enumerate(rows):
        print(f"\n--- Row {i} ---")
        print("Query:", row.get("query"))
        print("Eng_Query:", row.get("Eng_Query"))
        print("Answer:", row.get("Answer"))
        print("Eng_Answer:", row.get("Eng_Answer"))
        passages = row["passages"]

        hindi_passages = passages["Translated_passages"]
        selected = passages["is_selected"]

        for idx, (passage, is_selected) in enumerate(zip(hindi_passages, selected)):
            if is_selected == 1:
                print(f"Selected passage [{idx}]:", passage[:150])

    break