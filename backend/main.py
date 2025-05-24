from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import annotations
from fastapi.responses import HTMLResponse

app = FastAPI()

# Add CORS settings here
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
def root():
    return "<h1>FastAPI PDF Annotation Backend</h1>"

# Register routers
app.include_router(annotations.router)
