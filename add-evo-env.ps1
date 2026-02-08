$envVars = @{
    "EVOLUTION_API_URL" = "https://vollpilates-evolution.wehlqk.easypanel.host"
    "EVOLUTION_API_KEY" = "D011D8D0437D-473E-A040-285429ACE89D"
    "EVOLUTION_INSTANCE_NAME" = "vesti2026"
}

foreach ($key in $envVars.Keys) {
    $val = $envVars[$key]
    $tmpFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllBytes($tmpFile, [System.Text.Encoding]::UTF8.GetBytes($val))
    Write-Host "Adding $key..."
    cmd /c "type $tmpFile | npx vercel env add $key production"
    Remove-Item $tmpFile
}

Write-Host "Done!"
