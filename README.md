# Rock Deploy

Deployment script untuk Rock application (frontend & backend).

## Cara Penggunaan

### Full Deployment (Build + FTP Upload)
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

4. **FTP Upload**
   - Upload backend build ke `remotePathBackend` (sesuai config di server.json)
   - Upload frontend build ke `remotePathFrontend` (sesuai config di server.json)
   - Progress upload ditampilkan dengan detail

5. **Final Summary**
   - Konfirmasi semua file berhasil diupload
   - Informasi lokasi upload di server

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

## Konfigurasi Server

Buat file `server.json` berdasarkan `server-example.json`:

```json
{
  "host": "your-domain.com",
  "protocol": "ftp",
  "port": 21,
  "username": "ftp-username",
  "password": "ftp-password",
  "remotePathFrontend": "domains/your-domain.com/public_html",
  "remotePathBackend": "domains/your-domain.com/laravel"
}
```

## Requirements

- Node.js dan NPM terinstall
- Akses ke folder rockdash dan rockapi
- Script build di kedua project sudah tersedia
- Konfigurasi FTP di `server.json`

## Error Handling

Script akan berhenti dan menampilkan error jika:
- Build process gagal
- File zip tidak ditemukan setelah build
- Proses copy file gagal
- `server.json` tidak ditemukan atau tidak valid
- Koneksi FTP gagal
- Upload file gagal

## Fitur Tambahan

- **Progress indicators**: Menampilkan progress untuk setiap step
- **File size tracking**: Menampilkan ukuran file build
- **Error handling**: Detail error message untuk troubleshooting
- **Colored output**: Output berwarna untuk kemudahan membaca
- **Automatic retry**: FTP upload dengan error handling