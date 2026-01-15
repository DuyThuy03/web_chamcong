package services

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang/freetype"
	"github.com/golang/freetype/truetype"
    "golang.org/x/image/font"

)

type ImageService struct {
    uploadDir string
    font      *truetype.Font
}

func NewImageService(uploadDir string) (*ImageService, error) {
    // Create upload directories
    checkinDir := filepath.Join(uploadDir, "checkin")
    checkoutDir := filepath.Join(uploadDir, "checkout")
    
    if err := os.MkdirAll(checkinDir, 0755); err != nil {
        return nil, err
    }
    if err := os.MkdirAll(checkoutDir, 0755); err != nil {
        return nil, err
    }

    // Load font - Try Windows fonts that support Vietnamese
    font, err := loadVietnameseFont()
    if err != nil {
        return nil, err
    }

    return &ImageService{
        uploadDir: uploadDir,
        font:      font,
    }, nil
}

type OverlayInfo struct {
    UserName  string
    Timestamp time.Time
    Latitude  float64
    Longitude float64
    Address   string
    Device    string
}

func (s *ImageService) ProcessAndSaveImage(
    imageFile io.Reader,
    filename string,
    isCheckin bool,
    info OverlayInfo,
) (string, error) {
    // Decode image
    img, format, err := image.Decode(imageFile)
    if err != nil {
        return "", fmt.Errorf("failed to decode image: %w", err)
    }

    // Draw overlay on image
    imgWithOverlay := s.drawOverlay(img, info)

    // Generate path
    subDir := "checkout"
    if isCheckin {
        subDir = "checkin"
    }
    
    dateDir := info.Timestamp.Format("2006/01/02")
    fullDir := filepath.Join(s.uploadDir, subDir, dateDir)
    if err := os.MkdirAll(fullDir, 0755); err != nil {
        return "", err
    }

    // Save file
    ext := filepath.Ext(filename)
    if ext == "" {
        ext = "." + format
    }
    
    savedFilename := fmt.Sprintf("%s_%d%s", 
        strings.TrimSuffix(filename, ext),
        time.Now().UnixNano(),
        ext,
    )
    
    fullPath := filepath.Join(fullDir, savedFilename)
    outFile, err := os.Create(fullPath)
    if err != nil {
        return "", err
    }
    defer outFile.Close()

    // Encode and save
    switch format {
    case "jpeg", "jpg":
        err = jpeg.Encode(outFile, imgWithOverlay, &jpeg.Options{Quality: 90})
    case "png":
        err = png.Encode(outFile, imgWithOverlay)
    default:
        err = jpeg.Encode(outFile, imgWithOverlay, &jpeg.Options{Quality: 90})
    }

    if err != nil {
        return "", err
    }

    // Return relative path
    relativePath := filepath.Join(subDir, dateDir, savedFilename)
    return relativePath, nil
}

func (s *ImageService) drawOverlay(img image.Image, info OverlayInfo) *image.RGBA {
    bounds := img.Bounds()
    rgba := image.NewRGBA(bounds)
    draw.Draw(rgba, bounds, img, bounds.Min, draw.Src)

    // Create semi-transparent overlay at bottom
    overlayHeight := 150
    overlayRect := image.Rect(0, bounds.Max.Y-overlayHeight, bounds.Max.X, bounds.Max.Y)
    overlayColor := color.RGBA{0, 0, 0, 180} // Semi-transparent black
    draw.Draw(rgba, overlayRect, &image.Uniform{overlayColor}, image.Point{}, draw.Over)

    // Draw text
    c := freetype.NewContext()
    c.SetDPI(72)
    c.SetFont(s.font)
    c.SetFontSize(14)
    c.SetClip(rgba.Bounds())
    c.SetDst(rgba)
    c.SetSrc(image.White)
    c.SetHinting(font.HintingFull)

    // Draw information
    y := bounds.Max.Y - overlayHeight + 20
    lines := []string{
        fmt.Sprintf("Nhân viên: %s", info.UserName),
        fmt.Sprintf("Thời gian: %s", info.Timestamp.Format("02/01/2006 15:04:05")),
        fmt.Sprintf("Vị trí: %.6f, %.6f", info.Latitude, info.Longitude),
    }
    
    if info.Address != "" {
        lines = append(lines, fmt.Sprintf("Địa chỉ: %s", info.Address))
    }
    
    lines = append(lines, fmt.Sprintf("Thiết bị: %s", truncateString(info.Device, 50)))

    for _, line := range lines {
        pt := freetype.Pt(10, y)
        c.DrawString(line, pt)
        y += 22
    }

    return rgba
}

func truncateString(s string, maxLen int) string {
    runes := []rune(s)
    if len(runes) <= maxLen {
        return s
    }
    return string(runes[:maxLen-3]) + "..."
}


// loadVietnameseFont loads a font that supports Vietnamese characters
func loadVietnameseFont() (*truetype.Font, error) {
    // Try different Windows fonts in order of preference
    fontPaths := []string{
        "C:/Windows/Fonts/arial.ttf",           // Arial
        "C:/Windows/Fonts/arialbd.ttf",         // Arial Bold
        "C:/Windows/Fonts/times.ttf",           // Times New Roman
        "C:/Windows/Fonts/timesbd.ttf",         // Times New Roman Bold
        "C:/Windows/Fonts/calibri.ttf",         // Calibri
        "C:/Windows/Fonts/segoeui.ttf",         // Segoe UI
    }

    var lastErr error
    for _, fontPath := range fontPaths {
        fontBytes, err := os.ReadFile(fontPath)
        if err != nil {
            lastErr = err
            continue
        }

        font, err := truetype.Parse(fontBytes)
        if err != nil {
            lastErr = err
            continue
        }

        return font, nil
    }

    return nil, fmt.Errorf("không tìm thấy font hỗ trợ tiếng Việt: %v", lastErr)
}