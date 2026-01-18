# Tech Context: Abonelik Takvimi

## Teknoloji Yığını

### Runtime & Framework

| Katman   | Teknoloji      | Versiyon |
| -------- | -------------- | -------- |
| Desktop  | **Tauri**      | 2.x      |
| Backend  | **Rust**       | stable   |
| Frontend | **React**      | 18.3.x   |
| Language | **TypeScript** | 5.6.x    |
| Bundler  | **Vite**       | 5.4.x    |
| Node     | >= 20          |          |

### UI Stack

| Amaç          | Teknoloji               |
| ------------- | ----------------------- |
| Design System | **shadcn/ui**           |
| Primitives    | **Radix UI**            |
| Styling       | **Tailwind CSS** 3.4.x  |
| Icons         | **Lucide React**        |
| Animations    | **tailwindcss-animate** |

### State & Data

| Amaç             | Teknoloji               |
| ---------------- | ----------------------- |
| State Management | **Zustand** 4.5.x       |
| Server State     | **TanStack Query** 5.x  |
| Database         | **SQLite** (embedded)   |
| ORM              | **Drizzle ORM**         |
| Forms            | **React Hook Form** 7.x |
| Validation       | **Zod** 3.x             |

### Tauri Plugins Kullanılacak

```
@tauri-apps/plugin-dialog      # Dosya seçimi
@tauri-apps/plugin-fs          # Dosya okuma/yazma
@tauri-apps/plugin-notification # Bildirimler
@tauri-apps/plugin-store       # Key-value store
@tauri-apps/plugin-window-state # Pencere durumu
```

### Import/Export Kütüphaneleri

| Format          | Kütüphane     |
| --------------- | ------------- |
| CSV             | **papaparse** |
| ICS (opsiyonel) | **ical.js**   |
| JSON            | Native        |

## Proje Yapısı

```
abonelik-takvimi/
├── src-tauri/           # Rust backend (Tauri)
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                 # React frontend
│   ├── app/             # Sayfa routing
│   ├── features/        # Feature modülleri
│   │   ├── calendar/
│   │   ├── subscriptions/
│   │   ├── admin/
│   │   ├── import-export/
│   │   └── settings/
│   ├── components/      # Shared UI components
│   ├── lib/             # Utilities
│   ├── stores/          # Zustand stores
│   ├── db/              # Drizzle schema & queries
│   └── types/           # TypeScript types
├── drizzle/             # Migrations
├── public/              # Static assets
└── scripts/             # Build/dev scripts
```

## Geliştirme Komutları

```bash
# Development
pnpm dev              # Vite dev server
pnpm tauri:dev        # Tauri + Vite birlikte

# Build
pnpm build            # Frontend build
pnpm tauri:build      # Full production build (MSI)

# Database
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes

# Quality
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm typecheck        # TypeScript check
```

## Tasarım Sistemi

### Tema: Dark (Varsayılan)

- **Arka plan**: `#0B0F14` (near-black)
- **Surface**: `#0F1621` (kartlar)
- **Border**: `#1F2A3A` (subtle)
- **Primary**: `#3B82F6` (mavi accent)
- **Text**: `#E6EDF6` (açık)
- **Muted**: `#9AA4B2` (ikincil metin)

### Kategori Renkleri

| Kategori      | Renk                |
| ------------- | ------------------- |
| Banking       | `#60A5FA` (mavi)    |
| Entertainment | `#A78BFA` (mor)     |
| Bills         | `#FBBF24` (sarı)    |
| SaaS          | `#34D399` (yeşil)   |
| Insurance     | `#FB7185` (pembe)   |
| Shopping      | `#F97316` (turuncu) |
| Other         | `#94A3B8` (gri)     |

### Component Özellikleri

- **Border Radius**: 12px (kartlar), 10px (buton/input)
- **Font**: Inter (primary), JetBrains Mono (code)
- **Shadow**: Soft, subtle

## Kısıtlamalar & Notlar

1. **SQLite**: Uygulama içinde gömülü, kullanıcı kurulum yapmaz
2. **WebView2**: Windows'ta gerekli (Tauri otomatik kontrol eder)
3. **Offline-first**: İnternet bağlantısı gerektirmez
4. **Veri lokasyonu**: `%APPDATA%/abonelik-takvimi/`
5. **Timezone**: Varsayılan `Europe/Istanbul`
