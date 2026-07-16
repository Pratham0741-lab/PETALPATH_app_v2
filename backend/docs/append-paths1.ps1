$paths = @'

paths:
'@

$paths | Add-Content -Path "D:\petalpath\PETALPATH_app_v2.0\backend\docs\openapi.yaml" -Encoding UTF8
Write-Host "paths section started"
