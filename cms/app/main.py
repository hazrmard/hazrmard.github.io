
import os
import subprocess
import mimetypes
import shutil
from fastapi import FastAPI, Request, Response, HTTPException, Depends, Form, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import uvicorn

# --- Configuration ---
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(APP_ROOT))
TEMPLATES_DIR = os.path.join(APP_ROOT, "templates")
STATIC_DIR = os.path.join(APP_ROOT, "static")

# For simplicity, hardcode credentials. In a real app, use environment variables.
CMS_USER = "admin"
CMS_PASSWORD = "password"

# --- FastAPI App Initialization ---
app = FastAPI()
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)
security = HTTPBasic()

hugo_server_process = None

# --- Authentication ---
def get_current_user(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = credentials.username == CMS_USER
    correct_password = credentials.password == CMS_PASSWORD
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# --- Background Process Management ---
@app.on_event("startup")
async def startup_event():
    global hugo_server_process
    # Start hugo server in the background
    hugo_command = ["hugo", "server", "-D", "--renderToDisk"]
    hugo_server_process = subprocess.Popen(hugo_command, cwd=PROJECT_ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print("Started Hugo server in background.")

@app.on_event("shutdown")
async def shutdown_event():
    if hugo_server_process:
        hugo_server_process.terminate()
        print("Terminated Hugo server.")

# --- API Endpoints ---
@app.get("/api/files")
async def list_files(user: str = Depends(get_current_user)):
    try:
        # Use git to list all files, respecting .gitignore
        git_command = ["git", "ls-files", "--cached", "--others", "--exclude-standard"]
        proc = subprocess.run(git_command, cwd=PROJECT_ROOT, capture_output=True, text=True, check=True)
        files = proc.stdout.strip().split('\n')
        return JSONResponse(content=sorted(files))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files with git: {e}")

@app.get("/api/files/content")
async def get_file_content(path: str, user: str = Depends(get_current_user)):
    # The path from the frontend is relative to the project root.
    file_path = os.path.join(PROJECT_ROOT, path)
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"File not found at: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return Response(content=content, media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {e}")

@app.post("/api/files/content")
async def save_file_content(path: str = Form(...), content: str = Form(...), user: str = Depends(get_current_user)):
    file_path = os.path.join(PROJECT_ROOT, path)
    if not os.path.exists(os.path.dirname(file_path)):
        raise HTTPException(status_code=404, detail="Directory not found")
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return JSONResponse(content={"message": "File saved successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing file: {e}")

@app.post("/api/files/create")
async def create_file(path: str = Form(...), user: str = Depends(get_current_user)):
    file_path = os.path.join(PROJECT_ROOT, path)
    if os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="File already exists")
    try:
        with open(file_path, 'w') as f:
            f.write('') # Create an empty file
        return JSONResponse(content={"message": "File created successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating file: {e}")

@app.post("/api/files/delete")
async def delete_file(path: str = Form(...), user: str = Depends(get_current_user)):
    file_path = os.path.join(PROJECT_ROOT, path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        os.remove(file_path)
        return JSONResponse(content={"message": "File deleted successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {e}")

@app.post("/api/files/rename")
async def rename_file(old_path: str = Form(...), new_path: str = Form(...), user: str = Depends(get_current_user)):
    old_file_path = os.path.join(PROJECT_ROOT, old_path)
    new_file_path = os.path.join(PROJECT_ROOT, new_path)
    if not os.path.exists(old_file_path):
        raise HTTPException(status_code=404, detail="Source file not found")
    if os.path.exists(new_file_path):
        raise HTTPException(status_code=400, detail="Destination file already exists")
    try:
        os.rename(old_file_path, new_file_path)
        return JSONResponse(content={"message": "File renamed successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error renaming file: {e}")

@app.post("/api/files/upload")
async def upload_file(path: str = Form(...), file: UploadFile = File(...), user: str = Depends(get_current_user)):
    upload_dir = os.path.join(PROJECT_ROOT, path)
    if not os.path.isdir(upload_dir):
        raise HTTPException(status_code=400, detail="Upload path must be a directory")
    
    file_path = os.path.join(upload_dir, file.filename)
    if os.path.exists(file_path):
        raise HTTPException(status_code=400, detail=f"File '{file.filename}' already exists in this location.")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return JSONResponse(content={"message": f"File '{file.filename}' uploaded successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {e}")


@app.post("/api/commands/run")
async def run_command(command: str = Form(...), user: str = Depends(get_current_user)):
    # Security: Only allow specific, hardcoded commands
    allowed_commands = {
        "status": ["git", "status"],
        "add": ["git", "add", "."],
        "commit": ["git", "commit", "-m", "CMS commit"], # A default message
        "push": ["git", "push"],
        "deploy": ["git", "push", "origin", "master"], # Example deploy command
        "build": ["hugo"]
    }
    if command not in allowed_commands:
        raise HTTPException(status_code=400, detail="Invalid command")

    try:
        proc = subprocess.run(
            allowed_commands[command],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=False
        )
        return JSONResponse(content={
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "returncode": proc.returncode
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running command: {e}")

# --- Main Page ---
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, user: str = Depends(get_current_user)):
    return templates.TemplateResponse("index.html", {"request": request})

# --- Run Server ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8008, reload=True)
