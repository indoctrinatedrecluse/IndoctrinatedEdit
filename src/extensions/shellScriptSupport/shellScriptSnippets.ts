import { SnippetDefinition } from '../extensionTypes'

// 1. Bash / Zsh / POSIX Shell Snippets
export const BASH_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'sh-strict-header',
    detail: 'Bash / Sh: Strict Safety Header (set -euo pipefail)',
    documentation: 'Production-grade Bash script header with strict error checking, trap cleanup, and directory discovery',
    insertText: '#!/usr/bin/env bash\nset -euo pipefail\nIFS=$\'\\n\\t\'\n\nreadonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"\nreadonly LOG_FILE="${SCRIPT_DIR}/execution.log"\n\ncleanup() {\n    local exit_code=$?\n    if [[ $exit_code -ne 0 ]]; then\n        echo "❌ [Error]: Script failed with exit code ${exit_code}" >&2\n    fi\n}\ntrap cleanup EXIT\n\necho "✨ [IndoctrinatedEdit] Shell Script Running from ${SCRIPT_DIR}"\n$0',
  },
  {
    label: 'sh-cli-getopts',
    detail: 'Bash: Robust CLI Argument Parser with getopts',
    documentation: 'Standard shell CLI flag parser with short/long options, help message, and validation',
    insertText: 'usage() {\n    cat <<EOF\nUsage: $(basename "$0") [-h] [-v] [-e ENV] [-p PORT]\n\nOptions:\n  -h, --help       Show this help message\n  -v, --verbose    Enable verbose debug logging\n  -e, --env ENV    Target environment (dev, staging, prod)\n  -p, --port PORT  Server listen port (default: 8080)\nEOF\n    exit 1\n}\n\nENV="dev"\nPORT=8080\nVERBOSE=false\n\nwhile [[ $# -gt 0 ]]; do\n    case "$1" in\n        -h|--help) usage ;;\n        -v|--verbose) VERBOSE=true ; shift ;;\n        -e|--env) ENV="$2" ; shift 2 ;;\n        -p|--port) PORT="$2" ; shift 2 ;;\n        *) echo "Unknown option: $1" >&2 ; usage ;;\n    esac\ndone\n\necho "Running in ${ENV} mode on port ${PORT}"\n$0',
  },
  {
    label: 'sh-spinner-progress',
    detail: 'Bash: Terminal Spinner Animation for Long Running Tasks',
    documentation: 'Interactive terminal loading spinner animation in pure bash',
    insertText: 'spin() {\n    local pid=$1\n    local delay=0.1\n    local spinstr=\'|/-\\\'\n    while [ "$(ps a | awk \'{print $1}\' | grep "$pid")" ]; do\n        local temp=${spinstr#?}\n        printf " [%c]  " "$spinstr"\n        local spinstr=$temp${spinstr%"$temp"}\n        sleep $delay\n        printf "\\b\\b\\b\\b\\b\\b"\n    done\n    printf "    \\b\\b\\b\\b"\n}\n\n(${1:sleep 3}) &\nspin $!\necho "✅ Task completed successfully!"\n$0',
  },
]

// 2. PowerShell Snippets
export const POWERSHELL_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'ps-advanced-function',
    detail: 'PowerShell: Advanced Cmdlet Function ([CmdletBinding()])',
    documentation: 'PowerShell advanced function with parameter attributes, pipeline input, and shouldProcess support',
    insertText: 'function ${1:Invoke-IndoctrinatedAction} {\n    [CmdletBinding(SupportsShouldProcess = $true)]\n    param(\n        [Parameter(Mandatory = $true, Position = 0, ValueFromPipeline = $true)]\n        [ValidateNotNullOrEmpty()]\n        [string]$TargetName,\n\n        [Parameter()]\n        [ValidateSet("Debug", "Release", "Bench")]\n        [string]$Configuration = "Release",\n\n        [switch]$Force\n    )\n\n    begin {\n        Write-Verbose "Starting execution pipeline for $TargetName ($Configuration)"\n    }\n\n    process {\n        if ($PSCmdlet.ShouldProcess($TargetName, "Execute Build Action")) {\n            [PSCustomObject]@{\n                Timestamp     = [DateTime]::UtcNow.ToString("o")\n                Target        = $TargetName\n                Configuration = $Configuration\n                Status        = "Success"\n            }\n        }\n    }\n\n    end {\n        Write-Verbose "Pipeline complete."\n    }\n}\n$0',
  },
  {
    label: 'ps-rest-api-call',
    detail: 'PowerShell: Invoke-RestMethod with JSON Headers & Error Handling',
    documentation: 'PowerShell modern REST API invocation with JSON body, auth headers, and try/catch',
    insertText: 'try {\n    $headers = @{\n        "Content-Type"  = "application/json"\n        "Authorization" = "Bearer $env:API_TOKEN"\n    }\n\n    $body = @{\n        service = "${1:IndoctrinatedEdit}"\n        status  = "online"\n    } | ConvertTo-Json -Depth 5\n\n    $response = Invoke-RestMethod -Uri "${2:https://api.example.com/v1/status}" -Method Post -Headers $headers -Body $body -TimeoutSec 15\n    $response | Format-Table -AutoSize\n} catch {\n    Write-Error "API invocation failed: $_"\n}\n$0',
  },
]

// 3. Batch / CMD Snippets
export const BATCH_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'bat-header',
    detail: 'Batch: Safe CMD Script Header with Admin Elevation Check',
    documentation: 'Windows Batch script header with local scope, echo off, and errorlevel check',
    insertText: '@echo off\nsetlocal enabledelayedexpansion\n\ntitle IndoctrinatedEdit Automation\ncd /d "%~dp0"\n\necho [INFO] Initializing Windows Script environment...\n\nREM Check administrative privileges\nnet session >nul 2>&1\nif %errorlevel% neq 0 (\n    echo [WARN] Not running as Administrator.\n)\n\n$0',
  },
]

export const shellScriptSnippets: SnippetDefinition[] = [
  ...BASH_SNIPPETS,
  ...POWERSHELL_SNIPPETS,
  ...BATCH_SNIPPETS,
]
