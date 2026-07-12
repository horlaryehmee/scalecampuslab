# cPanel Deployment

## MySQL setup

1. Create a MySQL database in cPanel.
2. Create a MySQL user and assign it to the database with all privileges.
3. Copy `.env.cpanel.example` to `.env` on the server.
4. Fill these values with the exact cPanel database details:

```dotenv
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cpaneluser_scalecampuslabs
DB_USERNAME=cpaneluser_scalecampuslabs
DB_PASSWORD=your_database_user_password
```

Also set:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
APP_KEY=base64:your_generated_app_key
WAITLIST_ADMIN_PASSWORD=your_strong_admin_password
```

## Create the tables

If cPanel provides terminal access, run:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

If cPanel does not provide terminal access, open phpMyAdmin, select the new database, and import:

```text
database/cpanel_mysql_schema.sql
```

## Public directory

Point the domain document root to Laravel's `public` directory. If your host does not allow that, place the contents of `public` in `public_html` and update `index.php` paths to point back to the Laravel app folder.
