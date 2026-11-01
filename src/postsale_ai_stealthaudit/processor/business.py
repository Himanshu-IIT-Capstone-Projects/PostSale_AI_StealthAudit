import os
import uuid
import pandas as pd

from postsale_ai_stealthaudit.processor.pipeline import run_full_pipeline

async def process_main(file) -> bool:
    print("\n [process_main()] started")
    try:
        # -----------------------------
        # Validate file type
        # -----------------------------

        allowed_extensions = [".csv", ".xlsx"]
        file_extension = os.path.splitext(file.filename)[1].lower()

        if file_extension not in allowed_extensions:
            return {
                "error": "Please upload a CSV or XLSX file"
            }

        # -----------------------------
        # Create temporary paths
        # -----------------------------

        input_path = f"data/{uuid.uuid4()}{file_extension}"
        print(f"\n Input path: {input_path}")

        output_path = f"data/output.xlsx"
        print(f"\n Output path: {output_path}")

        # -----------------------------
        # Save uploaded file
        # -----------------------------

        # “Start reading the file, and while waiting for it to finish, the server can do other work.”
        with open(input_path, "wb") as f:
            content = await file.read()
            f.write(content)

        print(f"\n File saved to: {input_path}")

        # -----------------------------
        # Load dataframe dynamically
        # -----------------------------

        if file_extension == ".csv":
            df = pd.read_csv(input_path)

        elif file_extension == ".xlsx":
            df = pd.read_excel(input_path)

        print(f"\n Dataframe loaded: {df.shape[0]} rows, {df.shape[1]} columns")

        # -----------------------------
        # Run pipeline
        # -----------------------------
        output_df = run_full_pipeline(df)
        print(f"\n Output dataframe shape: {output_df.shape[0]} rows, {output_df.shape[1]} columns")

        # -----------------------------
        # Save output dataframe to Excel
        # -----------------------------
        output_df.to_excel(output_path, index=False)
        print(f"\n ✅ Pipeline executed successfully!")
        return output_path
    except Exception as error:
        print(f"\n [process_main()] error: {error!r}")
        raise
    finally:
        print("\n [process_main()] end")
