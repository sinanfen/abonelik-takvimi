# Product Context: Abonelik Takvimi

## Neden Bu Proje Var?

Modern hayatta bireyler onlarca farklı abonelik ve ödeme ile uğraşıyor:

- Streaming servisleri (Netflix, Spotify, Disney+)
- Kredi kartı ödemeleri
- Faturalar (elektrik, internet, telefon)
- SaaS abonelikleri
- Sigorta ödemeleri

Bu kadar çok ödeme tarihini takip etmek zorlaşıyor ve kaçırılan ödemeler faiz/ceza anlamına geliyor.

## Çözülen Problemler

### 1. Dağınık Takip

**Problem**: Ödemeler farklı yerlerde (takvim, not, hafıza) takip ediliyor
**Çözüm**: Tek bir 30 günlük takvimde tüm ödemelerin görünmesi

### 2. Kredi Kartı Karmaşası

**Problem**: Hesap kesim ve son ödeme tarihleri karışıyor
**Çözüm**: Kredi kartları için özel mod - kesim günü + son ödeme günü ayrı ayrı

### 3. Tekrar Eden Ödemeler

**Problem**: Her ay aynı tarihleri manuel girmek
**Çözüm**: Aylık/haftalık/yıllık tekrar kuralları otomatik event üretir

### 4. Veri Kaybı Riski

**Problem**: Uygulama değişince veriler kaybolabilir
**Çözüm**: JSON/CSV export ile tam yedekleme

## Kullanıcı Deneyimi Hedefleri

### Sadelik

- Uygulama açılır → Takvim görünür → Günler net
- Minimum tıklama ile yeni abonelik ekleme
- Hızlı arama ile abonelik bulma

### Görsel Netlik

- Kategorilere göre renk kodları
- Bugün vurgulu
- Badge'ler ile günlük özet

### Güvenilirlik

- Offline çalışır (SQLite)
- Lokal veri, cloud bağımlılığı yok
- Export ile her zaman yedek alınabilir

## Nasıl Çalışmalı?

### Ana Akış

1. Kullanıcı uygulamayı açar → 30 günlük takvim görünür
2. Yeni abonelik ekler (ad, kategori, tekrar kuralı)
3. Takvimde otomatik olarak gelecek günler işaretlenir
4. Gün tıklanınca o günün detayları açılır
5. Yönetim panelinde tüm abonelikler listelenir

### Kredi Kartı Akışı

1. "Kredi Kartı" türü seçilir
2. Hesap kesim günü girilir (örn: 15)
3. Son ödeme tanımlanır:
   - Sabit gün (örn: ayın 25'i) VEYA
   - Offset (örn: kesimden 10 gün sonra)
4. Takvimde iki ayrı event görünür: "Kesim" ve "Son Ödeme"

## Rakip/Alternatifler

- Generic takvim uygulamaları (Google Calendar) - abonelik odaklı değil
- Finansal uygulamalar - çok karmaşık, banka entegrasyonu gerekli
- Not uygulamaları - yapısal değil, hatırlatma zayıf

**Farkımız**: Sadece abonelik/ödeme takibi, sade, offline-first, lokal
