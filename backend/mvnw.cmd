@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.
@REM Maven Wrapper startup batch script, version 3.3.2
@REM ----------------------------------------------------------------------------
@IF "%__MVNW_ARG0_NAME__%"=="" (SET __MVNW_ARG0_NAME__=%~nx0)
@SET __MVNW_CMD__=
@SET __MVNW_ERROR__=
@SET __MVNW_PWSH_SESSION_FILE__=%TEMP%\%__MVNW_ARG0_NAME__%-%RANDOM%-pwsh.session
@IF NOT "%MVNW_REPOURL%" == "" (SET MVNW_REPOURL=%MVNW_REPOURL%)
@SET MVNW_REPOURL=https://repo.maven.apache.org/maven2

@SET WRAPPER_PROPERTIES_PATH=%~dp0.mvn\wrapper\maven-wrapper.properties

@powershell -NonInteractive -ExecutionPolicy Bypass -Command ^
  "$props = Get-Content -Raw '%WRAPPER_PROPERTIES_PATH%' | ConvertFrom-StringData; " ^
  "$distUrl = $props.distributionUrl; " ^
  "$mvnHome = $env:USERPROFILE + '\.m2\wrapper\dists'; " ^
  "$wrapperJar = $mvnHome + '\maven-wrapper.jar'; " ^
  "if (-not (Test-Path $mvnHome)) { New-Item -ItemType Directory -Path $mvnHome -Force | Out-Null }; " ^
  "if (-not (Test-Path $wrapperJar)) { " ^
    "$wrapperUrl = $props.wrapperUrl; " ^
    "Invoke-WebRequest -Uri $wrapperUrl -OutFile $wrapperJar -UseBasicParsing " ^
  "}; " ^
  "$mavenZip = $env:TEMP + '\apache-maven.zip'; " ^
  "$mavenDistDir = $mvnHome + '\apache-maven-3.9.9'; " ^
  "if (-not (Test-Path $mavenDistDir)) { " ^
    "Invoke-WebRequest -Uri $distUrl -OutFile $mavenZip -UseBasicParsing; " ^
    "Expand-Archive $mavenZip $mvnHome -Force; " ^
    "Remove-Item $mavenZip " ^
  "}; " ^
  "$mvnExe = (Get-ChildItem -Path $mvnHome -Filter 'mvn.cmd' -Recurse | Select-Object -First 1).FullName; " ^
  "& $mvnExe %*
