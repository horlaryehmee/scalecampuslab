<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruitment_insights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->nullableMorphs('subject');
            $table->string('title');
            $table->text('body');
            $table->enum('type', ['recommendation', 'risk', 'opportunity', 'prediction'])->default('recommendation')->index();
            $table->enum('status', ['open', 'saved', 'done', 'dismissed'])->default('saved')->index();
            $table->unsignedTinyInteger('score')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_insights');
    }
};
