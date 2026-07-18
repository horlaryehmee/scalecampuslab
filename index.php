<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| public_html fallback front controller
|--------------------------------------------------------------------------
|
| Some shared hosts force the domain to load from public_html and do not allow
| changing the document root to Laravel's /public directory. In that setup,
| this file lets the site boot normally while the root .htaccess routes web
| traffic into /public and blocks direct access to Laravel internals.
|
*/

require __DIR__.'/public/index.php';
