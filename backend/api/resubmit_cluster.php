<?php
include "../config/database.php";
include "../config/auth.php";
requireRole("coach");

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$cluster_id = (int)($data["cluster_id"] ?? 0);
$name = trim($data["name"] ?? "");
$description = trim($data["description"] ?? "");
$coach_id = (int)$_SESSION["user"]["id"];

if ($cluster_id <= 0) {
    http_response_code(422);
    exit(json_encode(["error" => "Cluster id is required."]));
}

if ($name === "") {
    http_response_code(422);
    exit(json_encode(["error" => "Cluster name is required."]));
}

$safe_name = $conn->real_escape_string($name);
$safe_description = $conn->real_escape_string($description);

$res = $conn->query(
    "UPDATE clusters
     SET name='$safe_name',
         description='$safe_description',
         status='pending',
         rejection_reason=NULL
     WHERE id=$cluster_id AND coach_id=$coach_id AND status='rejected'"
);

if ($res !== true) {
    http_response_code(500);
    exit(json_encode(["error" => "Failed to resubmit cluster."]));
}

if ($conn->affected_rows === 0) {
    http_response_code(404);
    exit(json_encode(["error" => "Rejected cluster not found."]));
}

echo json_encode(["success" => true]);