<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('compliance_requests', function (Blueprint $table): void {
            $table->enum('status', ['open', 'reviewing', 'completed', 'rejected', 'cancelled'])
                ->default('open')
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('compliance_requests', function (Blueprint $table): void {
            $table->enum('status', ['open', 'reviewing', 'completed', 'rejected'])
                ->default('open')
                ->change();
        });
    }
};
