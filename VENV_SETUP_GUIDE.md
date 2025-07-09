# راهنمای Virtual Environment برای FastAPI Runner

## 🚀 قابلیت‌های جدید

Extension حالا از **Virtual Environment** پشتیبانی کامل می‌کند:

- ✅ **Auto-detection** محیط‌های مجازی
- ✅ **Create Virtual Environment** از داخل VS Code
- ✅ **Install Dependencies** خودکار
- ✅ **Module Mode** برای اجرای بهتر (`python -m uvicorn`)

## 📋 مراحل راه‌اندازی

### گام 1: ایجاد Virtual Environment

#### روش 1: از طریق Extension
```bash
# در VS Code:
Ctrl+Shift+P → "Create Virtual Environment"
# نام venv را وارد کنید (مثلاً venv)
```

#### روش 2: Manual
```bash
# در terminal:
python3 -m venv venv
# یا
python -m venv venv
```

### گام 2: نصب Dependencies

#### روش 1: از طریق Extension
```bash
# در VS Code:
Ctrl+Shift+P → "Install FastAPI Dependencies"
# خودکار fastapi و uvicorn نصب می‌شود
```

#### روش 2: Manual
```bash
# فعال کردن venv:
source venv/bin/activate  # Linux/Mac
# یا
venv\Scripts\activate     # Windows

# نصب packages:
pip install fastapi uvicorn[standard]
```

### گام 3: اجرای FastAPI
```bash
# در VS Code:
Ctrl+Shift+P → "Start FastAPI Server"
# یا کلیک روی status bar
```

## ⚙️ تنظیمات Virtual Environment

### تنظیمات خودکار
```json
{
    "fastapi-runner.autoDetectVenv": true,
    "fastapi-runner.useModuleMode": true
}
```

### تنظیمات دستی
```json
{
    "fastapi-runner.venvPath": "/path/to/your/venv",
    "fastapi-runner.pythonPath": "/path/to/your/venv/bin/python",
    "fastapi-runner.uvicornPath": "/path/to/your/venv/bin/uvicorn"
}
```

## 🔍 تشخیص خودکار

Extension این مسیرها را بررسی می‌کند:
- `./venv/`
- `./env/`
- `./.venv/`
- `./.env/`
- `./virtualenv/`
- `$VIRTUAL_ENV` (environment variable)

## 📊 نظارت بر Virtual Environment

### Output Channel
```
FastAPI Runner
─────────────────────────────────────────────
✓ Virtual environment detected: /path/to/venv
✓ Detected FastAPI file: main.py
Python path: /path/to/venv/bin/python
Command: /path/to/venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Status Bar
- `○ FastAPI: Stopped` - کلیک برای شروع
- `▶ FastAPI: Running :8000` - سرور در حال اجرا

## 🛠️ مثال کامل

### 1. ایجاد پروژه جدید
```bash
mkdir my-fastapi-app
cd my-fastapi-app
code .
```

### 2. ایجاد Virtual Environment
```bash
# در VS Code:
Ctrl+Shift+P → "Create Virtual Environment"
# نام: venv
```

### 3. نصب Dependencies
```bash
# در VS Code:
Ctrl+Shift+P → "Install FastAPI Dependencies"
```

### 4. ایجاد فایل FastAPI
```python
# main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
```

### 5. اجرای سرور
```bash
# در VS Code:
Ctrl+Shift+P → "Start FastAPI Server"
```

## 🔧 اشکال‌زدایی

### مشکل: "uvicorn command not found"
**حل:** Extension خودکار از `python -m uvicorn` استفاده می‌کند

### مشکل: "No virtual environment found"
**حل:** از `Create Virtual Environment` استفاده کنید

### مشکل: "Permission denied"
**حل:** مطمئن شوید که Python و pip نصب هستند

### مشکل: "Module not found"
**حل:** از `Install FastAPI Dependencies` استفاده کنید

## 📝 مثال پیشرفته

### requirements.txt
```
fastapi>=0.68.0
uvicorn[standard]>=0.15.0
python-multipart>=0.0.5
pydantic>=1.8.0
```

### پروژه ساختاریافته
```
my-app/
├── venv/                    # Virtual environment
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI app
│   └── models/
│       └── __init__.py
├── requirements.txt
└── .vscode/
    └── settings.json
```

### تنظیمات VS Code
```json
{
    "fastapi-runner.defaultFile": "app.main:app",
    "fastapi-runner.autoDetectVenv": true,
    "fastapi-runner.useModuleMode": true,
    "fastapi-runner.port": 8000
}
```

## 🎯 نکات مهم

1. **همیشه Virtual Environment استفاده کنید** - برای جلوگیری از تداخل packages
2. **Module Mode فعال باشد** - برای سازگاری بهتر
3. **requirements.txt ایجاد کنید** - برای مدیریت dependencies
4. **Output Channel را بررسی کنید** - برای مشاهده جزئیات

## 🔄 Workflow توصیه شده

1. `Create Virtual Environment`
2. `Install FastAPI Dependencies`
3. کد FastAPI بنویسید
4. `Start FastAPI Server`
5. توسعه و تست
6. `Stop FastAPI Server` در پایان

---

**حالا مشکل "uvicorn not found" برطرف شده است! 🎉** 