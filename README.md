# 📅 Abonelik Takvimi (Subscription Calendar)

Modern, performant ve kullanıcı dostu bir masaüstü abonelik takip uygulaması. Yaklaşan ödemelerinizi takip edin, harcamalarınızı analiz edin ve bildirimlerle gününde haberdar olun.

![App Icon](app-icon.png)

## 🚀 Özellikler

- **Abonelik Yönetimi**: Netflix, Spotify, AWS gibi aboneliklerinizi ekleyin, düzenleyin ve kategorize edin.
- **Esnek Tekrar Kuralları**: Tek seferlik harcamaları, süreli abonelikleri ve süresiz tekrar eden ödemeleri ayrı ayrı takip edin.
- **Sabit / Değişken Tutar**: Kira ve abonelikler aynı tutarla devam eder; su, elektrik ve doğalgaz için her dönem yeni tutar girilir. Yalnızca o dönemin tutarını ve ödeme tarihini değiştirebilirsiniz.
- **Aylık Snapshot & Geçmiş**: Her ayın ödeme kayıtlarını bağımsız bir snapshot olarak saklayın; sonraki düzenlemeler geçmiş ayları değiştirmez.
- **Geniş Kategori Seti**: Kira ve konuttan telekom, ulaşıma, sağlığa ve eğitime kadar ayrıntılı filtreleme kullanın.
- **Akıllı Takvim Görünümü**: Aylık ödemelerinizi takvim üzerinde görselleştirin.
- **Manuel Ödeme Takibi**: Aylık kayıtları ödenmedi, ödendi veya atlandı olarak işaretleyin; durum geçmiş snapshot'larda korunsun.
- **Otomatik Ödeme Talimatı**: Bir kaydın manuel mi otomatik talimatla mı ödendiğini belirtin ve uygun kontrol hatırlatması alın.
- **Opsiyonel E-posta Hatırlatmaları**: Gmail üzerinden, uygulama açıkken yaklaşan ödemeleri doğrudan kendi hesabınızdan gönderin.
- **Karanlık & Aydınlık Mod**: Sistem temanıza uyumlu veya manuel olarak değiştirilebilir modern arayüz.
- **Detaylı Analiz**: Aylık toplam harcamanızı ve yaklaşan ödemelerinizi anlık görün.
- **Güvenli & Yerel**: Tüm verileriniz yerel cihazınızdaki SQLite veritabanında saklanır. Varsayılan olarak ağ üzerinden veri gönderilmez; e-posta hatırlatmaları yalnızca siz etkinleştirirseniz ödeme adı, tarih ve tutarı seçtiğiniz e-posta sağlayıcısına iletir.
- **Aracısız E-posta**: E-posta için uygulamaya ait bir sunucu kullanılmaz. SMTP uygulama şifresi SQLite'a veya tarayıcı depolamasına yazılmaz; işletim sisteminin kimlik kasasında tutulur.
- **Yedekleme**: Verilerinizi JSON formatında dışa aktarın ve geri yükleyin.

## Ödeme düzeni nasıl seçilir?

- **Kira, aidat, Netflix, YouTube**: `Tekrar eden` + `Sabit tutar`. Örneğin ayın 15'i ve 15.000 TL seçildiğinde sonraki aylar aynı tutarla oluşur. Kalıcı zam için Yönetim'deki kaydı; yalnızca bir aylık fark için takvimdeki `Detay` ekranını düzenleyin.
- **Su, elektrik, doğalgaz**: `Tekrar eden` + `Değişken tutar`. Beklenen ödeme gününü seçin. Her ay `Tutar bekleniyor` olarak başlar; fatura gelince `Detay` ekranında o ayın tutarını ve gerçek son ödeme tarihini girin. Tutar sonraki aya kopyalanmaz.
- **Market, alışveriş, tek seferlik ödeme**: `Tek seferlik`. Her alışverişin tarihini ve tutarını ayrı girin. Bir ay hiç alışveriş kaydı yoksa otomatik harcama oluşturulmaz.

`Atlandı` yalnızca seçilen dönemi etkiler; tekrar eden kayıt sonraki dönem devam eder. Değişken bir faturayı `Ödendi` yapmadan önce tutarı girilmelidir (sıfır tutarlı fatura da mümkündür). Tutarı beklenen kayıtlar toplamda sıfır kabul edilmez; bilinen toplamın yanında eksik tutar sayısı gösterilir.

Geçmiş ayların snapshot'ları otomatik yeniden hesaplanmaz. Eksik bir geçmiş fatura tutarını Detay'dan tamamlayabilir veya geçmişe tek seferlik harcama ekleyebilirsiniz. Mevcut elektrik/su/doğalgaz kayıtları değişken tutara geçirilirken bu ayın ve geçmiş ayların tutarları korunur; gelecek aylar yeni tutar bekler. JSON yedeği gelecek aylar için önceden girdiğiniz tutar ve tarihleri de kapsar.

## 🛠️ Teknolojiler

Bu proje, modern web teknolojilerini native performans ile birleştirir:

- **Core**: [Tauri v2](https://tauri.app) (Rust + Webview)
- **Frontend**: [React](https://react.dev), [TypeScript](https://www.typescriptlang.org)
- **UI Framework**: [TailwindCSS](https://tailwindcss.com), [Shadcn/UI](https://ui.shadcn.com)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: SQLite (via `tauri-plugin-sql`)
- **Build Tool**: [Vite](https://vitejs.dev), [pnpm](https://pnpm.io)

## 📦 Kurulum (Release)

En güncel sürümü [Releases](https://github.com/sinanfen/abonelik-takvimi/releases/latest) sayfasından indirebilirsiniz.

- **Windows**: `.msi` veya `.exe` dosyasını indirip kurun.
- **macOS**: Intel ve Apple Silicon destekli universal `.dmg` dosyasını indirip uygulamayı Applications klasörüne taşıyın.
- **Linux**: `.AppImage`, `.deb` veya `.rpm` paketlerinden dağıtımınıza uygun olanı kullanın.

Release yalnızca üç ortamda testler ve derleme başarılı olduğunda, tüm kurulum dosyaları doğrulanıp SHA256SUMS.txt oluşturulduktan sonra yayımlanır. Paketler ticari kod imzalama/noter onayı içermez; işletim sisteminiz ilk kurulumda yayıncı doğrulama uyarısı gösterebilir.

## 💻 Geliştirme (Development)

Projeyi yerel ortamınızda çalıştırmak için:

1. **Gereksinimler**:
   - Node.js (v22.15+; SQLite entegrasyon testleri için)
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

5. **Kontroller**:

   ```bash
   pnpm test
   pnpm lint
   pnpm build
   cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
   cargo check --locked --manifest-path src-tauri/Cargo.toml
   ```

   Testler gerçek migration SQL'ini ve repository sorgularını izole, bellek içi SQLite üzerinde çalıştırır; kişisel veritabanınıza dokunmaz. Rust testleri ayrıca SQLx kontrol toplamı doğrulamasıyla eski ve yayımlanmış veritabanlarından yükseltmeyi sınar.

### Veritabanı yükseltme güvenliği

Veritabanı migration'ları arayüz sorgularından önce tamamlanır; eşzamanlı açılış sorguları tek bağlantı hazırlığını paylaşır. İlk masaüstü bildirimli geliştirme sürümünün bilinen v4 migration'ı ve v0.5.0 Windows paketinin CRLF satır sonlu v5 migration'ı da desteklenir; migration geçmişindeki kontrol toplamları değiştirilmez. Yeni SQL dosyaları platformdan bağımsız LF satır sonları kullanır. Bilinmeyen bir kontrol toplamı uyuşmazlığı yükseltmeyi durdurur. Eski v4 desteği masaüstü bildirimlerini yeniden etkinleştirmez; mevcut kayıtlar ve aylık geçmiş korunur.

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
