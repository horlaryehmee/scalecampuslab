<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_school_tasks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('target_school_id')->constrained('target_schools')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['open', 'done'])->default('open')->index();
            $table->boolean('ai_suggested')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_school_tasks');
    }
};
