# Prints a receipt PNG on the default printer with no dialog.
# Called by scripts/exhibit-printer.js during `npm run exhibit` on Windows.
#
# The image is scaled to the printer's own printable width (so it can never
# run off one side, whatever the driver's hard margins are), and the page is
# asked to be as long as the receipt. Drivers that ignore the custom length
# get the receipt continued across pages instead.
param([Parameter(Mandatory = $true)][string]$Path)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($Path)
try {
    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.DocumentName = 'Samsara receipt'
    # StandardPrintController = no "Printing page 1..." status window.
    $doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
    $ps = $doc.DefaultPageSettings
    $ps.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

    $printableW = $ps.PrintableArea.Width          # 1/100 inch
    if ($printableW -le 0) { $printableW = $ps.PaperSize.Width }
    $receiptH = [int][Math]::Ceiling($img.Height * $printableW / $img.Width) + 30
    try {
        $ps.PaperSize = New-Object System.Drawing.Printing.PaperSize('Samsara receipt', [int]$ps.PaperSize.Width, $receiptH)
    } catch { }

    $script:srcY = 0.0
    $doc.add_PrintPage({
        param($sender, $e)
        $area = $e.PageSettings.PrintableArea
        $w = [double]$area.Width
        if ($w -le 0) { $w = [double]$e.PageBounds.Width }
        $h = [double]$area.Height
        if ($h -le 0) { $h = [double]$e.PageBounds.Height }
        $s = $w / $img.Width
        $srcH = [Math]::Min($img.Height - $script:srcY, $h / $s)
        # The PNG is already pure black/white at the head's own 8 dots/mm:
        # copy pixels as they are. Smoothing here would put grey back on every
        # edge, which the driver then halftones into fuzzy text.
        $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
        $dest = New-Object System.Drawing.RectangleF(0, 0, [single]$w, [single]($srcH * $s))
        $src = New-Object System.Drawing.RectangleF(0, [single]$script:srcY, [single]$img.Width, [single]$srcH)
        $e.Graphics.DrawImage($img, $dest, $src, [System.Drawing.GraphicsUnit]::Pixel)
        $script:srcY += $srcH
        $e.HasMorePages = ($script:srcY -lt ($img.Height - 0.5))
    })
    $doc.Print()
} finally {
    $img.Dispose()
}
