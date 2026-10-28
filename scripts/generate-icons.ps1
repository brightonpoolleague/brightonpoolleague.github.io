Add-Type -AssemblyName System.Drawing
$rootDir = (Get-Item .).FullName
$srcPath = Join-Path $rootDir "static/logo.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

foreach ($s in 192, 512) {
    $dest = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $s, $s)
    $outPath = Join-Path $rootDir "static/pwa-$s.png"
    $dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    Write-Host "Generated $outPath"
}
$src.Dispose()
