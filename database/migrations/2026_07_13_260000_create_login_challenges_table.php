<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_challenges', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->string('code_hash');
            $table->string('context', 32)->index();
            $table->boolean('remember')->default(false);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts')->default(5);
            $table->unsignedTinyInteger('resend_count')->default(0);
            $table->dateTime('last_sent_at');
            $table->dateTime('expires_at')->index();
            $table->dateTime('consumed_at')->nullable()->index();
            $table->timestamps();

            $table->index(['user_id', 'context', 'consumed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_challenges');
    }
};
