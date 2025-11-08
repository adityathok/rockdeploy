# Rock Deploy

Deployment script untuk Rock application (frontend & backend).

## Cara Penggunaan

### Basic Deployment
```bash
cd rockdeploy
npm run deploy
```

### Clean Deployment Files
```bash
npm run deploy:clean
```

## Alur Deploy

Script ini akan menjalankan proses berikut:

1. **Build Frontend**
   - Menjalankan `npm run build:prod` di folder `rockdash`
   - Meng-copy file `rockdash/.output/build.zip` ke `rockdeploy/dist/frontend/build.zip`

2. **Build Backend**
   - Menjalankan `npm run build` di folder `rockapi`
   - Meng-copy file `rockapi/.dist/build.zip` ke `rockdeploy/dist/backend/build.zip`

3. **Summary**
   - Menampilkan informasi file build dan ukuran
   - Siap untuk upload ke server

## Struktur Folder

```
rockdeploy/
├── deploy.js           # Main deployment script
├── package.json        # NPM configuration
├── dist/
│   ├── frontend/
│   │   └── build.zip   # Frontend build hasil
│   └── backend/
│       └── build.zip   # Backend build hasil
└── README.md           # Dokumentasi
```

## Requirements

- Node.js dan NPM terinstall
- Akses ke folder rockdash dan rockapi
- Script build di kedua project sudah tersedia

## Error Handling

Script akan berhenti dan menampilkan error jika:
- Build process gagal
- File zip tidak ditemukan setelah build
- Proses copy file gagal