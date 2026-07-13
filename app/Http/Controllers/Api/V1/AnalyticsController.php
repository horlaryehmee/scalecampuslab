<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends WorkflowController
{
    public function index(Request $request): JsonResponse
    {
        return $this->data($this->workflow->metrics($request->user()));
    }
}
