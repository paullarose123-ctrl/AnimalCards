# Recadrage des photos sous Windows, quand sharp est bloqué (politique de sécurité du système).
# À lancer entre « telecharger » et « finaliser » :
#   node scripts/photos/telecharger-photos.mjs telecharger
#   powershell -ExecutionPolicy Bypass -File scripts/photos/recadrer.ps1
#   node scripts/photos/telecharger-photos.mjs finaliser
# Chaque photo de tmp/photos/brut est recadrée au format de la fenêtre des cartes (3:4, 540 × 720),
# en gardant le haut de l'image (le visage est presque toujours dans le tiers supérieur), puis
# réenregistrée en JPEG qualité 82. Utilise System.Drawing, inclus dans Windows.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dir = Join-Path $root 'tmp\photos\brut'
$width = 540
$height = 720
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]82)

$files = Get-ChildItem $dir -Filter *.jpg
$done = 0
foreach ($file in $files) {
  try {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $stream = New-Object System.IO.MemoryStream (, $bytes)
    $source = [System.Drawing.Image]::FromStream($stream)

    # orientation EXIF (photos d'appareil tournées)
    if ($source.PropertyIdList -contains 0x0112) {
      switch ($source.GetPropertyItem(0x0112).Value[0]) {
        3 { $source.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
        6 { $source.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
        8 { $source.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
      }
    }

    # zone source au ratio 3:4 : centrée horizontalement, calée vers le haut verticalement
    $ratio = $width / $height
    if ($source.Width / $source.Height -gt $ratio) {
      $cropH = $source.Height
      $cropW = [int]($cropH * $ratio)
      $x = [int](($source.Width - $cropW) / 2)
      $y = 0
    } else {
      $cropW = $source.Width
      $cropH = [int]($cropW / $ratio)
      $x = 0
      $y = [int](($source.Height - $cropH) * 0.15)
    }

    $target = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($source, (New-Object System.Drawing.Rectangle 0, 0, $width, $height), (New-Object System.Drawing.Rectangle $x, $y, $cropW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    $source.Dispose()
    $stream.Dispose()

    $target.Save($file.FullName, $codec, $params)
    $target.Dispose()
  } catch {
    Write-Warning "échec $($file.Name) : $($_.Exception.Message)"
  }
  $done++
  if ($done % 50 -eq 0) { Write-Host "  $done/$($files.Count)" }
}
Write-Host "$($files.Count) photos recadrées en $width × $height"
