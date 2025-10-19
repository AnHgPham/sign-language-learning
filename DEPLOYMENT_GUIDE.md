# Hướng dẫn Deploy lên Azure

## 📋 Yêu cầu

- Azure account với subscription đang hoạt động
- Azure CLI đã cài đặt: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
- GitHub repository đã có code: https://github.com/AnHgPham/sign-language-learning

## 🚀 Các bước Deploy

### Bước 1: Đăng nhập Azure CLI

```bash
az login
```

Chọn subscription nếu có nhiều:
```bash
az account list --output table
az account set --subscription "<subscription-id>"
```

### Bước 2: Tạo Resource Group

```bash
az group create \
  --name sign-language-rg \
  --location southeastasia
```

### Bước 3: Tạo Azure Database for MySQL

#### Option A: Azure Database for MySQL Flexible Server (Khuyến nghị)

```bash
# Tạo MySQL server
az mysql flexible-server create \
  --resource-group sign-language-rg \
  --name sign-language-db \
  --location southeastasia \
  --admin-user adminuser \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 8.0

# Cho phép truy cập từ Azure services
az mysql flexible-server firewall-rule create \
  --resource-group sign-language-rg \
  --name sign-language-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Tạo database
az mysql flexible-server db create \
  --resource-group sign-language-rg \
  --server-name sign-language-db \
  --database-name signlanguage
```

**Connection String:**
```
mysql://adminuser:YourSecurePassword123!@sign-language-db.mysql.database.azure.com:3306/signlanguage?ssl=true
```

#### Option B: TiDB Cloud (Alternative - Free tier available)

1. Truy cập: https://tidbcloud.com/
2. Tạo cluster mới (chọn Serverless tier - Free)
3. Copy connection string

### Bước 4: Tạo App Service Plan

```bash
az appservice plan create \
  --name sign-language-plan \
  --resource-group sign-language-rg \
  --location southeastasia \
  --sku B1 \
  --is-linux
```

**Giá tham khảo:**
- B1 (Basic): ~$13/tháng
- S1 (Standard): ~$70/tháng (khuyến nghị cho production)

### Bước 5: Tạo Web App

```bash
az webapp create \
  --resource-group sign-language-rg \
  --plan sign-language-plan \
  --name sign-language-app \
  --runtime "NODE:22-lts"
```

**Lưu ý:** Tên app phải unique trên toàn Azure, nếu bị trùng hãy đổi tên khác.

### Bước 6: Cấu hình Environment Variables

```bash
az webapp config appsettings set \
  --resource-group sign-language-rg \
  --name sign-language-app \
  --settings \
    DATABASE_URL="mysql://adminuser:YourSecurePassword123!@sign-language-db.mysql.database.azure.com:3306/signlanguage?ssl=true" \
    JWT_SECRET="$(openssl rand -base64 32)" \
    NODE_ENV="production" \
    VITE_APP_ID="your-manus-app-id" \
    OAUTH_SERVER_URL="https://api.manus.im" \
    VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
```

### Bước 7: Cài đặt Python Runtime

Azure Web App cần cả Node.js và Python. Tạo file startup script:

```bash
# Tạo startup.sh trong dự án
cat > startup.sh << 'EOF'
#!/bin/bash

# Install Python dependencies
cd /home/site/wwwroot/server/ml_models
python3.11 -m pip install -r requirements.txt

# Start Node.js app
cd /home/site/wwwroot
npm start
EOF

# Upload startup script
az webapp config set \
  --resource-group sign-language-rg \
  --name sign-language-app \
  --startup-file "startup.sh"
```

### Bước 8: Deploy từ GitHub

#### Option A: GitHub Actions (Khuyến nghị)

```bash
# Tạo deployment credentials
az webapp deployment source config \
  --name sign-language-app \
  --resource-group sign-language-rg \
  --repo-url https://github.com/AnHgPham/sign-language-learning \
  --branch main \
  --git-token <YOUR_GITHUB_TOKEN>
```

Hoặc setup GitHub Actions workflow:

1. Lấy publish profile:
```bash
az webapp deployment list-publishing-profiles \
  --name sign-language-app \
  --resource-group sign-language-rg \
  --xml
```

2. Thêm secret `AZURE_WEBAPP_PUBLISH_PROFILE` vào GitHub repo

3. Tạo file `.github/workflows/azure-deploy.yml`:
```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
    
    - name: Install dependencies
      run: |
        npm install -g pnpm
        pnpm install
    
    - name: Build
      run: pnpm build
    
    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: sign-language-app
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

#### Option B: Deploy trực tiếp từ local

```bash
# Build project
pnpm build

# Deploy
az webapp deployment source config-zip \
  --resource-group sign-language-rg \
  --name sign-language-app \
  --src dist.zip
```

### Bước 9: Upload YOLO Model

YOLO model file (40.5 MB) quá lớn để push lên Git. Có 2 cách:

#### Option A: Azure Storage (Khuyến nghị)

```bash
# Tạo Storage Account
az storage account create \
  --name signlanguagestorage \
  --resource-group sign-language-rg \
  --location southeastasia \
  --sku Standard_LRS

# Tạo container
az storage container create \
  --name models \
  --account-name signlanguagestorage \
  --public-access blob

# Upload model
az storage blob upload \
  --account-name signlanguagestorage \
  --container-name models \
  --name v10_m_yolo11.pt \
  --file server/ml_models/v10_m_yolo11.pt

# Lấy URL
az storage blob url \
  --account-name signlanguagestorage \
  --container-name models \
  --name v10_m_yolo11.pt
```

Sau đó update code để download model từ Azure Storage khi khởi động.

#### Option B: FTP Upload

```bash
# Lấy FTP credentials
az webapp deployment list-publishing-credentials \
  --name sign-language-app \
  --resource-group sign-language-rg

# Upload qua FTP client (FileZilla, WinSCP, etc.)
# Đường dẫn: /site/wwwroot/server/ml_models/v10_m_yolo11.pt
```

### Bước 10: Chạy Database Migration

```bash
# SSH vào Web App
az webapp ssh \
  --resource-group sign-language-rg \
  --name sign-language-app

# Trong SSH session:
cd /home/site/wwwroot
pnpm db:push
npx tsx server/seedVocabulary.ts
```

Hoặc chạy từ local với connection string:

```bash
DATABASE_URL="<azure-connection-string>" pnpm db:push
DATABASE_URL="<azure-connection-string>" npx tsx server/seedVocabulary.ts
```

### Bước 11: Kiểm tra Deployment

```bash
# Xem logs
az webapp log tail \
  --resource-group sign-language-rg \
  --name sign-language-app

# Mở browser
az webapp browse \
  --resource-group sign-language-rg \
  --name sign-language-app
```

URL của bạn: `https://sign-language-app.azurewebsites.net`

## 🔧 Troubleshooting

### Lỗi: Python dependencies không cài được

**Giải pháp:** Thêm Python buildpack

```bash
az webapp config set \
  --resource-group sign-language-rg \
  --name sign-language-app \
  --linux-fx-version "NODE|22-lts"

# Hoặc sử dụng Docker
```

### Lỗi: YOLO model không load được

**Nguyên nhân:** File quá lớn hoặc path không đúng

**Giải pháp:**
1. Kiểm tra file tồn tại: `ls -lh /home/site/wwwroot/server/ml_models/`
2. Kiểm tra quyền: `chmod 644 v10_m_yolo11.pt`
3. Sử dụng Azure Storage như hướng dẫn ở Bước 9

### Lỗi: Database connection timeout

**Giải pháp:**
1. Kiểm tra firewall rules
2. Thêm IP của Web App vào whitelist:
```bash
# Lấy outbound IPs
az webapp show \
  --resource-group sign-language-rg \
  --name sign-language-app \
  --query outboundIpAddresses

# Thêm vào firewall
az mysql flexible-server firewall-rule create \
  --resource-group sign-language-rg \
  --name sign-language-db \
  --rule-name AllowWebApp \
  --start-ip-address <ip> \
  --end-ip-address <ip>
```

### Lỗi: Out of memory

**Giải pháp:** Upgrade App Service Plan

```bash
az appservice plan update \
  --name sign-language-plan \
  --resource-group sign-language-rg \
  --sku S1
```

## 💰 Chi phí ước tính (USD/tháng)

| Service | Tier | Cost |
|---------|------|------|
| App Service | B1 Basic | $13 |
| MySQL Flexible | B1ms | $12 |
| Storage (model) | Standard LRS | $1 |
| **Total** | | **~$26/tháng** |

**Khuyến nghị cho production:**
- App Service: S1 ($70)
- MySQL: B2s ($50)
- Total: ~$120/tháng

## 🔐 Security Checklist

- [ ] Đổi admin password mạnh cho database
- [ ] Tạo JWT_SECRET ngẫu nhiên
- [ ] Bật HTTPS only
- [ ] Cấu hình CORS đúng
- [ ] Giới hạn IP access cho database
- [ ] Enable Application Insights
- [ ] Setup backup cho database

## 📊 Monitoring

```bash
# Enable Application Insights
az monitor app-insights component create \
  --app sign-language-insights \
  --location southeastasia \
  --resource-group sign-language-rg

# Link to Web App
az webapp config appsettings set \
  --resource-group sign-language-rg \
  --name sign-language-app \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<key>"
```

## 🔄 CI/CD Pipeline

Đã setup GitHub Actions workflow tại `.github/workflows/azure-deploy.yml`

Mỗi khi push lên `main` branch, code sẽ tự động deploy lên Azure.

## 📞 Support

Nếu gặp vấn đề, liên hệ:
- GitHub Issues: https://github.com/AnHgPham/sign-language-learning/issues
- Azure Support: https://portal.azure.com

---

**Lưu ý quan trọng:**
- YOLO model cần Python 3.11 và các dependencies trong `requirements.txt`
- Webcam chỉ hoạt động trên HTTPS (Azure tự động cung cấp SSL)
- Database cần ít nhất 1GB RAM để chạy ổn định

