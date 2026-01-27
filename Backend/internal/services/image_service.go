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

type OverlayInfo struct {
	UserName  string
	Timestamp time.Time
	Latitude  float64
	Longitude float64
	Address   string
	Device    string
}

func NewImageService(uploadDir string) (*ImageService, error) {
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, err
	}

	font, err := loadVietnameseFont()
	if err != nil {
		return nil, err
	}

	return &ImageService{
		uploadDir: uploadDir,
		font:      font,
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

	dateDir := info.Timestamp.Format("2006/01/02")
	fullDir := filepath.Join(s.uploadDir, subDir, dateDir)
	if err := os.MkdirAll(fullDir, 0755); err != nil {
		return "", err
	}

	ext := filepath.Ext(filename)
	if ext == "" {
		ext = "." + format
	}

	name := fmt.Sprintf(
		"%s_%d%s",
		strings.TrimSuffix(filename, ext),
		time.Now().UnixNano(),
		ext,
	)

	fullPath := filepath.Join(fullDir, name)
	f, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	switch format {
	case "png":
		err = png.Encode(f, outImg)
	default:
		err = jpeg.Encode(f, outImg, &jpeg.Options{Quality: 90})
	}

	if err != nil {
		return "", err
	}

	return filepath.Join(subDir, dateDir, name), nil
}

// ================= OVERLAY =================

func (s *ImageService) drawOverlay(img image.Image, info OverlayInfo) *image.RGBA {
	bounds := img.Bounds()
	rgba := image.NewRGBA(bounds)
	draw.Draw(rgba, bounds, img, bounds.Min, draw.Src)

	// ===== SCALE AN TOÀN CHO ẢNH ĐIỆN THOẠI =====
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
