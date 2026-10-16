# BlockStrike Survival 3D

Game prototipe FPS survival berbasis Three.js, Vite, dan Capacitor Android.

## Fitur yang sudah ada
- Dunia voxel 65 x 65 dengan kontur bukit, pohon, batu, dan blok yang bisa dihancurkan/dipasang.
- Kamera orang pertama, kontrol joystick layar sentuh, kontrol lihat dengan geser, lompat, dan tembak.
- Musuh sederhana yang mengejar pemain dan menyerang dalam jarak dekat.
- Siklus siang/malam, cuaca cerah/hujan.
- HUD kesehatan, waktu, cuaca, simpan lokal, dan reset posisi.
- Bundel Three.js ke dalam aplikasi melalui Vite; setelah build, game tidak memerlukan CDN.

## Prasyarat
- Node.js LTS dan npm.
- Untuk APK: Android Studio + Android SDK. Java/JDK versi yang disarankan Android Studio.

## Jalankan di komputer
```bash
npm install
npm run dev
```
Buka URL lokal yang ditampilkan Vite. Untuk mengetes di HP pada jaringan Wi-Fi yang sama, buka alamat LAN komputer pada port Vite.

## Build web
```bash
npm run build
npm run preview
```
Hasil produksi ada di folder `dist/`.

## Build APK Android
```bash
npm install
npx cap add android
npm run android:sync
npm run android:open
```
Di Android Studio tunggu Gradle selesai, lalu pilih **Build > Build Bundle(s) / APK(s) > Build APK(s)**. APK debug biasanya tersedia di `android/app/build/outputs/apk/debug/`.

Jika folder `android/` sudah ada, jangan jalankan `npx cap add android` lagi; jalankan `npm run android:sync`.

## Pengujian
1. Uji pada browser desktop dan Android.
2. Gerakkan joystick, geser area kanan untuk melihat, tekan lompat dan tembak.
3. Bidik blok lalu gunakan MODE untuk berganti bangun/hancurkan.
4. Dekati musuh untuk menguji serangan dan kesehatan.
5. Ubah cuaca, tunggu siklus siang/malam, lalu uji simpan.
6. Uji pada perangkat Android nyata; performa bergantung GPU, RAM, dan ukuran layar.

## Catatan dan batas prototipe
- Ini adalah game prototipe yang dapat dimainkan, bukan game komersial final. AI musuh, collision medan, inventori, animasi, audio, dan optimasi dunia masih sederhana.
- Target paket 200 MB tidak otomatis tercapai dan tidak diperlukan agar game berjalan. Paket saat ini relatif kecil karena belum menyertakan aset HD besar. Ukuran bisa dinaikkan secara wajar dengan menambah aset tekstur, audio, model, dan level yang memang digunakan.
- Untuk rilis, tambahkan ikon, splash screen, pengujian performa, kebijakan privasi bila mengumpulkan data, serta signing key rilis. Jangan menyertakan aset berhak cipta tanpa izin.
