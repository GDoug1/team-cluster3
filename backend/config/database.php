<?php
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';
$dbName = getenv('DB_NAME') ?: 'cluster2';

$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($conn->connect_error) {
    http_response_code(500);
    exit(json_encode([
        "error" => "DB connection failed",
        "details" => $conn->connect_error
    ]));
}

$conn->set_charset('utf8mb4');