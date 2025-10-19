# Sign Language Learning Platform

Nền tảng học ngôn ngữ ký hiệu Việt Nam với công nghệ AI nhận diện realtime sử dụng YOLO11.

## 🌟 Tính năng

### 1. Nhận diện Realtime
- Nhận diện ký hiệu từ webcam theo thời gian thực
- Hỗ trợ 17 ký hiệu tiếng Việt cơ bản
- Độ chính xác cao với YOLO11 model
- Không cần đăng nhập để thử nghiệm

### 2. Học theo bài (Practice Mode)
- Học từng ký hiệu một cách có hệ thống
- Chấm điểm tự động
- Theo dõi tiến độ học tập
- Phân loại theo độ khó (beginner, intermediate, advanced)

## 🎯 Các ký hiệu được hỗ trợ

1. Ăn
2. Bạn
3. Bạn bè
4. Bao nhiêu
5. Cái gì
6. Cảm ơn
7. Gia đình
8. Khát
9. Khỏe
10. Làm ơn
11. Như thế nào
12. Tạm biệt
13. Tên là
14. Tôi
15. Tuổi
16. Xin chào
17. Xin lỗi

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Tailwind CSS 4
- tRPC (type-safe API)
- Wouter (routing)
- shadcn/ui components

### Backend
- Node.js + Express
- tRPC server
- PostgreSQL (via Drizzle ORM)
- Python 3.11 (YOLO inference)

### AI/ML
- YOLO11 (Ultralytics)
- OpenCV
- Real-time object detection

## 📦 Cài đặt

### Prerequisites
- Node.js 22+
- Python 3.11+
- PostgreSQL database
- pnpm

### 1. Clone repository
```bash
git clone <repository-url>
cd sign-language-learning
```

### 2. Cài đặt dependencies

#### Node.js dependencies
```bash
pnpm install
```

#### Python dependencies
```bash
cd server/ml_models
pip3 install -r requirements.txt
```

### 3. Tải YOLO model

Download model từ Google Drive và đặt vào `server/ml_models/`:
- File: `v10_m_yolo11.pt` (40.5 MB)
- Link: [Google Drive](https://drive.google.com/file/d/1cqFyPMvMb5wAvF-FFUyMmEb6JX_rEFnU/view)

### 4. Cấu hình Environment Variables

Tạo file `.env` với các biến sau:
```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-jwt-secret
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

### 5. Khởi tạo database

```bash
pnpm db:push
```

### 6. Seed vocabulary data

```bash
npx tsx server/seedVocabulary.ts
```

### 7. Chạy development server

```bash
pnpm dev
```

Server sẽ chạy tại: `http://localhost:3000`

## 🚀 Deployment

### Azure Deployment

#### Prerequisites
- Azure account
- Azure CLI installed
- Docker (optional)

#### Steps

1. **Tạo Azure Web App**
```bash
az webapp create \
  --resource-group <resource-group> \
  --plan <app-service-plan> \
  --name <app-name> \
  --runtime "NODE:22-lts"
```

2. **Cấu hình Environment Variables**
```bash
az webapp config appsettings set \
  --resource-group <resource-group> \
  --name <app-name> \
  --settings DATABASE_URL="<connection-string>" \
              JWT_SECRET="<secret>" \
              VITE_APP_ID="<app-id>"
```

3. **Deploy từ GitHub**
```bash
az webapp deployment source config \
  --name <app-name> \
  --resource-group <resource-group> \
  --repo-url <github-repo-url> \
  --branch main \
  --manual-integration
```

4. **Upload YOLO model**
- Sử dụng Azure Storage để lưu trữ model file
- Hoặc upload trực tiếp qua FTP/FTPS

### Database Setup (Azure)

Sử dụng Azure Database for MySQL hoặc TiDB Cloud:

```bash
az mysql flexible-server create \
  --resource-group <resource-group> \
  --name <server-name> \
  --admin-user <admin> \
  --admin-password <password> \
  --sku-name Standard_B1ms
```

## 📁 Cấu trúc dự án

```
sign-language-learning/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Các trang chính
│   │   │   ├── Home.tsx
│   │   │   ├── RealtimeDetection.tsx
│   │   │   └── PracticeMode.tsx
│   │   ├── components/    # UI components
│   │   └── lib/           # tRPC client
├── server/                # Backend
│   ├── routers.ts        # tRPC routes
│   ├── db.ts             # Database queries
│   ├── yoloInference.ts  # YOLO wrapper
│   └── ml_models/        # Python ML service
│       ├── yolo_service.py
│       ├── v10_m_yolo11.pt
│       └── requirements.txt
├── drizzle/              # Database schema
│   └── schema.ts
└── shared/               # Shared types
```

## 🔧 API Endpoints

### Detection
- `detection.detect` - Nhận diện ký hiệu từ ảnh base64
- `detection.getClasses` - Lấy danh sách các lớp

### Vocabulary
- `vocabulary.list` - Lấy tất cả từ vựng
- `vocabulary.getByClassId` - Lấy từ vựng theo class ID

### Progress (Protected)
- `progress.list` - Xem tiến độ học tập
- `progress.getForSign` - Xem tiến độ từng ký hiệu
- `progress.update` - Cập nhật tiến độ

### Session (Protected)
- `session.create` - Tạo phiên học mới
- `session.complete` - Hoàn thành phiên học
- `session.list` - Xem lịch sử

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Sign Language Learning Team

## 🙏 Acknowledgments

- YOLO11 by Ultralytics
- Manus Platform for hosting and authentication
- Vietnamese Sign Language community

---

© 2025 Sign Language Learning Platform. Powered by YOLO11 AI.

