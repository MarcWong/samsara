@echo off
chcp 65001 >nul
title Samsara 展场 - 不要关闭这个窗口
cd /d "%~dp0"
call npm run exhibit
pause
