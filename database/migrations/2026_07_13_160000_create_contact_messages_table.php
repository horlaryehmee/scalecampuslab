<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_messages', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 160);
            $table->string('email', 180)->index();
            $table->string('phone', 60)->nullable();
            $table->string('organization', 180)->nullable();
            $table->string('subject', 180);
            $table->text('message');
            $table->enum('status', ['new', 'read', 'resolved'])->default('new')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
