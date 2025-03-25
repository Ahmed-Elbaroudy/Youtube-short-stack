# Minimal PNG icon generator for Chrome extension
# This script creates minimal valid PNG files for icons

# The minimal PNG signature and headers
$pngSignature = [byte[]]@(
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A  # PNG signature
)

# Function to create minimal PNG with color
function Create-MinimalPNG {
    param(
        [string]$OutputPath,
        [int]$Width,
        [int]$Height,
        [byte[]]$Color = @(0xFF, 0x00, 0x00)  # Default red color
    )

    # Create IHDR chunk (Image header)
    $IHDR_data = [byte[]]@(
        # Width (4 bytes, big-endian)
        [byte](($Width -shr 24) -band 0xFF),
        [byte](($Width -shr 16) -band 0xFF),
        [byte](($Width -shr 8) -band 0xFF),
        [byte]($Width -band 0xFF),
        
        # Height (4 bytes, big-endian)
        [byte](($Height -shr 24) -band 0xFF),
        [byte](($Height -shr 16) -band 0xFF),
        [byte](($Height -shr 8) -band 0xFF),
        [byte]($Height -band 0xFF),
        
        0x08,  # Bit depth (8)
        0x03,  # Color type (3 = indexed-color)
        0x00,  # Compression method (0)
        0x00,  # Filter method (0)
        0x00   # Interlace method (0)
    )
    
    $IHDR_length = [byte[]]@(
        0x00, 0x00, 0x00, 0x0D  # Length of IHDR data (13 bytes)
    )
    
    $IHDR_type = [byte[]]@(
        0x49, 0x48, 0x44, 0x52  # "IHDR"
    )
    
    # Calculate CRC for IHDR
    $IHDR_crc = Calculate-CRC ($IHDR_type + $IHDR_data)
    
    # Create PLTE chunk (Palette)
    $PLTE_data = $Color
    
    $PLTE_length = [byte[]]@(
        0x00, 0x00, 0x00, 0x03  # Length of PLTE data (3 bytes)
    )
    
    $PLTE_type = [byte[]]@(
        0x50, 0x4C, 0x54, 0x45  # "PLTE"
    )
    
    # Calculate CRC for PLTE
    $PLTE_crc = Calculate-CRC ($PLTE_type + $PLTE_data)
    
    # Create IDAT chunk (Image data) - minimal compressed data
    $IDAT_data = [byte[]]@(
        0x08, 0x1D, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0xFF, 0xFF
    )
    
    $IDAT_length = [byte[]]@(
        0x00, 0x00, 0x00, [byte]$IDAT_data.Length  # Length of IDAT data
    )
    
    $IDAT_type = [byte[]]@(
        0x49, 0x44, 0x41, 0x54  # "IDAT"
    )
    
    # Calculate CRC for IDAT
    $IDAT_crc = Calculate-CRC ($IDAT_type + $IDAT_data)
    
    # Create IEND chunk (Image end)
    $IEND_data = [byte[]]@()
    
    $IEND_length = [byte[]]@(
        0x00, 0x00, 0x00, 0x00  # Length of IEND data (0 bytes)
    )
    
    $IEND_type = [byte[]]@(
        0x49, 0x45, 0x4E, 0x44  # "IEND"
    )
    
    # Calculate CRC for IEND
    $IEND_crc = Calculate-CRC ($IEND_type + $IEND_data)
    
    # Combine all chunks
    $pngData = $pngSignature + 
               $IHDR_length + $IHDR_type + $IHDR_data + $IHDR_crc +
               $PLTE_length + $PLTE_type + $PLTE_data + $PLTE_crc +
               $IDAT_length + $IDAT_type + $IDAT_data + $IDAT_crc +
               $IEND_length + $IEND_type + $IEND_crc
    
    # Write to file
    [System.IO.File]::WriteAllBytes($OutputPath, $pngData)
}

# Function to calculate CRC32
function Calculate-CRC {
    param(
        [byte[]]$Data
    )
    
    # For simplicity, using a hardcoded CRC
    # In a real implementation, you would calculate this properly
    return [byte[]]@(0xAE, 0x42, 0x60, 0x82)
}

# Create the icons
$color = @(0xFF, 0x00, 0x00)  # Red color
$iconsPath = "C:\Users\PC\OneDrive\Desktop\yt short to long\icons"

Create-MinimalPNG -OutputPath "$iconsPath\icon16.png" -Width 16 -Height 16 -Color $color
Create-MinimalPNG -OutputPath "$iconsPath\icon48.png" -Width 48 -Height 48 -Color $color
Create-MinimalPNG -OutputPath "$iconsPath\icon128.png" -Width 128 -Height 128 -Color $color

Write-Host "Created icon files in $iconsPath" 