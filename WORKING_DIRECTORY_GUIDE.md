# راهنمای Working Directory در FastAPI Runner

## 🚀 قابلیت جدید: Working Directory

Extension حالا از **Working Directory** پشتیبانی می‌کند - مخصوصاً برای پروژه‌هایی که کد در پوشه `src` قرار دارد.

### 📋 مشکل حل شده

```
پروژه‌ی شما:
my-project/
├── src/
│   ├── main.py        # FastAPI app اینجا است
│   └── models/
│       └── user.py
├── tests/
└── requirements.txt
```

**مشکل قبلی:**
- Extension در root directory دنبال فایل می‌کرد
- PYTHONPATH درست تنظیم نمی‌شد
- Import های relative کار نمی‌کرد

**حل:**
- Working Directory را روی `src` تنظیم کنید
- Extension خودکار PYTHONPATH را تنظیم می‌کند
- uvicorn از دایرکتوری درست اجرا می‌شود

## ⚙️ تنظیمات

### در VS Code Settings:
```json
{
    "fastapi-runner.workingDirectory": "src"
}
```

### یا در Command Palette:
1. `Ctrl+Shift+P`
2. `Preferences: Open Settings (JSON)`
3. تنظیمات بالا را اضافه کنید

## 🔧 مثال کامل

### 1. ساختار پروژه
```
my-fastapi-project/
├── src/
│   ├── main.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py
│   └── routes/
│       ├── __init__.py
│       └── auth.py
├── tests/
├── requirements.txt
└── .vscode/
    └── settings.json
```

### 2. تنظیمات VS Code
```json
{
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.defaultFile": "main:app",
    "fastapi-runner.port": 8000
}
```

### 3. کد FastAPI
```python
# src/main.py
from fastapi import FastAPI
from models.user import User
from routes.auth import auth_router

app = FastAPI()

app.include_router(auth_router, prefix="/auth")

@app.get("/")
def read_root():
    return {"message": "Hello from src/main.py"}
```

```python
# src/models/user.py
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str
```

```python
# src/routes/auth.py
from fastapi import APIRouter
from models.user import User

auth_router = APIRouter()

@auth_router.post("/login")
def login(user: User):
    return {"token": "fake-token"}
```

### 4. اجرای Extension
```bash
# Extension خودکار:
Ctrl+Shift+P → "Start FastAPI Server"

# Output:
✓ Virtual environment detected: /path/to/venv
✓ Detected FastAPI file: src/main.py
Working directory: /path/to/project/src
PYTHONPATH: /path/to/project/src
Command: python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## 📊 مقایسه قبل و بعد

### ❌ بدون Working Directory:
```bash
Working directory: /path/to/project
Command: python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
# خطا: ModuleNotFoundError: No module named 'models'
```

### ✅ با Working Directory:
```bash
Working directory: /path/to/project/src
PYTHONPATH: /path/to/project/src
Command: python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
# موفق: همه import ها کار می‌کنند
```

## 🎯 کاربردهای مختلف

### 1. پروژه Simple
```
project/
├── main.py
└── requirements.txt

# تنظیمات:
{
    "fastapi-runner.workingDirectory": ""  # خالی (root)
}
```

### 2. پروژه با src/
```
project/
├── src/
│   └── main.py
└── requirements.txt

# تنظیمات:
{
    "fastapi-runner.workingDirectory": "src"
}
```

### 3. پروژه پیچیده
```
project/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── models/
│   └── requirements.txt
└── frontend/

# تنظیمات:
{
    "fastapi-runner.workingDirectory": "backend/app"
}
```

## 📝 نکات مهم

### 1. Auto-Detection
Extension در working directory دنبال فایل‌های FastAPI می‌کند:
- `main.py`
- `app.py`
- `server.py`

### 2. Requirements.txt
Extension اول در working directory، سپس در root دنبال `requirements.txt` می‌کند:
```
1. src/requirements.txt  ✓
2. ./requirements.txt    ✓
```

### 3. PYTHONPATH
Extension خودکار PYTHONPATH را تنظیم می‌کند:
```bash
PYTHONPATH=/path/to/project/src:/existing/paths
```

### 4. Virtual Environment
Working directory بر virtual environment تأثیر نمی‌گذارد. venv همچنان در root directory جستجو می‌شود.

## 🔧 اشکال‌زدایی

### مشکل: "Working directory does not exist"
```json
{
    "fastapi-runner.workingDirectory": "src"  // بررسی کنید که پوشه src وجود دارد
}
```

### مشکل: "ModuleNotFoundError"
```bash
# بررسی کنید:
1. Working directory درست تنظیم شده؟
2. فایل‌های __init__.py وجود دارند؟
3. Import paths درست هستند؟
```

### مشکل: "No FastAPI file found"
```bash
# Extension در working directory دنبال فایل می‌کند
# اگر فایل در جای دیگری است، از "Select FastAPI File" استفاده کنید
```

## 🎛️ تنظیمات کامل

```json
{
    "fastapi-runner.workingDirectory": "src",
    "fastapi-runner.defaultFile": "main:app",
    "fastapi-runner.host": "127.0.0.1",
    "fastapi-runner.port": 8000,
    "fastapi-runner.reload": true,
    "fastapi-runner.autoDetectVenv": true,
    "fastapi-runner.useModuleMode": true
}
```

## 🔄 Workflow توصیه شده

1. **ساختار پروژه را طراحی کنید**
2. **Working Directory را تنظیم کنید**
3. **Virtual Environment ایجاد کنید**
4. **Dependencies نصب کنید**
5. **کد FastAPI بنویسید**
6. **سرور را اجرا کنید**

---

**حالا پروژه‌های src-based شما کامل کار می‌کنند! 🎉** 