<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'ScaleCampusLab') }}</title>
    @fonts
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body>
    <div
        id="app"
        data-page="{{ $page }}"
        data-props='@json($props)'
        data-errors='@json($errors->toArray())'
        data-old='@json(old())'
        data-flash='@json(["status" => session("status")])'
        data-csrf="{{ csrf_token() }}"
    ></div>
</body>
</html>
