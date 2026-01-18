# Progress: Abonelik Takvimi

## Proje Durumu: 🟢 Aktif Geliştirme

**Son Güncelleme**: 18 Ocak 2026 (Sabaha Karşı)

## Milestone Özeti

| Milestone            | Durum         | İlerleme |
| -------------------- | ------------- | -------- |
| 0 - Planlama         | ✅ Tamamlandı | 100%     |
| 1 - UI Prototip      | ✅ Tamamlandı | 100%     |
| 2 - Veri Katmanı     | ✅ Tamamlandı | 100%     |
| 3 - Kural Motoru     | ✅ Tamamlandı | 100%     |
| 4 - Import/Export    | ✅ Tamamlandı | 100%     |
| 5 - Kalite & Release | 🔲 Başlamadı  | 0%       |

---

## ✅ Ne Çalışıyor?

### Milestone 3 — Kural Motoru & İyileştirmeler 🟢

- [x] Kredi kartı modu (kesim + son ödeme günü)
- [x] Ay sonu taşma kuralları
- [x] Çoklu hatırlatma seçimi (Checkbox UI)
- [x] Filtreler + arama
- [x] **Ayarlar Sayfası**: Tema (Dark/Light/System) ve Bildirim toggle'ı
- [x] **Switch Bileşeni**: Manuel entegrasyon
- [x] **CSS Variables**: Light Theme desteği
- [x] **Masaüstü Bildirimleri**: `tauri-plugin-notification` entegrasyonu

### Milestone 4 — Import/Export (Erkene Çekildi) 🟢

- [x] JSON export/import (Yedekleme)
- [x] Dosya sistemi ve SQL izinleri

---

## 🔲 Ne Eksik? (Yapılacaklar)

- [ ] **Release Testleri**: `pnpm tauri build` ve installer testi.
- [ ] **Otomatik Yedekleme**: (Opsiyonel / Backlog).
- [ ] **CSV Export**: (Opsiyonel / Backlog).

---

## 📊 Karar Geçmişi

| Tarih      | Karar                               | Sonuç         |
| ---------- | ----------------------------------- | ------------- |
| 18/01/2026 | Light Theme için Variable kullanımı | ✅ Onaylandı  |
| 18/01/2026 | Switch için manuel kurulum          | ✅ Onaylandı  |
| 18/01/2026 | Bildirim Sistemi: Hook + Plugin     | ✅ Tamamlandı |
