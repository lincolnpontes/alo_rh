param([int]$Porta = 49317)
$ErrorActionPreference = 'Stop'
$env:PORT = $Porta
& node (Join-Path $PSScriptRoot 'scripts\servir-local.cjs')
