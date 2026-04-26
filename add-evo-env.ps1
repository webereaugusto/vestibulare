$envVars = @{
    "EVOLUTION_API_URL" = "https://sua-evolution-api.example.com"
    "EVOLUTION_API_KEY" = "sua-chave-da-evolution"
    "EVOLUTION_INSTANCE_NAME" = "zapvest"
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
