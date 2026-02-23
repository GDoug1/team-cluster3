<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header("Access-Control-Allow-Origin: {$origin}");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");


if (!isset($_SESSION['user'])) {
    http_response_code(401);
    exit(json_encode(["error" => "Unauthorized"]));
}

function requireRole($role) {
    $currentRole = strtolower($_SESSION['user']['role'] ?? '');
    if ($currentRole !== strtolower($role)) {
        http_response_code(403);
        exit(json_encode(["error" => "Forbidden"]));
    }
}