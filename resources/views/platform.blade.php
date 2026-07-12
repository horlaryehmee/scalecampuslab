<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Campus Visit Platform</title>
    @vite(['resources/css/app.css', 'resources/js/platform.jsx'])
</head>
<body>
    <div id="platform-root"></div>
</body>
</html>
