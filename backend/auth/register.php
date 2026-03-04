<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include "../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON payload"]);
    exit;
}

$fullname = trim($data['fullname'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$role = strtolower(trim($data['role'] ?? ''));

if (!$fullname || !$email || !$password || !$role) {
    http_response_code(400);
    echo json_encode(["error" => "All fields required"]);
    exit;
}

if (!in_array($role, ["coach", "employee", "admin"], true)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid role"]);
    exit;
}

$check = $conn->prepare("SELECT id FROM users WHERE email=?");
if (!$check) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to validate email", "details" => $conn->error]);
    exit;
}

$check->bind_param("s", $email);
if (!$check->execute()) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to validate email", "details" => $check->error]);
    exit;
}

$check->store_result();
if ($check->num_rows > 0) {
    http_response_code(409);
    echo json_encode(["error" => "Email already exists"]);
    exit;
}

$hashed = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare(
    "INSERT INTO users (fullname, email, password, role)
     VALUES (?, ?, ?, ?)"
);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to create account", "details" => $conn->error]);
    exit;
}

$stmt->bind_param("ssss", $fullname, $email, $hashed, $role);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to create account", "details" => $stmt->error]);
    exit;
}

echo json_encode(["success" => true]);