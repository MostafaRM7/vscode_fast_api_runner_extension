# FastAPI Runner

A Visual Studio Code extension that simplifies running FastAPI projects with uvicorn server.

## Features

- 🚀 **One-click FastAPI server start/stop** from VS Code
- 🔄 **Auto-reload** support for development
- 📊 **Real-time server status** in status bar
- 🔍 **Auto-detection** of FastAPI files in workspace
- ⚙️ **Configurable settings** for host, port, and Python paths
- 📝 **Integrated output** channel for server logs
- 🎯 **Multiple FastAPI file selection** support

## Requirements

- Python 3.7+ installed on your system
- FastAPI and uvicorn packages installed in your Python environment

```bash
pip install fastapi uvicorn
```

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "FastAPI Runner"
4. Click Install

## Usage

### Quick Start

1. Open a folder containing your FastAPI project
2. Look for the FastAPI status in the status bar (bottom of VS Code)
3. Click the status bar item or use Command Palette commands

### Available Commands

- **Start FastAPI Server**: `Ctrl+Shift+P` → "Start FastAPI Server"
- **Stop FastAPI Server**: `Ctrl+Shift+P` → "Stop FastAPI Server"  
- **Restart FastAPI Server**: `Ctrl+Shift+P` → "Restart FastAPI Server"
- **Select FastAPI File**: `Ctrl+Shift+P` → "Select FastAPI File"
- **Create Virtual Environment**: `Ctrl+Shift+P` → "Create Virtual Environment"
- **Install FastAPI Dependencies**: `Ctrl+Shift+P` → "Install FastAPI Dependencies"

### Status Bar

The extension adds a status bar item showing current server status:
- `○ FastAPI: Stopped` - Server is not running (click to start)
- `▶ FastAPI: Running :8000` - Server is running on port 8000 (click to stop)

## Configuration

Configure the extension through VS Code settings. For detailed configuration instructions, see the [**Settings Override Guide**](SETTINGS_OVERRIDE_GUIDE.md).

### Quick Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `fastapi-runner.host` | `127.0.0.1` | Host address for FastAPI server |
| `fastapi-runner.port` | `8000` | Port number for FastAPI server |
| `fastapi-runner.reload` | `true` | Enable auto-reload for development |
| `fastapi-runner.pythonPath` | `python` | Path to Python executable |
| `fastapi-runner.uvicornPath` | `uvicorn` | Path to uvicorn executable |
| `fastapi-runner.defaultFile` | `app:app` | Default FastAPI application module:variable |
| `fastapi-runner.workingDirectory` | `src` | Working directory for running uvicorn (e.g., `src`) |
| `fastapi-runner.autoDetectVenv` | `true` | Automatically detect and use virtual environment |
| `fastapi-runner.useModuleMode` | `true` | Use 'python -m uvicorn' instead of direct uvicorn |

### Example Configuration

```json
{
    "fastapi-runner.host": "0.0.0.0",
    "fastapi-runner.port": 8080,
    "fastapi-runner.reload": true,
    "fastapi-runner.pythonPath": "/usr/bin/python3",
    "fastapi-runner.uvicornPath": "uvicorn",
    "fastapi-runner.defaultFile": "main:app",
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.autoDetectVenv": true,
    "fastapi-runner.useModuleMode": true
}
```

📖 **For comprehensive configuration examples and troubleshooting, see the [Settings Override Guide](SETTINGS_OVERRIDE_GUIDE.md).**

## File Detection

The extension automatically detects FastAPI files by:

1. Looking for common file names: `main.py`, `app.py`, `server.py`, `api.py`
2. Scanning file contents for FastAPI imports
3. Using the configured default file if no auto-detection succeeds

### Supported FastAPI App Formats

- `main:app` - app variable in main.py
- `src.main:app` - app variable in src/main.py
- `api.server:application` - application variable in api/server.py

## Example FastAPI Project Structure

### Simple Structure
```
my-fastapi-project/
├── main.py              # FastAPI app here
├── requirements.txt     # Dependencies
└── .vscode/
    └── settings.json   # VS Code settings
```

### With src/ Directory
```
my-fastapi-project/
├── src/                 # Working directory
│   ├── main.py         # FastAPI app here
│   ├── models/
│   │   └── user.py
│   └── routes/
│       └── auth.py
├── requirements.txt     # Dependencies
└── .vscode/
    └── settings.json   # VS Code settings
```

**Settings for src/ structure:**
```json
{
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.defaultFile": "main:app"
}
```

### Sample main.py

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="My API", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
async def health_check():
    return JSONResponse({"status": "healthy"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Troubleshooting

### Common Issues

**1. "uvicorn command not found"**
- Extension automatically uses `python -m uvicorn` for better compatibility
- Make sure uvicorn is installed: `pip install uvicorn`
- Create and activate a virtual environment using the extension commands
- Check the `uvicornPath` setting in VS Code settings

**2. "No FastAPI file found"**
- Ensure your FastAPI file imports FastAPI or fastapi
- Use "Select FastAPI File" command to manually choose
- Check the `defaultFile` setting

**3. "Port already in use"**
- Change the port in settings: `fastapi-runner.port`
- Stop other services using the same port
- Use the stop command to ensure no orphaned processes

**4. Python environment issues**
- Use "Create Virtual Environment" command to set up automatically
- Set correct Python path: `fastapi-runner.pythonPath`
- Use "Install FastAPI Dependencies" command for proper package installation
- Check virtual environment detection in Output Channel

**5. "ModuleNotFoundError" for imports**
- Set `fastapi-runner.workingDirectory` to your source directory (e.g., `src`)
- Extension automatically configures PYTHONPATH for proper imports
- Ensure your project structure has proper `__init__.py` files

### Output Channel

Check the "FastAPI Runner" output channel for detailed logs:
1. View → Output
2. Select "FastAPI Runner" from the dropdown
3. Review server logs and error messages

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/MostafaRM7/vscode_fast_api_runner_extension.git
cd vscode_fast_api_runner_extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
vsce package
```

### Running in Development

1. Open the project in VS Code
2. Press F5 to open Extension Development Host
3. Test the extension in the new window

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Changelog

### 1.0.0
- Initial release
- Basic FastAPI server start/stop functionality
- Auto-detection of FastAPI files
- Configurable settings
- Status bar integration
- Output channel for logs
- **Virtual Environment** support with auto-detection
- **Working Directory** support for src-based projects
- **Create Virtual Environment** command
- **Install FastAPI Dependencies** command
- **Module Mode** for better virtual environment compatibility
- **PYTHONPATH** automatic configuration

## Support

- [Report Issues](https://github.com/MostafaRM7/vscode_fast_api_runner_extension/issues)
- [Request Features](https://github.com/MostafaRM7/vscode_fast_api_runner_extension/issues)
- [Documentation](https://github.com/MostafaRM7/vscode_fast_api_runner_extension)

---

**Enjoy developing with FastAPI! 🚀** 