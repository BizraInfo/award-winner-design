# BIZRA KERNEL INSTALLER
# Deploys the .bizra-kernel structure to a target directory

param (
    [string]$TargetDirectory = (Get-Location)
)

$KernelSource = "C:\award-winner-design\.bizra-kernel"
$KernelDest = Join-Path $TargetDirectory ".bizra-kernel"

Write-Host "[BIZRA-INSTALLER] Deploying Kernel to: $TargetDirectory" -ForegroundColor Cyan

if (-not (Test-Path $KernelSource)) {
    Write-Error "Source Kernel not found at $KernelSource"
    exit 1
}

if (-not (Test-Path $KernelDest)) {
    New-Item -ItemType Directory -Path $KernelDest -Force | Out-Null
    Write-Host "  + Created .bizra-kernel directory" -ForegroundColor Green
}

# Copy structure
Copy-Item -Path "$KernelSource\*" -Destination $KernelDest -Recurse -Force

Write-Host "[BIZRA-INSTALLER] Kernel Deployment Complete." -ForegroundColor Cyan
Write-Host "  > Config: $KernelDest\config\core.json"
Write-Host "  > Context: $KernelDest\context\agent_manifest.md"
Write-Host "  > Memory: $KernelDest\memory\local_store.json"
