<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AccountSessionRevoker
{
    public function revokeAll(User $user): int
    {
        $user->tokens()->delete();
        $this->invalidateLoginChallenges($user);

        if (config('session.driver') !== 'database') {
            return 0;
        }

        $connection = config('session.connection');
        $table = config('session.table', 'sessions');

        if (! Schema::connection($connection)->hasTable($table)) {
            return 0;
        }

        return DB::connection($connection)
            ->table($table)
            ->where('user_id', $user->id)
            ->delete();
    }

    public function revokeOther(User $user, ?string $currentSessionId = null): int
    {
        $user->tokens()->delete();
        $this->invalidateLoginChallenges($user);

        if (config('session.driver') !== 'database') {
            return 0;
        }

        $connection = config('session.connection');
        $table = config('session.table', 'sessions');

        if (! Schema::connection($connection)->hasTable($table)) {
            return 0;
        }

        return DB::connection($connection)
            ->table($table)
            ->where('user_id', $user->id)
            ->when($currentSessionId, fn ($query) => $query->where('id', '!=', $currentSessionId))
            ->delete();
    }

    private function invalidateLoginChallenges(User $user): void
    {
        if (! Schema::hasTable('login_challenges')) {
            return;
        }

        $user->loginChallenges()
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);
    }
}
