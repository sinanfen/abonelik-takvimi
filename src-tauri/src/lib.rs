use keyring::Entry;
use lettre::{
    message::Mailbox, transport::smtp::authentication::Credentials, Message, SmtpTransport,
    Transport,
};
use serde::Deserialize;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

mod database;

const KEYRING_SERVICE: &str = "com.abonelik-takvimi.app.smtp";
const KEYRING_ACCOUNT: &str = "smtp-password";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmailConfig {
    provider: String,
    username: String,
    recipient: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaymentReminder {
    title: String,
    amount: Option<f64>,
    currency: String,
    occurrence_date: String,
    days_before: i32,
    automatic_payment: bool,
}

fn keyring_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|_| "İşletim sistemi kimlik kasasına erişilemedi".to_string())
}

fn bounded(value: &str, max_len: usize, label: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.chars().count() > max_len {
        return Err(format!("{label} geçerli değil"));
    }
    Ok(trimmed.to_string())
}

fn smtp_host(provider: &str) -> Result<&'static str, String> {
    match provider {
        "gmail" => Ok("smtp.gmail.com"),
        _ => Err("Desteklenmeyen e-posta sağlayıcısı".to_string()),
    }
}

fn validate_email_config(config: &EmailConfig) -> Result<(String, Mailbox, &'static str), String> {
    let username = bounded(&config.username, 254, "Gönderen adresi")?;
    let recipient = bounded(&config.recipient, 254, "Alıcı adresi")?;
    username
        .parse::<Mailbox>()
        .map_err(|_| "Gönderen e-posta adresi geçerli değil".to_string())?;
    let recipient_mailbox = recipient
        .parse::<Mailbox>()
        .map_err(|_| "Alıcı e-posta adresi geçerli değil".to_string())?;
    let host = smtp_host(&config.provider)?;
    Ok((username, recipient_mailbox, host))
}

fn send_plain_email(config: EmailConfig, subject: String, body: String) -> Result<(), String> {
    let (username, recipient, host) = validate_email_config(&config)?;
    let password = keyring_entry()?
        .get_password()
        .map_err(|_| "SMTP uygulama şifresi bulunamadı".to_string())?;
    let from = username
        .parse::<Mailbox>()
        .map_err(|_| "Gönderen e-posta adresi geçerli değil".to_string())?;
    let email = Message::builder()
        .from(from)
        .to(recipient)
        .subject(bounded(&subject, 160, "E-posta konusu")?)
        .body(body)
        .map_err(|_| "E-posta oluşturulamadı".to_string())?;
    let mailer = SmtpTransport::starttls_relay(host)
        .map_err(|_| "Güvenli SMTP bağlantısı hazırlanamadı".to_string())?
        .port(587)
        .credentials(Credentials::new(username, password))
        .build();
    mailer.send(&email).map_err(|_| {
        "E-posta gönderilemedi. Sağlayıcı ve uygulama şifresini kontrol edin".to_string()
    })?;
    Ok(())
}

#[tauri::command]
fn store_smtp_password(password: String) -> Result<(), String> {
    let password = bounded(&password, 512, "SMTP uygulama şifresi")?;
    keyring_entry()?
        .set_password(&password)
        .map_err(|_| "SMTP uygulama şifresi kimlik kasasına kaydedilemedi".to_string())
}

#[tauri::command]
fn has_smtp_password() -> Result<bool, String> {
    match keyring_entry()?.get_password() {
        Ok(password) => Ok(!password.is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(_) => Err("Kimlik kasası durumu okunamadı".to_string()),
    }
}

#[tauri::command]
fn delete_smtp_password() -> Result<(), String> {
    match keyring_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("SMTP uygulama şifresi silinemedi".to_string()),
    }
}

#[tauri::command]
async fn send_test_email(config: EmailConfig) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        send_plain_email(
            config,
            "Abonelik Takvimi test e-postası".to_string(),
            "E-posta hatırlatmaları güvenli SMTP bağlantısı üzerinden çalışıyor.\n\nBu e-posta cihazınızdaki Abonelik Takvimi uygulaması tarafından gönderildi.".to_string(),
        )
    })
    .await
    .map_err(|_| "E-posta görevi tamamlanamadı".to_string())?
}

#[tauri::command]
async fn send_payment_reminder(
    config: EmailConfig,
    reminder: PaymentReminder,
) -> Result<(), String> {
    let title = bounded(&reminder.title, 120, "Kayıt adı")?;
    let currency = bounded(&reminder.currency, 8, "Para birimi")?;
    let occurrence_date = bounded(&reminder.occurrence_date, 10, "Ödeme tarihi")?;
    if !(0..=365).contains(&reminder.days_before) {
        return Err("Hatırlatma günü geçerli değil".to_string());
    }
    let amount_line = reminder
        .amount
        .filter(|amount| amount.is_finite() && *amount >= 0.0)
        .map(|amount| format!("Tutar: {amount:.2} {currency}\n"))
        .unwrap_or_else(|| {
            "Tutar henüz girilmedi. Uygulamada bu dönemin tutarını girin.\n".to_string()
        });
    let payment_note = if reminder.automatic_payment {
        "Otomatik ödeme talimatı işaretli. Hesap bakiyesini ve tahsilatı kontrol edin."
    } else {
        "Bu kayıt manuel ödeme olarak işaretli. Ödeme yaptıktan sonra uygulamada 'Ödendi' durumuna alın."
    };
    let subject = if reminder.days_before == 0 {
        format!("Bugün ödeme günü: {title}")
    } else {
        format!("Yaklaşan ödeme: {title}")
    };
    let body = format!(
        "{title}\nÖdeme tarihi: {occurrence_date}\n{amount_line}{payment_note}\n\nBu e-posta cihazınızdaki Abonelik Takvimi uygulaması tarafından gönderildi."
    );
    tauri::async_runtime::spawn_blocking(move || send_plain_email(config, subject, body))
        .await
        .map_err(|_| "E-posta görevi tamamlanamadı".to_string())?
}

fn database_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "Create subscriptions table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('subscription', 'credit_card', 'bill', 'other')),
                    category TEXT NOT NULL,
                    frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'weekly', 'yearly', 'custom')),
                    day_of_month INTEGER,
                    amount REAL,
                    currency TEXT DEFAULT 'TRY',
                    payment_method TEXT,
                    reminders TEXT DEFAULT '[]',
                    is_active INTEGER DEFAULT 1,
                    notes TEXT,
                    statement_day INTEGER,
                    due_day INTEGER,
                    start_date TEXT,
                    end_date TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "Add sort_order column",
            sql: "ALTER TABLE subscriptions ADD COLUMN sort_order INTEGER DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "Add recurrence mode and monthly snapshots",
            sql: r#"
                ALTER TABLE subscriptions ADD COLUMN recurrence_type TEXT NOT NULL DEFAULT 'recurring'
                    CHECK(recurrence_type IN ('recurring', 'one_time'));

                CREATE TABLE IF NOT EXISTS monthly_snapshots (
                    id TEXT PRIMARY KEY NOT NULL,
                    month TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS snapshot_items (
                    id TEXT PRIMARY KEY NOT NULL,
                    snapshot_id TEXT NOT NULL,
                    subscription_id TEXT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    event_kind TEXT NOT NULL,
                    occurrence_date TEXT NOT NULL,
                    amount REAL,
                    currency TEXT NOT NULL DEFAULT 'TRY',
                    notes TEXT,
                    status TEXT NOT NULL DEFAULT 'planned',
                    sort_order INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(snapshot_id) REFERENCES monthly_snapshots(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_snapshot_items_snapshot
                    ON snapshot_items(snapshot_id, occurrence_date, sort_order);
                CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_month
                    ON monthly_snapshots(month);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "Add payment tracking and reminder delivery log",
            sql: r#"
                ALTER TABLE subscriptions ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'manual'
                    CHECK(payment_mode IN ('manual', 'automatic'));

                CREATE TABLE IF NOT EXISTS reminder_dispatches (
                    id TEXT PRIMARY KEY NOT NULL,
                    subscription_id TEXT NOT NULL,
                    occurrence_date TEXT NOT NULL,
                    reminder_days INTEGER NOT NULL,
                    channel TEXT NOT NULL CHECK(channel = 'email'),
                    sent_at TEXT NOT NULL,
                    UNIQUE(subscription_id, occurrence_date, reminder_days, channel)
                );

                CREATE INDEX IF NOT EXISTS idx_reminder_dispatches_lookup
                    ON reminder_dispatches(subscription_id, occurrence_date, reminder_days, channel);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "Add variable amounts and occurrence overrides",
            sql: include_str!("../migrations/005_variable_amounts.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            store_smtp_password,
            has_smtp_password,
            delete_smtp_password,
            send_test_email,
            send_payment_reminder
        ])
        .setup(|app| {
            let database_path = app.path().app_config_dir()?.join("subscriptions.db");
            let migrations = tauri::async_runtime::block_on(database::compatible_migrations(
                &database_path,
                database_migrations(),
            ))?;
            // Initialize and migrate natively before allowing frontend queries.
            // An actual migration error aborts startup instead of exposing a
            // partially upgraded database through a second frontend load.
            app.handle().plugin(
                tauri_plugin_sql::Builder::default()
                    .add_migrations("sqlite:subscriptions.db", migrations)
                    .build(),
            )?;
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
