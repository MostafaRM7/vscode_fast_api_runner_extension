from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn

# Create FastAPI instance
app = FastAPI(
    title="Sample FastAPI App",
    description="A sample FastAPI application for testing the VS Code extension",
    version="1.0.0"
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Hello World from FastAPI!", "status": "success"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse({
        "status": "healthy",
        "service": "FastAPI Sample App",
        "version": "1.0.0"
    })

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    """Get item by ID"""
    return {"item_id": item_id, "q": q}

@app.post("/items/")
async def create_item(item: dict):
    """Create a new item"""
    return {"message": "Item created", "item": item}

if __name__ == "__main__":
    # This will only run if the script is executed directly
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 