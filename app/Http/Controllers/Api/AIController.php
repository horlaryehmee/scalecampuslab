<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AI\EngagementPredictionService;
use App\Services\AI\ItineraryBuilderService;
use App\Services\AI\PredictiveScoringService;
use App\Services\AI\RouteOptimizationService;
use App\Services\AI\SchoolMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIController extends Controller
{
    public function schoolMatches(Request $request, SchoolMatchingService $service): JsonResponse
    {
        return response()->json($service->handle($request->all()));
    }

    public function predictiveScore(Request $request, PredictiveScoringService $service): JsonResponse
    {
        return response()->json($service->handle($request->all()));
    }

    public function itinerary(Request $request, ItineraryBuilderService $service): JsonResponse
    {
        return response()->json($service->handle($request->all()));
    }

    public function route(Request $request, RouteOptimizationService $service): JsonResponse
    {
        return response()->json($service->handle($request->all()));
    }

    public function engagement(Request $request, EngagementPredictionService $service): JsonResponse
    {
        return response()->json($service->handle($request->all()));
    }
}
