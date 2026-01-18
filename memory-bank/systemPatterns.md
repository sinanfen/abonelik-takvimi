# System Patterns: Abonelik Takvimi

## Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Shell                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────┐   │
│  │   React Frontend    │  │    Rust Backend         │   │
│  │   (WebView)         │◄─►│    (Native)            │   │
│  │                     │  │                         │   │
│  │  ┌───────────────┐  │  │  ┌─────────────────┐   │   │
│  │  │ UI Components │  │  │  │ Tauri Commands  │   │   │
│  │  └───────────────┘  │  │  └─────────────────┘   │   │
│  │  ┌───────────────┐  │  │  ┌─────────────────┐   │   │
│  │  │ Zustand Store │  │  │  │ SQLite (libsql) │   │   │
│  │  └───────────────┘  │  │  └─────────────────┘   │   │
│  │  ┌───────────────┐  │  │  ┌─────────────────┐   │   │
│  │  │ TanStack Query│  │  │  │ File I/O        │   │   │
│  │  └───────────────┘  │  │  └─────────────────┘   │   │
│  └─────────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   SQLite DB  │
                    │  (AppData)   │
                    └──────────────┘
```

## Veri Modeli

### Subscription (Abonelik)

```typescript
interface Subscription {
  id: string; // nanoid
  name: string; // "Netflix"
  type: SubscriptionType; // subscription | credit_card | bill | other
  category: Category; // Banking | Entertainment | Bills | SaaS | ...
  recurrenceRule: RecurrenceRule;
  amount?: number; // Opsiyonel tutar
  currency?: string; // TRY, USD, EUR
  paymentMethod?: string; // Kart/hesap adı
  reminders: number[]; // [7, 3, 1, 0] - X gün önce
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### RecurrenceRule (Tekrar Kuralı)

```typescript
interface RecurrenceRule {
  frequency: "monthly" | "weekly" | "yearly" | "custom";
  monthlyDay?: number; // 1-31 (aylık için)
  weeklyDays?: DayOfWeek[]; // ['Mon', 'Wed'] (haftalık için)
  timezone: string; // 'Europe/Istanbul'
  startDate: Date;
  endDate?: Date; // Opsiyonel bitiş

  // Kredi kartı özel alanları
  creditCardMode?: {
    statementDay: number; // Hesap kesim günü (1-31)
    dueMode: "fixed_day" | "offset_days";
    dueDay?: number; // Sabit son ödeme günü
    dueOffsetDays?: number; // Kesimden X gün sonra
  };
}
```

### EventInstance (Takvim Event'i)

```typescript
interface EventInstance {
  id: string;
  subscriptionId: string;
  date: Date;
  kind: "payment" | "statement" | "due" | "reminder";
  title: string; // "Ziraat - Hesap Kesim"
  status: "planned" | "done" | "skipped";
}
```

## Design Patterns

### 1. Feature-Based Architecture

Her özellik kendi klasöründe:

```
features/
├── calendar/
│   ├── components/     # CalendarGrid, DayCell, DayDrawer
│   ├── hooks/          # useCalendarEvents, useDateRange
│   └── utils/          # Event hesaplama
├── subscriptions/
│   ├── components/     # SubscriptionForm, SubscriptionCard
│   ├── hooks/          # useSubscriptions, useSubscriptionMutations
│   └── schema.ts       # Zod validation
```

### 2. Event Generation (Lazy)

Event'ler DB'de tutulmaz, runtime'da hesaplanır:

```typescript
function generateEvents(
  subscription: Subscription,
  range: DateRange
): EventInstance[] {
  // recurrenceRule'a göre tarih aralığındaki tüm event'leri üret
  // Kredi kartı için: statement + due ayrı ayrı
  // Hatırlatmalar için: her reminder offset için ayrı event
}
```

### 3. State Management Pattern

```
UI Component
    │
    ▼
Zustand Store (UI state, filters, selected date)
    │
    ▼
TanStack Query (async data, caching, mutations)
    │
    ▼
Tauri IPC (invoke commands)
    │
    ▼
Rust Backend → SQLite
```

### 4. Form Validation

```typescript
// Zod schema
const subscriptionSchema = z.object({
  name: z.string().min(1, "Zorunlu"),
  type: z.enum(["subscription", "credit_card", "bill", "other"]),
  category: z.enum([
    "Banking",
    "Entertainment",
    "Bills",
    "SaaS",
    "Insurance",
    "Shopping",
    "Other",
  ]),
  // ...
});

// React Hook Form ile entegre
const form = useForm<Subscription>({
  resolver: zodResolver(subscriptionSchema),
});
```

## Kritik İş Kuralları

### Ay Sonu Taşma

```typescript
// 31. gün kuralı: ay yoksa son güne düş
function adjustDayForMonth(day: number, month: number, year: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}
// Örnek: 31 Şubat → 28/29 Şubat
```

### Kredi Kartı Offset Hesabı

```typescript
// Kesim + offset → ay taşması kontrolü
function calculateDueDate(statementDate: Date, offsetDays: number): Date {
  return addDays(statementDate, offsetDays);
  // Otomatik olarak bir sonraki aya taşar
}
```

### Pasif Abonelik Filtreleme

```typescript
// Takvimde sadece aktif abonelikler gösterilir
// Yönetim panelinde "pasifleri göster" toggle var
const visibleSubscriptions = subscriptions.filter(
  (s) => s.isActive || showInactive
);
```

## Component Hiyerarşisi

```
App
├── Layout
│   ├── Header
│   │   ├── DateRangeDisplay
│   │   ├── SearchBar
│   │   └── ActionButtons (+ New, Import, Settings)
│   ├── Sidebar (opsiyonel)
│   │   └── Filters
│   └── Main
│       ├── CalendarView (default)
│       │   ├── CalendarGrid
│       │   │   └── DayCell (x30)
│       │   │       └── EventBadge
│       │   └── DayDrawer
│       │       └── EventList
│       └── AdminView
│           └── SubscriptionTable
├── Dialogs/Modals
│   ├── SubscriptionFormModal
│   ├── ImportModal
│   └── ExportModal
└── Toast/Notifications
```

## API/IPC Pattern

```typescript
// Frontend → Rust
invoke<Subscription[]>("get_subscriptions", { activeOnly: true });
invoke<void>("save_subscription", { subscription });
invoke<void>("delete_subscription", { id });
invoke<string>("export_json", { includeSettings: true });
invoke<ImportResult>("import_json", { data, conflictPolicy: "update" });

// Rust → Frontend (events)
listen("notification-triggered", handler);
```
