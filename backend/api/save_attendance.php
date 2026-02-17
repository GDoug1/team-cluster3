<?php
include "../config/database.php";
include "../config/auth.php";
requireRole("employee");

$data = json_decode(file_get_contents("php://input"), true);

$cluster_id = isset($data["cluster_id"]) ? (int)$data["cluster_id"] : 0;
$employee_id = (int)$_SESSION["user"]["id"];
$timeInAt = isset($data["timeInAt"]) ? $data["timeInAt"] : null;
$timeOutAt = isset($data["timeOutAt"]) ? $data["timeOutAt"] : null;
$tag = isset($data["tag"]) ? $data["tag"] : null;
$note = isset($data["note"]) ? $data["note"] : "";

if ($cluster_id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid cluster id"]);
    exit;
}

$timeInSql = $timeInAt ? date("Y-m-d H:i:s", strtotime($timeInAt)) : null;
$timeOutSql = $timeOutAt ? date("Y-m-d H:i:s", strtotime($timeOutAt)) : null;

$timeInValue = $timeInSql ? "'" . $conn->real_escape_string($timeInSql) . "'" : "NULL";
$timeOutValue = $timeOutSql ? "'" . $conn->real_escape_string($timeOutSql) . "'" : "NULL";
$tagValue = $tag ? "'" . $conn->real_escape_string($tag) . "'" : "NULL";
$noteValue = "'" . $conn->real_escape_string($note) . "'";

$exists = $conn->query(
    "SELECT id FROM attendance_logs
     WHERE cluster_id=$cluster_id AND employee_id=$employee_id"
);

if ($exists && $exists->num_rows > 0) {
    $conn->query(
        "UPDATE attendance_logs
         SET time_in_at=$timeInValue,
             time_out_at=$timeOutValue,
             tag=$tagValue,
             note=$noteValue
         WHERE cluster_id=$cluster_id
           AND employee_id=$employee_id"
    );
} else {
    $conn->query(
        "INSERT INTO attendance_logs (cluster_id, employee_id, time_in_at, time_out_at, tag, note)
         VALUES ($cluster_id, $employee_id, $timeInValue, $timeOutValue, $tagValue, $noteValue)"
    );
}

echo json_encode([
    "success" => true,
    "attendance" => [
        "timeInAt" => $timeInSql,
        "timeOutAt" => $timeOutSql,
        "tag" => $tag,
        "note" => $note
    ]
]);