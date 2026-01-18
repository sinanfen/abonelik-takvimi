# Project Brief: Abonelik Takvimi

## Proje Özeti

**Abonelik Takvimi**, kullanıcıların abonelik, ödeme ve hizmet tarihlerini 30 günlük bir takvim üzerinde takip etmelerini sağlayan masaüstü uygulamasıdır.

## Temel Hedefler

1. **Görselleştirme**: 30 günlük takvimde tüm abonelik ve ödeme günlerinin görüntülenmesi
2. **Yönetim**: Abonelik ekleme, düzenleme, silme ve pasifleştirme
3. **Hatırlatma**: Yaklaşan ödemeler için bildirim sistemi
4. **Taşınabilirlik**: Import/Export ile veri yedekleme ve aktarma

## Kapsam (MVP)

### Dahil

- 30 günlük takvim grid görünümü
- Abonelik CRUD işlemleri
- Kredi kartı hesap kesim/son ödeme takibi
- Aylık/haftalık/yıllık tekrar kuralları
- Kategori bazlı renk kodlaması
- JSON/CSV import/export
- Yönetim paneli (liste görünümü)
- Filtreleme ve arama

### Hariç (MVP Sonrası)

- ICS (takvim) export
- Otomatik güncelleme
- Bulut senkronizasyon
- Mobil uygulama

## Hedef Kullanıcı

- Bireysel kullanıcılar
- Birden fazla abonelik/ödeme takip eden kişiler
- Windows 10/11 kullanıcıları (öncelikli)

## Dağıtım

- **Platform**: Windows 10/11 (öncelikli), macOS ve Linux (destekleniyor)
- **Format**: MSI installer
- **Kurulum**: Standart Next → Finish

## Başarı Kriterleri

1. Sorunsuz kurulum ve çalışma (Windows)
2. 30 günlük takvim doğru gösterimi
3. Abonelik CRUD %100 çalışır
4. Import/Export sorunsuz
5. Responsive ve hızlı UI
