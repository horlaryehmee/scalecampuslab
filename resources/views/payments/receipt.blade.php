<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Payment receipt {{ $payment->reference }}</title>
    <style>
        body { margin: 0; background: #f8fafc; color: #172033; font-family: Arial, sans-serif; }
        main { width: min(680px, calc(100% - 32px)); margin: 48px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; box-sizing: border-box; }
        h1 { margin: 0 0 8px; font-size: 26px; }
        .status { color: #047857; font-weight: 700; }
        dl { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 24px; margin: 28px 0 0; }
        dt { color: #64748b; font-size: 13px; margin-bottom: 5px; }
        dd { margin: 0; overflow-wrap: anywhere; }
        footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 13px; }
        @media (max-width: 560px) { main { margin: 16px auto; padding: 22px; } dl { grid-template-columns: 1fr; } }
        @media print { body { background: #fff; } main { border: 0; margin: 0 auto; } }
    </style>
</head>
<body>
<main>
    <h1>ScaleCampusLab payment receipt</h1>
    <div class="status">Payment confirmed</div>

    <dl>
        <div><dt>Student</dt><dd>{{ $payment->student->name }}</dd></div>
        <div><dt>Student email</dt><dd>{{ $payment->student->email }}</dd></div>
        <div><dt>Institution</dt><dd>{{ $payment->application->program->institutionName() }}</dd></div>
        <div><dt>Program</dt><dd>{{ $payment->application->program->name }}</dd></div>
        <div><dt>Application reference</dt><dd>{{ $payment->application->reference }}</dd></div>
        <div><dt>Payment reference</dt><dd>{{ $payment->reference }}</dd></div>
        <div><dt>Amount</dt><dd>{{ $payment->currency }} {{ number_format((float) $payment->amount, 2) }}</dd></div>
        <div><dt>Paid at</dt><dd>{{ $payment->paid_at?->format('d M Y, H:i T') }}</dd></div>
    </dl>

    <footer>This receipt was generated from ScaleCampusLab's verified payment record.</footer>
</main>
</body>
</html>
