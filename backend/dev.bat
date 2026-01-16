@echo off

REM Set the path to the C# compiler (csc.exe). Adjust this path if necessary.
set CSC_PATH="C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"

REM Check if the compiler exists
if not exist %CSC_PATH% (
  echo Error: C# compiler not found at %CSC_PATH%.
  exit /b 1
)

REM Set the source file and output executable name
set SOURCE_FILE=GameServer.cs
set OUTPUT_FILE=GameServer.exe
if exist %OUTPUT_FILE% (
  del %OUTPUT_FILE%
)
REM Compile the C# file
%CSC_PATH% /out:%OUTPUT_FILE% %SOURCE_FILE%

REM Check if the compilation succeeded
if exist %OUTPUT_FILE% (
  echo Compilation succeeded. Output: %OUTPUT_FILE%
  echo Running %OUTPUT_FILE%...
  %OUTPUT_FILE%
  set EXIT_CODE=%ERRORLEVEL%
  echo Program exited with code: %EXIT_CODE%
) else (
  echo Compilation failed.
  exit /b 1
)
