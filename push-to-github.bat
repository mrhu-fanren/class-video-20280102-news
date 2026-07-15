@echo off
setlocal
set "REPO=%~dp0"
set "GIT="

REM --- Try to locate git.exe (Git for Windows may not be in PATH for cmd) ---
for /f "delims=" %%i in ('where git 2^>nul') do (
  if not defined GIT set "GIT=%%i"
)
if exist "%ProgramFiles%\Git\cmd\git.exe" set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" set "GIT=%ProgramFiles(x86)%\Git\cmd\git.exe"
if exist "%ProgramFiles%\Git\bin\git.exe" set "GIT=%ProgramFiles%\Git\bin\git.exe"
if exist "%ProgramFiles(x86)%\Git\bin\git.exe" set "GIT=%ProgramFiles(x86)%\Git\bin\git.exe"

if "%GIT%"=="" (
  echo ============================================================
  echo  Git was not found on this computer.
  echo  Option A: install "Git for Windows" from https://git-scm.com
  echo  Option B: upload files via GitHub web (see DEPLOY.md, method 2)
  echo ============================================================
  pause
  exit /b 1
)

echo Using git : %GIT%
echo Folder   : %REPO%
cd /d "%REPO%"

REM --- Make sure this folder is a git repo with the right remote ---
if not exist "%REPO%.git" (
  echo [init] No local repo found. Initializing...
  "%GIT%" init -b main
  "%GIT%" remote add origin https://github.com/mrhu-fanren/class-video-20280102-news.git
) else (
  "%GIT%" remote get-url origin >nul 2>&1 || "%GIT%" remote add origin https://github.com/mrhu-fanren/class-video-20280102-news.git
)

"%GIT%" config user.email "class2news@users.noreply.github.com"
"%GIT%" config user.name "class2-news"

REM --- Optional: skip pull with "skip-pull" argument ---
if "%~1"=="skip-pull" (
  echo [skip] pull skipped
) else (
  echo [1/3] Pulling latest from GitHub...
  "%GIT%" pull origin main --allow-unrelated-histories --no-edit
)

echo [2/3] Adding and committing...
"%GIT%" add -A
"%GIT%" diff --cached --quiet
if errorlevel 1 (
  "%GIT%" commit -m "update: class news site"
) else (
  echo No new changes to commit.
)

echo [3/3] Pushing to GitHub...
"%GIT%" push -u origin main

echo.
echo If a URL or "Create a pull request" appeared above, it worked.
echo Next step: deploy on Cloudflare (see DEPLOY.md step 2).
pause
