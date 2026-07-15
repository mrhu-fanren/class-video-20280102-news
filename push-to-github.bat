@echo off
setlocal EnableDelayedExpansion
set "REPO=%~dp0"
set "GIT="

REM --- 1. PATH search ---
for /f "delims=" %%i in ('where git 2^>nul') do (
  if not defined GIT set "GIT=%%i"
)

REM --- 2. Common install locations ---
set "CANDIDATES[0]=%ProgramFiles%\Git\cmd\git.exe"
set "CANDIDATES[1]=%ProgramFiles%\Git\bin\git.exe"
set "CANDIDATES[2]=%ProgramFiles(x86)%\Git\cmd\git.exe"
set "CANDIDATES[3]=%ProgramFiles(x86)%\Git\bin\git.exe"
set "CANDIDATES[4]=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
set "CANDIDATES[5]=%LOCALAPPDATA%\Programs\Git\bin\git.exe"
set "CANDIDATES[6]=%USERPROFILE%\AppData\Local\Programs\Git\cmd\git.exe"
set "CANDIDATES[7]=%LOCALAPPDATA%\Microsoft\WindowsApps\git.exe"
set "CANDIDATES[8]=C:\Git\cmd\git.exe"
set "CANDIDATES[9]=C:\Git\bin\git.exe"
for /L %%n in (0,1,9) do (
  if not defined GIT (
    if exist "!CANDIDATES[%%n]!" set "GIT=!CANDIDATES[%%n]!"
  )
)

REM --- 3. Recursive fallback on likely roots ---
if not defined GIT (
  for %%r in ("%ProgramFiles%" "%ProgramFiles(x86)%" "C:\Git" "%LOCALAPPDATA%") do (
    if not defined GIT (
      for /f "delims=" %%i in ('where /R "%%~r" git.exe 2^>nul') do (
        if not defined GIT set "GIT=%%i"
      )
    )
  )
)

REM --- Verify the found git actually runs ---
if defined GIT (
  "%GIT%" --version >nul 2>&1
  if errorlevel 1 set "GIT="
)

if "%GIT%"=="" (
  echo ============================================================
  echo  Could NOT find git.exe anywhere on this computer.
  echo  Please tell me the output below so I can locate it:
  echo ------------------------------------------------------------
  echo PROGRAMFILES   = %ProgramFiles%
  echo LOCALAPPDATA   = %LOCALAPPDATA%
  echo Look for "git.exe" in:
  echo   C:\Program Files\Git\
  echo   C:\Users\mr hu\AppData\Local\Programs\Git\
  echo   C:\Git\
  echo ============================================================
  pause
  exit /b 1
)

echo Using git : %GIT%
echo Folder    : %REPO%
cd /d "%REPO%"

REM --- Make sure this folder is a git repo with the right remote ---
if not exist "%REPO%.git" (
  echo [init] Initializing local repo...
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
