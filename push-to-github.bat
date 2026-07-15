@echo off
setlocal EnableDelayedExpansion
set "REPO=%~dp0"
set "LOGFILE=%~dp0push-log.txt"

echo [%date% %time%] === Push script start === > "%LOGFILE%"
call :run >> "%LOGFILE%" 2>&1
echo [%date% %time%] === Push script end === >> "%LOGFILE%"

echo.
echo ============================================================
echo  Done. Full log saved to:
echo  %LOGFILE%
echo ============================================================
echo.
type "%LOGFILE%"
echo.
echo (If it says SUCCESS, go to Cloudflare next.)
echo (If it says PUSH FAILED, send me this log text.)
pause
exit /b

:run
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
  echo  Look for "git.exe" in:
  echo    C:\Program Files\Git\
  echo    C:\Users\mr hu\AppData\Local\Programs\Git\
  echo    C:\Git\
  echo ============================================================
  exit /b 1
)

echo Using git : %GIT%
echo Folder    : %REPO%
cd /d "%REPO%"

REM --- Make sure this folder is a git repo with the right remote ---
if not exist "%REPO%.git" (
  echo [init] Initializing local repo...
  "%GIT%" init -b main
)
"%GIT%" remote get-url origin >nul 2>&1 || "%GIT%" remote add origin https://github.com/mrhu-fanren/class-video-20280102-news.git

"%GIT%" config user.email "class2news@users.noreply.github.com"
"%GIT%" config user.name "class2-news"
"%GIT%" config --global http.version HTTP/1.1

echo [1/3] Adding and committing...
"%GIT%" add -A
"%GIT%" diff --cached --quiet
if errorlevel 1 (
  "%GIT%" commit -m "update: class news site"
) else (
  echo No new changes to commit.
)

echo [2/3] Pushing to GitHub (will try mirror if direct fails)...
set "REMOTES[0]=https://github.com/mrhu-fanren/class-video-20280102-news.git"
set "REMOTES[1]=https://ghproxy.net/https://github.com/mrhu-fanren/class-video-20280102-news.git"
set "REMOTES[2]=https://mirror.ghproxy.com/https://github.com/mrhu-fanren/class-video-20280102-news.git"
set "REMOTES[3]=https://gitclone.com/github.com/mrhu-fanren/class-video-20280102-news.git"

set "PUSHED=0"
for /L %%r in (0,1,3) do (
  if !PUSHED!==0 (
    echo ------------------------------------------------------------
    echo Trying: !REMOTES[%%r]!
    "%GIT%" remote set-url origin "!REMOTES[%%r]!"
    "%GIT%" push -u origin main --force
    if not errorlevel 1 set PUSHED=1
  )
)

echo ------------------------------------------------------------
if !PUSHED!==1 (
  echo SUCCESS - code is now on GitHub.
  echo Next step: deploy on Cloudflare (see DEPLOY.md step 2).
) else (
  echo PUSH FAILED via all methods.
  echo Your network is blocking GitHub git. Two options:
  echo   A) If you have a proxy/VPN tool (Clash, v2ray, etc.),
  echo      tell me and I will set git to use it.
  echo   B) Or upload via GitHub web (DEPLOY.md method 2).
)
goto :eof
