# 🖼️ Image Upload System - Complete Setup Guide

## Overview

The image upload system has been restructured for better security and architecture. All image upload functionality is now handled by the backend, with the frontend providing a clean interface.

## 🔧 Backend Setup (Required)

### 1. Environment Configuration

Your backend `.env` file now includes:

```env
# Image Upload Configuration
IMGBB_API_KEY=YOUR_IMGBB_API_KEY
IMGBB_API_URL=https://api.imgbb.com/1/upload

# Upload Settings
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp
```

### 2. Get Free ImgBB API Key

1. Visit [ImgBB API](https://api.imgbb.com/)
2. Create a free account (no payment required)
3. Go to your dashboard
4. Copy your API key
5. Replace `YOUR_IMGBB_API_KEY` in `.env` with your actual key

### 3. Backend Dependencies Added

These packages were automatically installed:

- `multer` - File upload handling
- `axios` - HTTP requests
- `form-data` - FormData support
- `dotenv` - Environment variables (already existed)

### 4. New Backend API Endpoints

- **POST** `/api/images/upload` - Upload files
- **POST** `/api/images/validate-url` - Validate image URLs
- **GET** `/api/images/config` - Get upload configuration

## 🎯 How It Works

### With API Key Configured:

✅ Users can upload files (drag & drop)  
✅ Users can paste URLs  
✅ Backend validates everything  
✅ Secure file handling

### Without API Key:

✅ Users can paste URLs  
✅ Backend validates URLs  
✅ Shows suggestions for free hosting  
❌ File upload disabled

## 🚀 Frontend Features

### Smart Interface:

- **Tabs**: File upload + URL input
- **Auto-config**: Adapts based on backend capabilities
- **Validation**: Real-time feedback
- **Responsive**: Works on all devices

### User Experience:

- Drag & drop files
- Click to browse files
- Paste image URLs
- Live image preview
- Progress indicators
- Helpful error messages

## 🔒 Security Benefits

- ✅ No API keys in frontend code
- ✅ Server-side file validation
- ✅ Controlled file types and sizes
- ✅ URL validation and sanitization
- ✅ Environment-based configuration

## 📋 File Changes Made

### Backend:

- ✅ `.env` - Added upload configuration
- ✅ `imageRoutes.js` - New API routes
- ✅ `index.js` - Added image routes
- ✅ `package.json` - Added dependencies

### Frontend:

- ✅ `ImageUpload.vue` - Complete rewrite for backend API
- ✅ `imageConfig.js` - Updated for backend endpoints
- ✅ `AddProductForm.vue` - Updated to use new component

## 🎮 Testing

### Test Without API Key:

1. Start both frontend and backend
2. Try adding a product
3. Should see only "URL slike" tab
4. Can paste image URLs and see preview

### Test With API Key:

1. Add your ImgBB API key to `.env`
2. Restart backend server
3. Should see both "Učitaj sliku" and "URL slike" tabs
4. Can upload files or paste URLs

## 🛠️ Configuration Options

### Change File Size Limit:

```env
MAX_FILE_SIZE=5242880  # 5MB instead of 10MB
```

### Restrict File Types:

```env
ALLOWED_FILE_TYPES=image/jpeg,image/png  # Only JPG and PNG
```

## 🚨 Troubleshooting

### "Učitavanje datoteka nije omogućeno"

- API key not set in `.env`
- Invalid API key
- Backend server not running

### CORS Errors:

- Check frontend URL in CORS config
- Make sure both servers are running

### File Too Large:

- Check `MAX_FILE_SIZE` setting
- ImgBB free tier has 32MB limit

## 🎯 Next Steps

1. **Get ImgBB API key** (5 minutes, free)
2. **Add to `.env` file**
3. **Restart backend server**
4. **Test file upload** ✨

The system works immediately with URL input, and file upload is just an API key away!
