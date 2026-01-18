# 📅 Abonelik Takvimi (Subscription Calendar)

Modern, performant ve kullanıcı dostu bir masaüstü abonelik takip uygulaması. Yaklaşan ödemelerinizi takip edin, harcamalarınızı analiz edin ve bildirimlerle gününde haberdar olun.

![App Icon](app-icon.png)

## 🚀 Özellikler

- **Abonelik Yönetimi**: Netflix, Spotify, AWS gibi aboneliklerinizi ekleyin, düzenleyin ve kategorize edin.
- **Akıllı Takvim Görünümü**: Aylık ödemelerinizi takvim üzerinde görselleştirin.
- **Masaüstü Bildirimleri**: Ödeme günü yaklaşan abonelikler için Windows masaüstü bildirimi alın.
- **Karanlık & Aydınlık Mod**: Sistem temanıza uyumlu veya manuel olarak değiştirilebilir modern arayüz.
- **Detaylı Analiz**: Aylık toplam harcamanızı ve yaklaşan ödemelerinizi anlık görün.
- **Güvenli & Yerel**: Tüm verileriniz yerel cihazınızda (SQLite) şifreli olarak saklanır. Buluta veri göndermez.
- **Yedekleme**: Verilerinizi JSON formatında dışa aktarın ve geri yükleyin.

## 🛠️ Teknolojiler

Bu proje, modern web teknolojilerini native performans ile birleştirir:

- **Core**: [Tauri v2](https://tauri.app) (Rust + Webview)
- **Frontend**: [React](https://react.dev), [TypeScript](https://www.typescriptlang.org)
- **UI Framework**: [TailwindCSS](https://tailwindcss.com), [Shadcn/UI](https://ui.shadcn.com)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: SQLite (via `tauri-plugin-sql`)
- **Build Tool**: [Vite](https://vitejs.dev), [pnpm](https://pnpm.io)

## 📦 Kurulum (Release)

En güncel sürümü **Releases** sayfasından indirebilirsiniz.

- **Windows**: `.msi` veya `.exe` dosyasını indirip kurun.

## 💻 Geliştirme (Development)

Projeyi yerel ortamınızda çalıştırmak için:

1. **Gereksinimler**:
   - Node.js (v20+)
   - Rust (latest stable)
   - pnpm

2. **Bağımlılıkları Yükle**:

   ```bash
   pnpm install
   ```

3. **Geliştirme Sunucusu**:

   ```bash
   pnpm tauri dev
   ```

4. **Build (Production)**:
   ```bash
   pnpm tauri build
   ```

## 🤝 Katkıda Bulunma (Contributing)

Pull request'ler memnuniyetle karşılanır. Büyük değişiklikler için önce bir issue açarak tartışmanızı öneririz.

## 📄 Lisans

MIT License ile lisanslanmıştır.

## Görseller
<img width="1202" height="1080" alt="light1" src="https://github.com/user-attachments/assets/279e2f31-331a-4ebe-b023-6ad473b45108" />
<img width="1202" height="1080" alt="light2" src="https://github.com/user-attachments/assets/043b2bb6-267d-48d2-85ee-fc52ccbdfa1b" />
<img width="1202" height="1080" alt="light3" src="https://github.com/user-attachments/assets/08048867-4af8-4e9a-9a50-7051fec05d8e" />
<img width="1202" height="1080" alt="light4" src="https://github.com/user-attachments/assets/4b1e0adc-831f-4a7d-9f05-dc90c1c319be" />
<img width="1202" height="1080" alt="light5" src="https://github.com/user-attachments/assets/79202e4b-3cfe-424e-821c-b56932e350e4" />
<img width="1202" height="1080" alt="dark1" src="https://github.com/user-attachments/assets/d4d2ae19-5b93-4d80-84dd-1180d558767a" />
<img width="1202" height="1080" alt="dark2" src="https://github.com/user-attachments/assets/2fb55cff-ac06-4806-9528-ae20734e0cf5" />
<img width="1202" height="1080" alt="dark3" src="https://github.com/user-attachments/assets/bc2bb148-2b78-4569-bbbf-b2c148064249" />
<img width="1202" height="1080" alt="dark4" src="https://github.com/user-attachments/assets/40a77684-c31f-4ab7-83a4-f3f38706aa43" />
<img width="1202" height="1080" alt="dark5" src="https://github.com/user-attachments/assets/8c4762ad-337a-4e0d-b829-013c8e89826c" />
<img width="1202" height="832" alt="dark6" src="https://github.com/user-attachments/assets/9f19f068-1781-4cec-a499-22680be76ee7" />

