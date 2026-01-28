package services

import (
	"bytes"
	"context"
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

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/golang/freetype"
	"github.com/golang/freetype/truetype"
	"golang.org/x/image/font"
)

type ImageService struct {
	cld  *cloudinary.Cloudinary
	font *truetype.Font
}

type OverlayInfo struct {
	UserName  string
	Timestamp time.Time
	Latitude  float64
	Longitude float64
	Address   string
	Device    string
}

func NewImageService(cloudName, apiKey, apiSecret string) (*ImageService, error) {
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, err
	}

	font, err := loadVietnameseFont()
	if err != nil {
		// Log warning but don't fail, overlay might just not work looking good
		fmt.Printf("Warning: failed to load font: %v\n", err)
	}

	return &ImageService{
		cld:  cld,
		font: font,
	}, nil
}

func (s *ImageService) ProcessAndSaveImage(
	imageFile io.Reader,
	filename string,
	isCheckin bool,
	info OverlayInfo,
) (string, error) {

	img, format, err := image.Decode(imageFile)
	if err != nil {
		return "", err
	}

	// outImg := s.drawOverlay(img, info)
	outImg := img

	subDir := "checkout"
	if isCheckin {
		subDir = "checkin"
	}

	// Create a buffer to store the encoded image
	buf := new(bytes.Buffer)

	// Encode the image to the buffer
	switch format {
	case "png":
		err = png.Encode(buf, outImg)
	default:
		// Default to JPEG
		err = jpeg.Encode(buf, outImg, &jpeg.Options{Quality: 90})
	}

	if err != nil {
		return "", err
	}

	
	dateDir := info.Timestamp.Format("2006-01-02")
	
	
	cleanName := strings.TrimSuffix(filename, filepath.Ext(filename))
	publicID := fmt.Sprintf("attendance/%s/%s/%s_%d", subDir, dateDir, cleanName, time.Now().UnixNano())

	
	uploadResult, err := s.cld.Upload.Upload(
		context.Background(), 
		buf, 
		uploader.UploadParams{
			PublicID: publicID,
			ResourceType: "image",
			Type: "upload",
		},
	)

	if err != nil {
		return "", fmt.Errorf("cloudinary upload failed: %w", err)
	}

	return uploadResult.SecureURL, nil
}



func (s *ImageService) drawOverlay(img image.Image, info OverlayInfo) *image.RGBA {
	bounds := img.Bounds()
	rgba := image.NewRGBA(bounds)
	draw.Draw(rgba, bounds, img, bounds.Min, draw.Src)


	scale := float64(bounds.Dy()) / 1200
	if scale < 0.9 {
		scale = 0.9
	}
	if scale > 1.4 {
		scale = 1.4
	}

	fontSize := 15 * scale
	lineGap := int(30 * scale)
	paddingTop := 24
	paddingBottom := 24
	paddingX := 16

	// ===== FONT FACE (DÙNG ĐỂ ĐO CHỮ) =====
	face := truetype.NewFace(s.font, &truetype.Options{
		Size:    fontSize,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	defer face.Close()

	// ===== SỐ DÒNG =====
	lines := 4
	if info.Address != "" {
		lines++
	}

	overlayHeight := paddingTop + paddingBottom + lines*lineGap

	overlayRect := image.Rect(
		0,
		bounds.Max.Y-overlayHeight,
		bounds.Max.X,
		bounds.Max.Y,
	)

	draw.Draw(
		rgba,
		overlayRect,
		&image.Uniform{color.RGBA{0, 0, 0, 200}},
		image.Point{},
		draw.Over,
	)

	// ===== FREETYPE CONTEXT =====
	c := freetype.NewContext()
	c.SetDPI(72)
	c.SetFont(s.font)
	c.SetFontSize(fontSize)
	c.SetDst(rgba)
	c.SetClip(rgba.Bounds())
	c.SetSrc(image.White)
	c.SetHinting(font.HintingFull)

	y := bounds.Max.Y - overlayHeight + paddingTop
	valueX := paddingX + 120
	maxWidth := bounds.Dx() - valueX - 16

	drawKV(c, paddingX, &y, "NHÂN VIÊN", info.UserName, lineGap)
	drawKV(c, paddingX, &y, "THỜI GIAN",
		info.Timestamp.Format("02/01/2006 15:04:05"), lineGap)

	drawKV(c, paddingX, &y, "VỊ TRÍ",
		fmt.Sprintf("%.6f, %.6f", info.Latitude, info.Longitude), lineGap)

	if info.Address != "" {
		drawLabel(c, paddingX, y, "ĐỊA CHỈ")
		y = drawWrappedText(c, face, valueX, y, maxWidth, info.Address, lineGap)
	}

	drawLabel(c, paddingX, y, "THIẾT BỊ")
	drawWrappedText(c, face, valueX, y, maxWidth, info.Device, lineGap)

	return rgba
}

// ================= HELPERS =================

func drawKV(
	c *freetype.Context,
	x int,
	y *int,
	label, value string,
	lineGap int,
) {
	drawLabel(c, x, *y, label)
	c.DrawString(value, freetype.Pt(x+120, *y))
	*y += lineGap
}

func drawLabel(c *freetype.Context, x, y int, label string) {
	c.DrawString(label, freetype.Pt(x, y))
}

func drawWrappedText(
	c *freetype.Context,
	face font.Face,
	x, y, maxWidth int,
	text string,
	lineGap int,
) int {

	words := strings.Fields(text)
	line := ""

	for _, w := range words {
		test := line
		if test != "" {
			test += " "
		}
		test += w

		width := font.MeasureString(face, test).Round()
		if width > maxWidth {
			c.DrawString(line, freetype.Pt(x, y))
			y += lineGap
			line = w
		} else {
			line = test
		}
	}

	if line != "" {
		c.DrawString(line, freetype.Pt(x, y))
		y += lineGap
	}

	return y
}

// ================= FONT =================

func loadVietnameseFont() (*truetype.Font, error) {
	fonts := []string{
		"C:/Windows/Fonts/arial.ttf",
		"C:/Windows/Fonts/times.ttf",
		"C:/Windows/Fonts/calibri.ttf",
		"C:/Windows/Fonts/segoeui.ttf",
	}

	for _, path := range fonts {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		return truetype.Parse(data)
	}

	return nil, fmt.Errorf("không tìm thấy font hỗ trợ tiếng Việt")
}
