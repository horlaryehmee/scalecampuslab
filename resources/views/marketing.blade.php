<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="ScaleCampusLab helps universities and schools plan, approve, and run better campus outreach visits.">
    <meta name="theme-color" content="#075f56">
    <title>{{ config('app.name', 'ScaleCampusLab') }} - Campus outreach, coordinated</title>
    @vite(['resources/css/app.css', 'resources/js/marketing.jsx'])
</head>
<body>
    <div id="platform-root"></div>
</body>
</html>
