<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('university_team_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('university_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('title')->nullable();
            $table->string('phone')->nullable();
            $table->enum('status', ['active', 'invited', 'suspended'])->default('active')->index();
            $table->json('permissions')->nullable();
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();

            $table->unique(['university_user_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('university_team_members');
    }
};
