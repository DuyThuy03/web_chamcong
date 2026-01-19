# API Documentation - Manager Endpoints

## Tổng quan
Các API dành cho Trưởng phòng, Quản lý và Giám đốc để quản lý thành viên và xem dữ liệu điểm danh.

### Phân quyền:
- **Trưởng phòng**: Chỉ xem/quản lý thành viên trong phòng của mình
- **Quản lý & Giám đốc**: Xem/quản lý tất cả thành viên và phòng ban

---

## 1. Xem trạng thái điểm danh hôm nay

### Endpoint
```
GET /api/v1/manager/attendance/today
```

### Headers
```
Authorization: Bearer <token>
```

### Phân quyền
- Trưởng phòng, Quản lý, Giám đốc

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "user_name": "Nguyễn Văn A",
      "department_name": "Phòng IT",
      "day": "2026-01-19T00:00:00Z",
      "checkin_time": "2026-01-19T08:00:00Z",
      "checkout_time": null,
      "checkin_image": "http://localhost:8080/uploads/checkin/2026/01/19/image.jpg",
      "checkout_image": null,
      "shift_id": 1,
      "shift_name": "Ca sáng",
      "work_status": "ON_TIME",
      "leave_status": "NONE"
    }
  ]
}
```

---

## 2. Xem lịch sử chấm công của thành viên

### Endpoint
```
GET /api/v1/manager/attendance/member-history
```

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters
| Tham số | Bắt buộc | Mô tả | Ví dụ |
|---------|----------|-------|-------|
| user_id | Có | ID của thành viên | 5 |
| from_date | Không | Ngày bắt đầu (YYYY-MM-DD) | 2026-01-01 |
| to_date | Không | Ngày kết thúc (YYYY-MM-DD) | 2026-01-19 |
| page | Không | Trang (mặc định: 1) | 1 |
| limit | Không | Số bản ghi/trang (mặc định: 20, max: 100) | 20 |

### Phân quyền
- **Trưởng phòng**: Chỉ xem lịch sử của thành viên trong phòng
- **Quản lý & Giám đốc**: Xem lịch sử của bất kỳ thành viên nào

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "user_id": 5,
      "user_name": "Nguyễn Văn A",
      "department_name": "Phòng IT",
      "day": "2026-01-19T00:00:00Z",
      "checkin_time": "2026-01-19T08:00:00Z",
      "checkout_time": "2026-01-19T17:30:00Z",
      "shift_id": 1,
      "shift_name": "Ca sáng",
      "work_status": "ON_TIME",
      "leave_status": "NONE"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

---

## 3. Xem lịch sử chấm công của phòng ban

### Endpoint
```
GET /api/v1/manager/attendance/department-history
```

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters
| Tham số | Bắt buộc | Mô tả | Ví dụ |
|---------|----------|-------|-------|
| department_id | Không* | ID phòng ban | 2 |
| from_date | Không | Ngày bắt đầu (YYYY-MM-DD) | 2026-01-01 |
| to_date | Không | Ngày kết thúc (YYYY-MM-DD) | 2026-01-19 |
| page | Không | Trang (mặc định: 1) | 1 |
| limit | Không | Số bản ghi/trang (mặc định: 20, max: 100) | 20 |

*Lưu ý:
- **Trưởng phòng**: Không cần truyền department_id (tự động lấy phòng của họ)
- **Quản lý & Giám đốc**: Có thể truyền department_id để xem phòng cụ thể, hoặc bỏ qua để xem tất cả

### Response
Giống như endpoint `/member-history`

---

## 4. Lấy danh sách thành viên trong phòng

### Endpoint
```
GET /api/v1/manager/members
```

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters
| Tham số | Bắt buộc | Mô tả | Ví dụ |
|---------|----------|-------|-------|
| department_id | Không* | ID phòng ban | 2 |
| page | Không | Trang (mặc định: 1) | 1 |
| limit | Không | Số bản ghi/trang (mặc định: 20, max: 100) | 20 |

*Lưu ý:
- **Trưởng phòng**: Không cần truyền department_id (tự động lấy phòng của họ)
- **Quản lý & Giám đốc**: Bắt buộc truyền department_id

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "role": "Nhân viên",
      "department_id": 2,
      "department_name": "Phòng IT",
      "status": "Hoạt động",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

## 5. Xem chi tiết thành viên

### Endpoint
```
GET /api/v1/manager/members/:id
```

### Headers
```
Authorization: Bearer <token>
```

### Phân quyền
- **Trưởng phòng**: Chỉ xem thành viên trong phòng
- **Quản lý & Giám đốc**: Xem bất kỳ thành viên nào

### Response
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "date_of_birth": "1990-01-01",
    "address": "Hà Nội",
    "gender": "Nam",
    "phone_number": "0123456789",
    "role": "Nhân viên",
    "department_id": 2,
    "department_name": "Phòng IT",
    "status": "Hoạt động",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-15T00:00:00Z"
  }
}
```

---

## 6. Tạo thành viên mới

### Endpoint
```
POST /api/v1/manager/members
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Phân quyền
**Chỉ Quản lý và Giám đốc**

### Request Body
```json
{
  "name": "Nguyễn Văn B",
  "email": "nguyenvanb@example.com",
  "password": "password123",
  "date_of_birth": "1995-05-15",
  "address": "Hồ Chí Minh",
  "gender": "Nam",
  "phone_number": "0987654321",
  "role": "Nhân viên",
  "department_id": 2
}
```

### Validation
- `name`: Bắt buộc
- `email`: Bắt buộc, phải là email hợp lệ, không trùng
- `password`: Bắt buộc, tối thiểu 6 ký tự
- `role`: Bắt buộc, một trong: "Nhân viên", "Trưởng phòng", "Quản lý", "Giám đốc"
- Các trường khác: Tùy chọn

### Response
```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "Nguyễn Văn B",
    "email": "nguyenvanb@example.com",
    "role": "Nhân viên",
    "department_id": 2,
    "department_name": "Phòng IT",
    "status": "Hoạt động",
    "created_at": "2026-01-19T00:00:00Z"
  }
}
```

---

## 7. Cập nhật thành viên

### Endpoint
```
PUT /api/v1/manager/members/:id
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Phân quyền
- **Trưởng phòng**: Chỉ update thành viên trong phòng (không được đổi role, department, status)
- **Quản lý & Giám đốc**: Update bất kỳ thành viên nào (bao gồm role, department, status)

### Request Body
Tất cả các trường đều tùy chọn:
```json
{
  "name": "Nguyễn Văn B Updated",
  "email": "newemail@example.com",
  "date_of_birth": "1995-05-16",
  "address": "Địa chỉ mới",
  "gender": "Nữ",
  "phone_number": "0999999999",
  "role": "Trưởng phòng",
  "department_id": 3,
  "status": "Không hoạt động"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "Nguyễn Văn B Updated",
    "email": "newemail@example.com",
    "role": "Trưởng phòng",
    "department_id": 3,
    "department_name": "Phòng Nhân sự",
    "status": "Hoạt động",
    "created_at": "2026-01-19T00:00:00Z",
    "updated_at": "2026-01-19T10:30:00Z"
  }
}
```

---

## 8. Xóa thành viên

### Endpoint
```
DELETE /api/v1/manager/members/:id
```

### Headers
```
Authorization: Bearer <token>
```

### Phân quyền
**Chỉ Quản lý và Giám đốc**

### Response
```json
{
  "success": true,
  "data": {
    "message": "Xóa thành viên thành công"
  }
}
```

---

## Mã lỗi thường gặp

### 400 Bad Request
- Thiếu tham số bắt buộc
- Định dạng dữ liệu không hợp lệ
- Email đã tồn tại

### 401 Unauthorized
- Token không hợp lệ hoặc đã hết hạn
- Chưa đăng nhập

### 403 Forbidden
- Không có quyền truy cập
- Trưởng phòng cố gắng truy cập thành viên ngoài phòng
- Trưởng phòng cố gắng tạo/xóa thành viên

### 404 Not Found
- Không tìm thấy thành viên
- Không tìm thấy phòng ban

### 500 Internal Server Error
- Lỗi server

---

## Ví dụ sử dụng với cURL

### 1. Xem điểm danh hôm nay
```bash
curl -X GET "http://localhost:8080/api/v1/manager/attendance/today" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Xem lịch sử chấm công của thành viên
```bash
curl -X GET "http://localhost:8080/api/v1/manager/attendance/member-history?user_id=5&from_date=2026-01-01&to_date=2026-01-19&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Tạo thành viên mới
```bash
curl -X POST "http://localhost:8080/api/v1/manager/members" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn B",
    "email": "nguyenvanb@example.com",
    "password": "password123",
    "role": "Nhân viên",
    "department_id": 2
  }'
```

### 4. Cập nhật thành viên
```bash
curl -X PUT "http://localhost:8080/api/v1/manager/members/10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn B Updated",
    "status": "Hoạt động"
  }'
```

### 5. Xóa thành viên
```bash
curl -X DELETE "http://localhost:8080/api/v1/manager/members/10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Lưu ý quan trọng

1. **Authentication**: Tất cả các API đều yêu cầu token JWT trong header Authorization
2. **Phân quyền**: Mỗi endpoint có quy tắc phân quyền riêng, cần tuân thủ
3. **Pagination**: Sử dụng page và limit để phân trang, tránh load quá nhiều dữ liệu
4. **Date Format**: Tất cả ngày tháng đều theo format ISO 8601 (YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm:ssZ)
5. **Soft Delete**: Khi xóa thành viên, hệ thống chỉ set status = "Không hoạt động", không xóa vĩnh viễn khỏi database
