# FastAPI Runner - Settings Override Guide

This guide explains how to customize the FastAPI Runner extension settings to match your project setup and development preferences.

## 🔧 Accessing Settings

### Method 1: VS Code Settings UI
1. Open VS Code Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
2. Search for "FastAPI Runner"
3. Modify settings through the UI

### Method 2: Settings JSON (Recommended)
1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Preferences: Open Settings (JSON)"
3. Add FastAPI Runner settings to your `settings.json`

### Method 3: Workspace Settings
Create `.vscode/settings.json` in your project root for project-specific settings:

```json
{
    "fastapi-runner.host": "127.0.0.1",
    "fastapi-runner.port": 8000,
    "fastapi-runner.workingDirectory": "src"
}
```

## ⚙️ Available Settings

### 🌐 Server Configuration

#### `fastapi-runner.host`
- **Type**: `string`
- **Default**: `"127.0.0.1"`
- **Description**: Host address for FastAPI server

**Examples:**
```json
{
    "fastapi-runner.host": "0.0.0.0",        // Listen on all interfaces
    "fastapi-runner.host": "192.168.1.100",  // Specific IP address
    "fastapi-runner.host": "localhost"       // Localhost only
}
```

#### `fastapi-runner.port`
- **Type**: `number`
- **Default**: `8000`
- **Description**: Port number for FastAPI server

**Examples:**
```json
{
    "fastapi-runner.port": 8080,    // Common alternative port
    "fastapi-runner.port": 3000,    // Development port
    "fastapi-runner.port": 5000     // Flask-style port
}
```

#### `fastapi-runner.reload`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable auto-reload for development

**Examples:**
```json
{
    "fastapi-runner.reload": true,   // Enable auto-reload (development)
    "fastapi-runner.reload": false   // Disable auto-reload (production-like)
}
```

### 🐍 Python & Uvicorn Configuration

#### `fastapi-runner.pythonPath`
- **Type**: `string`
- **Default**: `"python"`
- **Description**: Path to Python executable

**Examples:**
```json
{
    "fastapi-runner.pythonPath": "python3",                     // Use python3 command
    "fastapi-runner.pythonPath": "/usr/bin/python3.9",         // Specific Python version
    "fastapi-runner.pythonPath": "/opt/miniconda3/bin/python",  // Conda environment
    "fastapi-runner.pythonPath": "C:\\Python39\\python.exe"    // Windows path
}
```

#### `fastapi-runner.uvicornPath`
- **Type**: `string`
- **Default**: `"uvicorn"`
- **Description**: Path to uvicorn executable

**Examples:**
```json
{
    "fastapi-runner.uvicornPath": "uvicorn",                          // Default
    "fastapi-runner.uvicornPath": "/usr/local/bin/uvicorn",          // Specific path
    "fastapi-runner.uvicornPath": "C:\\Python39\\Scripts\\uvicorn"   // Windows path
}
```

#### `fastapi-runner.useModuleMode`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Use 'python -m uvicorn' instead of direct uvicorn command

**Examples:**
```json
{
    "fastapi-runner.useModuleMode": true,   // Use python -m uvicorn (recommended)
    "fastapi-runner.useModuleMode": false   // Use direct uvicorn command
}
```

### 📁 Project Structure Configuration

#### `fastapi-runner.defaultFile`
- **Type**: `string`
- **Default**: `"app:app"`
- **Description**: Default FastAPI application module:variable

**Examples:**
```json
{
    "fastapi-runner.defaultFile": "main:app",           // app variable in main.py
    "fastapi-runner.defaultFile": "src.main:app",       // app in src/main.py
    "fastapi-runner.defaultFile": "api.server:application", // application in api/server.py
    "fastapi-runner.defaultFile": "app.main:create_app"     // Factory function
}
```

#### `fastapi-runner.workingDirectory`
- **Type**: `string`
- **Default**: `""`
- **Description**: Working directory for running uvicorn (relative to workspace root)

**Examples:**
```json
{
    "fastapi-runner.workingDirectory": "",           // Use workspace root
    "fastapi-runner.workingDirectory": "src",        // Use src/ directory
    "fastapi-runner.workingDirectory": "backend",    // Use backend/ directory
    "fastapi-runner.workingDirectory": "api/v1"      // Use nested directory
}
```

### 🌍 Virtual Environment Configuration

#### `fastapi-runner.autoDetectVenv`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Automatically detect and use virtual environment

**Examples:**
```json
{
    "fastapi-runner.autoDetectVenv": true,   // Auto-detect virtual environment
    "fastapi-runner.autoDetectVenv": false   // Disable auto-detection
}
```

#### `fastapi-runner.venvPath`
- **Type**: `string`
- **Default**: `""`
- **Description**: Custom virtual environment path (empty for auto-detection)

**Examples:**
```json
{
    "fastapi-runner.venvPath": "",                           // Auto-detect
    "fastapi-runner.venvPath": ".venv",                      // Project .venv folder
    "fastapi-runner.venvPath": "/path/to/my/venv",          // Custom path
    "fastapi-runner.venvPath": "C:\\Projects\\myapp\\venv"  // Windows path
}
```

## 🎯 Common Configuration Scenarios

### 1. Standard Project Structure
```
my-project/
├── main.py          # FastAPI app
├── requirements.txt
└── .vscode/
    └── settings.json
```

**Settings:**
```json
{
    "fastapi-runner.defaultFile": "main:app",
    "fastapi-runner.port": 8000,
    "fastapi-runner.reload": true
}
```

### 2. Source Directory Structure
```
my-project/
├── src/
│   ├── main.py      # FastAPI app
│   └── models/
├── requirements.txt
└── .vscode/
    └── settings.json
```

**Settings:**
```json
{
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.defaultFile": "main:app",
    "fastapi-runner.port": 8000
}
```

### 3. Microservices Structure
```
my-project/
├── services/
│   ├── api/
│   │   └── server.py  # FastAPI app
│   └── auth/
├── requirements.txt
└── .vscode/
    └── settings.json
```

**Settings:**
```json
{
    "fastapi-runner.workingDirectory": "services",
    "fastapi-runner.defaultFile": "api.server:app",
    "fastapi-runner.port": 8001
}
```

### 4. Docker Development Setup
```json
{
    "fastapi-runner.host": "0.0.0.0",
    "fastapi-runner.port": 8000,
    "fastapi-runner.pythonPath": "python3",
    "fastapi-runner.reload": true,
    "fastapi-runner.useModuleMode": true
}
```

### 5. Production-Like Settings
```json
{
    "fastapi-runner.host": "127.0.0.1",
    "fastapi-runner.port": 8000,
    "fastapi-runner.reload": false,
    "fastapi-runner.useModuleMode": true
}
```

### 6. Multiple Python Versions
```json
{
    "fastapi-runner.pythonPath": "/usr/bin/python3.11",
    "fastapi-runner.autoDetectVenv": true,
    "fastapi-runner.useModuleMode": true
}
```

### 7. Windows Development
```json
{
    "fastapi-runner.pythonPath": "python.exe",
    "fastapi-runner.venvPath": ".venv",
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.useModuleMode": true
}
```

## 🔧 Advanced Configuration

### Environment-Specific Settings

#### Development Environment
```json
{
    "fastapi-runner.host": "127.0.0.1",
    "fastapi-runner.port": 8000,
    "fastapi-runner.reload": true,
    "fastapi-runner.autoDetectVenv": true
}
```

#### Team Shared Settings
```json
{
    "fastapi-runner.host": "0.0.0.0",
    "fastapi-runner.port": 8000,
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.defaultFile": "main:app",
    "fastapi-runner.useModuleMode": true
}
```

### Virtual Environment Priority

The extension detects virtual environments in this order:
1. Custom `venvPath` setting
2. Auto-detection (if enabled):
   - `venv/` folder
   - `.venv/` folder
   - `env/` folder
   - `.env/` folder
   - Conda environments
3. System Python

### Troubleshooting Settings

#### Module Import Issues
```json
{
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.useModuleMode": true,
    "fastapi-runner.pythonPath": "python3"
}
```

#### Port Conflicts
```json
{
    "fastapi-runner.port": 8080,
    "fastapi-runner.host": "127.0.0.1"
}
```

#### Virtual Environment Issues
```json
{
    "fastapi-runner.autoDetectVenv": true,
    "fastapi-runner.venvPath": ".venv",
    "fastapi-runner.useModuleMode": true
}
```

## 📝 Settings Validation

The extension validates settings on startup:
- Checks if working directory exists
- Validates Python path accessibility
- Verifies virtual environment paths
- Confirms uvicorn availability

## 🎨 Tips & Best Practices

1. **Use workspace settings** for project-specific configurations
2. **Enable auto-reload** for development environments
3. **Set working directory** for proper module imports
4. **Use virtual environments** for dependency isolation
5. **Document team settings** in project README
6. **Test settings** after changes using the restart command

## 🚨 Common Pitfalls

1. **Incorrect working directory** → Module import errors
2. **Wrong Python path** → Command not found errors
3. **Port conflicts** → Server start failures
4. **Missing virtual environment** → Dependency issues
5. **Incorrect default file** → Application not found errors

---

💡 **Need more help?** Check the main README.md for additional documentation and troubleshooting tips. 