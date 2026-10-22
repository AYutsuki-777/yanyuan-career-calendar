@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在同步北大就业网数据...
node scripts\update.mjs
echo.
echo 完成。按任意键关闭。
pause >nul
