<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waitlist_signups', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('email')->unique();
            $table->enum('role', ['university', 'high_school', 'student']);
            $table->timestamps();

            $table->index(['role', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist_signups');
    }
};
