@echo off
chcp 65001 >nul
echo ================================
echo 多杆振动模拟系统 - 启动检查器
echo ================================
echo.

echo [1/4] 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Python 环境正常
    python --version
) else (
    echo ✗ Python 环境异常，请安装 Python 3.x
    echo   下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)
echo.

echo [2/4] 检查项目文件完整性...
set "files_ok=true"

if exist "index.html" (echo ✓ index.html) else (echo ✗ index.html & set "files_ok=false")
if exist "test.html" (echo ✓ test.html) else (echo ✗ test.html & set "files_ok=false")
if exist "debug.html" (echo ✓ debug.html) else (echo ✗ debug.html & set "files_ok=false")
if exist "simple-test.html" (echo ✓ simple-test.html) else (echo ✗ simple-test.html & set "files_ok=false")
if exist "quick-fix.html" (echo ✓ quick-fix.html) else (echo ✗ quick-fix.html & set "files_ok=false")

echo.
echo 检查 CSS 文件...
if exist "css\local-styles.css" (echo ✓ css/local-styles.css) else (echo ✗ css/local-styles.css & set "files_ok=false")

echo.
echo 检查 JavaScript 文件...
if exist "js\materials.js" (echo ✓ js/materials.js) else (echo ✗ js/materials.js & set "files_ok=false")
if exist "js\vibration-calc.js" (echo ✓ js/vibration-calc.js) else (echo ✗ js/vibration-calc.js & set "files_ok=false")
if exist "js\audio-processor.js" (echo ✓ js/audio-processor.js) else (echo ✗ js/audio-processor.js & set "files_ok=false")
if exist "js\visualization.js" (echo ✓ js/visualization.js) else (echo ✗ js/visualization.js & set "files_ok=false")
if exist "js\rod-manager.js" (echo ✓ js/rod-manager.js) else (echo ✗ js/rod-manager.js & set "files_ok=false")
if exist "js\main.js" (echo ✓ js/main.js) else (echo ✗ js/main.js & set "files_ok=false")
if exist "js\init.js" (echo ✓ js/init.js) else (echo ✗ js/init.js & set "files_ok=false")

if "%files_ok%"=="false" (
    echo.
    echo ✗ 部分文件缺失，请检查项目完整性
    pause
    exit /b 1
) else (
    echo ✓ 所有核心文件完整
)
echo.

echo [3/4] 检查网络连接 (CDN资源)...
ping -n 1 cdnjs.cloudflare.com >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ CDN 网络连接正常
) else (
    echo ⚠ CDN 网络连接异常，但系统已使用本地样式文件
    echo   可能影响 Three.js 和 Plotly.js 加载
)
echo.

echo [4/4] 启动本地服务器...
echo 正在启动 HTTP 服务器 (端口 8000)...
echo.
echo ================================
echo 服务器启动成功！请访问以下地址：
echo ================================
echo 🌐 主页面:    http://localhost:8000/index.html
echo 🧪 测试页面:  http://localhost:8000/test.html
echo 🔧 调试页面:  http://localhost:8000/debug.html
echo ⚡ 快速测试:  http://localhost:8000/simple-test.html
echo 🛠️ 快速修复:  http://localhost:8000/quick-fix.html
echo ================================
echo.
echo 按 Ctrl+C 停止服务器
echo.

python -m http.server 8000
pause 