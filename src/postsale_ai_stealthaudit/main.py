from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
# Import StaticFiles for css, js file while rendering widget.html
from fastapi.staticfiles import StaticFiles

from postsale_ai_stealthaudit.processor.business import process_main  

app = FastAPI(
    title="Post Sale AI Stealth Audit API", 
    description="API for conducting stealth audits on post-sale AI systems",
    version="1.0.0",
    contact={
        "name": "Himanshu",
        "email": "",
    }
)


# Explicit route to catch "/" and send index.html directly
@app.get("/")
async def root():
    return FileResponse("frontend/index.html")


@app.get("/healthcheck")
async def root():
    return {"message": "API is up and running!"}


@app.post("/uploadfile")
async def evaluate_file(file: UploadFile = File(...)):
    print(f"\n Received file: {file.filename}")
    # -----------------------------Test
    return FileResponse(
        path="./data/call_center_evaluations-1.xlsx",
        filename="output.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    # -----------------------------
    # Process the uploaded file and get the output path
    # -----------------------------
    output_path = await process_main(file)

    # -----------------------------
    # Return output file
    # -----------------------------
    return FileResponse(
        path=output_path,
        filename="qa_output.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# Static directory mounted to capture style.css and app.js
app.mount("/", StaticFiles(directory="frontend"), name="frontend")
