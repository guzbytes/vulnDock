# ================================
#        vulnDock CLI v1.0
# ================================
# Lightweight Vulnerability Lab Setup Tool
# Author: Adrian Guzman
# Date: 30-05-2026
# -------------------------------


# Variables 

$validOsOptions = @("linux", "windows")
$validDbOptions = @("mysql", "postgres", "mssql")
$validLangOptions = @("javascript", "java", "python", "php", "csharp")

$dockerfilesDb = @{
    "windows" = @{
        "mysql" = "Docker/DockerfileMySQLWin"
        "postgres" = "Docker/DockerfilePostgresWin"
        "mssql" = "Docker/DockerfileMSSQL"
    }
    "linux" = @{
        "mysql" = "Docker/DockerfileMySQL"
        "postgres" = "Docker/DockerfilePostgres"
        "mssql" = "Docker/DockerfileMSSQL"
    }
}

$dockerfilesWeb = @{
    "windows" = @{
        "php" = "Docker/DockerfilePHPWin"
        "javascript" = "Docker/DockerfileJsWin"
        "java" = "Docker/DockerfileJavaWin"
        "csharp" = "Docker/DockerfileAspnetWin"
        "python" = "Docker/DockerfilePythonWin"
    }
    "linux" = @{
        "php" = "Docker/DockerfilePHP"
        "javascript" = "Docker/DockerfileJs"
        "csharp" = "Docker/DockerfileAspnet"
        "java" = "Docker/DockerfileJava"
        "python" = "Docker/DockerfilePython"
    }
}

$dbVersions = @{
    "linux" = @{
        "mysql"    = @("5.7", "8.0.36", "8.4.3")
        "postgres" = @("9.6","12", "16", "17", "17.5")
        "mssql"    = @("2017-latest", "2019-latest", "2022-latest")
    }
    "windows" = @{
        "mysql"    = @("5.7.13", "8.0.36", "8.4.3")
        "postgres" = @("17.5-1","14.13-1", "16.4-1")
        "mssql"    = @("ltsc2019", "ltsc2022", "2022-latest")
    }
}

$webVersions = @{
    "linux" = @{
        "javascript" = @("21-alpine", "20-alpine", "18-alpine")       
        "python"     = @("3-slim", "3.10-alpine", "3.11-alpine")
        "php"        = @("7.4", "8.2")
        "java"       = @("21", "17")       
        "csharp"     = @("8.0")            
    }
    "windows" = @{
        "javascript" = @("20.8.1", "22.22.2", "18.20.1", "24.15.0")       
        "python"     = @("3.9.3", "3.11.7")
        "php"        = @("8.4.8")  
        "java"       = @("21-jdk", "17-jdk")
        "csharp"     = @("8.0-windowsservercore-ltsc2022", "8.0-windowsservercore-ltsc2019")            
    }
}

$backendFolders = @{ "php" = ".\PHPWebapp"; "javascript" = ".\NodeJSWebapp"; "java" = ".\JavaWebapp"; "csharp" = ".\ASPNETWebapp"; "python" = ".\PythonWebapp" }
$relativeConnectorPaths = @{ "php" = "services"; "javascript" = "."; "java" = "app\src\main\java\com\webapp\app"; "csharp" = "Services"; "python" = "." }
$extensions = @{ "php" = "php"; "javascript" = "js"; "java" = "java"; "csharp" = "cs"; "python" = "py" }




function Show-Help {
    Show-Banner
    Write-Host "Usage: vulnDock.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  --os-system <linux|windows>       Specify the operating system"
    Write-Host "  --database <mysql|postgres|mssql> Specify the database"
    Write-Host "  --language <javascript|java|python|php|csharp> Specify the programming language"
    Write-Host "  --help                           Show this help message"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\vulnDock.ps1 --os-system linux --database mysql --language python"
    exit 0
}


function Prompt-Choice($prompt, $options) {
    Write-Host $prompt
    for ($j = 0; $j -lt $options.Length; $j++) {
        Write-Host "$($j+1)) $($options[$j])"
    }
    Write-Host ""
    do {
        $choice = Read-Host "Enter your choice (1-$($options.Length))"
    } while (-not ($choice -match '^[1-9][0-9]*$') -or $choice -lt 1 -or $choice -gt $options.Length)
    return $options[$choice - 1]
}

# Parse command line arguments manually to allow --flag value style
function Replace-DbConnector {
    param(
        [string]$language,
        [string]$database
    )

    if (-not $backendFolders.ContainsKey($language) -or
        -not $relativeConnectorPaths.ContainsKey($language) -or
        -not $extensions.ContainsKey($language)) {
        Write-Warning "Language not supported: $language"
        return
    }

    $backendRoot = $backendFolders[$language]
    $relativePath = $relativeConnectorPaths[$language]
    $ext = $extensions[$language]

    $connectorDir = if ($relativePath -eq ".") { $backendRoot } else { Join-Path $backendRoot $relativePath }

    $sourceFile = Join-Path $connectorDir "$database.$ext"
    $destinationFile = Join-Path $connectorDir "DatabaseConnector.$ext"


    if (-not (Test-Path $sourceFile)) {
        Write-Warning "Source file not found: $sourceFile"
        return
    }

    Write-Host "Copying $sourceFile -> $destinationFile"
    Copy-Item -Path $sourceFile -Destination $destinationFile -Force
}

function Remove-DbConnector {
    param(
        [string]$language,
        [string]$database
    )

    if (-not $backendFolders.ContainsKey($language) -or
        -not $relativeConnectorPaths.ContainsKey($language) -or
        -not $extensions.ContainsKey($language)) {
        Write-Warning "Language not supported: $language"
        return
    }

    $backendRoot = $backendFolders[$language]
    $relativePath = $relativeConnectorPaths[$language]
    $ext = $extensions[$language]

    $connectorDir = if ($relativePath -eq ".") {
        $backendRoot
    } else {
        Join-Path $backendRoot $relativePath
    }

    $destinationFile = Join-Path $connectorDir "DatabaseConnector.$ext"

    if (-not (Test-Path $destinationFile)) {
        Write-Warning "DatabaseConnector file not found: $destinationFile"
        return
    }

    Write-Host "Removing $destinationFile"

    Remove-Item -Path $destinationFile -Force
}

function Build-DockerComposeDynamic {
    param($os, $db, $lang)
    $dockerfileDb = $dockerfilesDb[$os][$db]
    $dockerfileWeb = $dockerfilesWeb[$os][$lang]
    return @"
services:
  db:
    build:
      context: .
      dockerfile: $dockerfileDb
      args:
        DB_VERSION: $dbVersion
    hostname: db
    ports:
      - "$(if ($db -eq "mssql") {"1433"} elseif ($db -eq "postgres") {"5432"} else {"3306"}):$(if ($db -eq "mssql") {"1433"} elseif ($db -eq "postgres") {"5432"} else {"3306"})"

  web:
    build:
      context: .
      dockerfile: $dockerfileWeb
      args:
        WEB_VERSION: "$webVersion"
    ports:
      - "80:80"
    depends_on:
      - db
"@
}

function Inicialize-Docker {
    docker info > $null 2>&1
    $dockerRunning = ($LASTEXITCODE -eq 0)

    if (-not $dockerRunning) {
        Write-Warning "Docker does not appear to be running."
        $answer = Read-Host "Do you want to start Docker now? (y/n)"
        if ($answer -eq 'y') {
            Write-Host "Attempting to start Docker..."

            # Start Docker Desktop (Windows only)
            start "C:\Program Files\Docker\Docker\Docker Desktop.exe"

            # Wait for it to start (retry loop)
            $maxAttempts = 20
            $attempt = 0
            do {
                Start-Sleep -Seconds 3
                try {
                    docker info > $null 2>&1
                    $dockerRunning = $true
                } catch {
                    $dockerRunning = $false
                }
                $attempt++
            } while (-not $dockerRunning -and $attempt -lt $maxAttempts)

            if ($dockerRunning) {
                Write-Host "Docker is now running."
            } else {
                Write-Error "Docker could not be started automatically. Please start it manually and try again."
                exit 1
            }
        } else {
            Write-Host "Docker is required. Exiting script."
            exit 1
        }
    }
}

function Ensure-DockerEngineMatchesOSSystem {
    param (
        [string]$osSystem
    )

    $dockerInfo = docker info
    if ($dockerInfo -match "OSType: linux") {
        $dockerEngine = "linux"
    } elseif ($dockerInfo -match "OSType: windows") {
        $dockerEngine = "windows"
    } else {
        Write-Warning "Could not determine current Docker engine."
        return
    }

    if ($dockerEngine -ne $osSystem) {
        Write-Warning "Docker is running on '$dockerEngine' engine, but the script expects '$osSystem'."

        $switchCmd = if ($osSystem -eq "linux") {
            "& 'C:\Program Files\Docker\Docker\DockerCli.exe' -SwitchLinuxEngine"
        } elseif ($osSystem -eq "windows") {
            "& 'C:\Program Files\Docker\Docker\DockerCli.exe' -SwitchWindowsEngine"
        } else {
            Write-Error "Invalid target engine: $osSystem"
            return
        }

        $confirm = Read-Host "Do you want to switch Docker to '$osSystem' engine? (y/n)"
        if ($confirm -eq 'y') {
            Write-Host "Switching Docker engine to $osSystem..."
            Invoke-Expression $switchCmd
            Write-Host "Docker is switching engines. Please wait and restart this script afterward."
        } else {
            Write-Warning "Docker engine not changed. The script may not work correctly."
        }
    }
}
    

Clear-Host

# Banner ASCII "vulnDock"
$banner = @'
             _       ____             _    
__   ___   _| |_ __ |  _ \  ___   ___| | __
\ \ / / | | | | '_ \| | | |/ _ \ / __| |/ /
 \ V /| |_| | | | | | |_| | (_) | (__|   < 
  \_/  \__,_|_|_| |_|____/ \___/ \___|_|\_\
                                            
'@

Write-Host $banner -ForegroundColor Cyan

Write-Host "==========================================="
Write-Host "        Lightweight Vulnerability Lab       "
Write-Host "==========================================="

$osSystem = Prompt-Choice "Select OS:" $validOsOptions
$database = Prompt-Choice "Select DB:" $validDbOptions
$language = Prompt-Choice "Select Language:" $validLangOptions
# DB version
$dbVersionChoice = Prompt-Choice "Select DB version (default: $($dbVersions[$osSystem][$database][0])):" ($dbVersions[$osSystem][$database] + @("custom"))
if ($dbVersionChoice -eq "custom") {
    $dbVersion = Read-Host "Enter custom DB version(no guarantee it will work correctly)"
} else {
    $dbVersion = $dbVersionChoice
}

# Web version
$webVersionChoice = Prompt-Choice "Select Web version (default: $($webVersions[$osSystem][$language][0])):" ($webVersions[$osSystem][$language] + @("custom"))
if ($webVersionChoice -eq "custom") {
    $webVersion = Read-Host "Enter custom Web version(no guarantee it will work correctly)"
} else {
    $webVersion = $webVersionChoice
}
$composeContent = Build-DockerComposeDynamic -os $osSystem -db $database -lang $language -dbVer $dbVersion -webVer $webVersion
Replace-DbConnector -language $language -database $database

Set-Content -Path "docker-compose.yml" -Value $composeContent -Encoding UTF8
Write-Host "Generated docker-compose.yml"
Write-Host "Starting Docker..."

Inicialize-Docker
Sleep 10
Ensure-DockerEngineMatchesOSSystem -osSystem $osSystem
sleep 10
#$deployTime = (Measure-Command { docker compose up -d }).TotalSeconds Not used for lossing the output

$start = Get-Date
docker compose build --no-cache
docker compose up -d
#docker compose up -d 
$deployTime = ((Get-Date) - $start).TotalSeconds
Write-Host "Deployment completed in $deployTime seconds."
Write-Host "Press 'q' to quit and cleanup..."

while ($true) {
    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($key.Character -eq 'q') {
        Write-Host "`n'q' pressed. Cleaning up..."
        $deleteContainer = Read-Host "Delete Docker container? (Y/N)"
        if ($deleteContainer.ToUpper() -eq 'Y') {
            docker-compose down --volumes --remove-orphans
        } else {
            docker-compose stop
        }
        $deleteImg = Read-Host "Delete Docker images? (Y/N)"        
        if ($deleteImg.ToUpper() -eq 'Y') {
            docker rmi -f vulndock-db vulndock-web
        }
        rm .\docker-compose.yml
        Remove-DbConnector -language $language -database $database   
        break
    }
}