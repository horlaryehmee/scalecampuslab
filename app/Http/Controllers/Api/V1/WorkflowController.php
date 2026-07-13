<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CampusWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class WorkflowController extends Controller
{
    public function __construct(protected readonly CampusWorkflowService $workflow) {}

    protected function requireRole(Request $request, string ...$roles): User
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless(in_array($this->workflow->normalizedRole($user), $roles, true), 403, 'Forbidden for this role.');

        return $user;
    }

    protected function data(mixed $data, int $status = 200, array $meta = []): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => ['server_time' => now()->toIso8601String(), ...$meta],
        ], $status);
    }
}
