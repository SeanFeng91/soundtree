@echo off
chcp 65001 >nul
cls
echo.
echo ===========================================
echo    多杆件振动模拟系统 启动脚本
echo ===========================================
echo.

echo 正在检查系统环境...
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到Python，请先安装Python 3.x
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [成功] Python已安装
python --version

echo.
echo 正在启动本地Web服务器...
echo.
echo 服务器地址：http://localhost:8000
echo 主页面：http://localhost:8000/index.html
echo 测试页面：http://localhost:8000/test.html
echo.
echo 按 Ctrl+C 停止服务器
echo.

start "" "http://localhost:8000"
python -m http.server 8000

pause 