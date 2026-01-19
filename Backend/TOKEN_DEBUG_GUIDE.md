# Hướng dẫn khắc phục lỗi Token

## Vấn đề phát hiện:

### 1. Token đã hết hạn ❌

- **Token issued**: 15/01/2026 01:34:08
- **Token expires**: 16/01/2026 01:34:08
- **Current time**: 19/01/2026 10:16:55
- **Status**: Đã hết hạn 3 ngày trước

### 2. Lỗi encoding role ⚠️

- Role trong token: `"Qu?n ly"` (sai)
- Đúng phải là: `"Quản lý"`
- Nguyên nhân: Lỗi encoding Unicode khi tạo token

---

## Giải pháp:

### Bước 1: Đăng nhập lại để lấy token mới

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "a@gmail.com",
    "password": "your_password"
  }'
```

Hoặc sử dụng Postman/Thunder Client để gọi API login.

### Bước 2: Sử dụng token mới

Token mới sẽ có thời hạn 24 giờ từ thời điểm đăng nhập.

---

## Kiểm tra JWT Secret

Nếu vẫn gặp lỗi sau khi lấy token mới, hãy kiểm tra JWT Secret trong config:

1. Mở file `.env` hoặc config
2. Xác nhận JWT_SECRET giống với secret đã dùng để tạo token
3. Đảm bảo không có khoảng trắng hoặc ký tự đặc biệt không mong muốn

---

## Debug với log mới

Sau khi đã thêm logging, khi bạn gọi API với token, bạn sẽ thấy log chi tiết:

```
[AUTH] Validating token: eyJhbGciOiJIUzI1NiI...
[AUTH] JWT Secret length: 32
[JWT] Starting token validation...
[JWT] Token string length: 189
[JWT] Secret length: 32
[JWT] Token signing method: HS256
[JWT] Token parsed successfully
[JWT] Token Valid: true/false
[JWT] Claims extracted - UserID: 11, Email: a@gmail.com, Role: Quản lý
[JWT] Token expires at: 2026-01-20 10:00:00
[JWT] Current time: 2026-01-19 10:16:55
```

Nếu token hết hạn, log sẽ hiển thị:

```
[JWT] Token has expired!
[AUTH] Token validation failed: token expired
```

---

## Test token mới

Sau khi lấy token mới, test với:

```bash
curl -X GET http://localhost:8080/api/v1/manager/attendance/today \
  -H "Authorization: Bearer YOUR_NEW_TOKEN"
```

Token mới sẽ có:

- Role đúng encoding: `"Quản lý"`
- Thời gian hết hạn: 24 giờ kể từ lúc login
- Chữ ký hợp lệ với JWT Secret hiện tại
