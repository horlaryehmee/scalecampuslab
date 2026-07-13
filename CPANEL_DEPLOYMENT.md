# ScaleCampusLab cPanel deployment

This application must be deployed with Laravel migrations. Do **not** import
`database/cpanel_mysql_schema.sql`; it predates the canonical event/visit workflow.

## Prepare the release locally

Use the same PHP and Node major versions as production, then run:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
npm ci
npm run lint
npm run build
php artisan test
```

Upload the application, including `vendor/` and the generated `public/build/`
directory when Node or Composer are unavailable on the host. Never upload a local
`.env`, SQLite database, logs, or test credentials.

## Configure cPanel and MySQL

1. Create a MySQL database and user in cPanel and grant that user all privileges
   on the database.
2. Copy `.env.cpanel.example` to `.env` on the server and replace every placeholder.
3. Set the domain's document root to this application's `public` directory.
4. Select PHP 8.3 or newer and enable the extensions Laravel needs, including
   `ctype`, `curl`, `dom`, `fileinfo`, `filter`, `mbstring`, `openssl`, `pdo_mysql`,
   `session`, `tokenizer`, and `xml`.
5. Ensure `storage/` and `bootstrap/cache/` are writable by the PHP process.
6. Raise `upload_max_filesize` and `post_max_size` above the application's 10 MB
   document limit (for example, 16 MB and 20 MB) in cPanel's PHP settings.
7. Back up both MySQL and `storage/app/private/`; uploaded application documents
   are intentionally private and are not recoverable from the database alone.

Generate `APP_KEY` once for a new environment; never regenerate it for an existing
production database because encrypted data and sessions would become unreadable.

```bash
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan queue:restart
php artisan optimize
```

Before the first production release, rehearse `php artisan migrate:fresh --force`
against a disposable MySQL database. The automated suite uses SQLite, so this
MySQL rehearsal is the final check for engine-specific migration behavior.

## Email and payments

Use `MAIL_SCHEME=smtp` with port 587 for STARTTLS, or the mail provider's required
`smtps`/465 configuration. Send password-reset, verification, and one-time login
code messages to a controlled inbox before opening registration.

Set every `PAYSTACK_*` value in `.env`, keep the secret key server-side, and add
this webhook URL in the Paystack dashboard:

```text
https://your-domain.com/api/payments/paystack/webhook
```

Complete one test-mode application payment and confirm that both the browser
callback and signed webhook settle the same local payment only once before using
live keys.

Seed demo accounts only on a non-production staging environment:

```bash
php artisan db:seed --force
```

## Background work

Add this cPanel cron entry so reminders and waitlist processing run:

```cron
* * * * * cd /home/CPANEL_USER/scalecampuslab && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
```

Run the database queue continuously with cPanel's process manager when available,
or invoke this command from a supervised worker:

```bash
php artisan queue:work --sleep=3 --tries=3 --max-time=3600
```

Restart workers after every deployment with `php artisan queue:restart`, and
monitor `php artisan queue:failed`. The scheduler queues canonical campus-event
reminders every five minutes; email delivery will not complete without a worker.

If the host has no terminal, use a cPanel deployment hook or ask the host to run
the migration/cache commands. Importing an old SQL snapshot is not a safe
substitute for running migrations.

## Release checks

After each deployment, check `/`, `/login`, `/up`, and one dashboard account for each
role. Confirm password-reset, email verification, and one-time login-code delivery,
create and approve a test visit, upload and download a private test document,
complete a Paystack test payment, inspect `php artisan queue:failed`, and check the
daily files under `storage/logs/`. If configuration changes, run
`php artisan optimize:clear && php artisan optimize` before retesting.
