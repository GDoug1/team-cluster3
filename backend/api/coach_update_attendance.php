<?php
include "../config/database.php";
include "../config/auth.php";
requireRole("coach");

$data = json_decode(file_get_contents("php://input"), true);

$cluster_id = isset($data["cluster_id"]) ? (int)$data["cluster_id"] : 0;
$employee_id = isset($data["employee_id"]) ? (int)$data["employee_id"] : 0;
$timeInAt = isset($data["timeInAt"]) ? $data["timeInAt"] : null;
$timeOutAt = isset($data["timeOutAt"]) ? $data["timeOutAt"] : null;
$tag = isset($data["tag"]) ? $data["tag"] : null;
$note = isset($data["note"]) ? $data["note"] : "";
$attendanceId = isset($data["attendance_id"]) ? (int)$data["attendance_id"] : 0;

if ($cluster_id <= 0 || $employee_id <= 0 || $attendanceId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request."]);
    exit;
}

$coach_id = (int)$_SESSION["user"]["id"];
$ownershipCheck = $conn->query(
    "SELECT id FROM clusters WHERE id=$cluster_id AND coach_id=$coach_id LIMIT 1"
);

if (!$ownershipCheck || $ownershipCheck->num_rows === 0) {
    http_response_code(403);
    echo json_encode(["error" => "You can only edit attendance for your active cluster."]);
    exit;
}

$memberCheck = $conn->query(
    "SELECT id FROM cluster_members WHERE cluster_id=$cluster_id AND employee_id=$employee_id LIMIT 1"
);

if (!$memberCheck || $memberCheck->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["error" => "Employee is not part of this cluster."]);
    exit;
}

$timeInSql = $timeInAt ? date("Y-m-d H:i:s", strtotime($timeInAt)) : null;
$timeOutSql = $timeOutAt ? date("Y-m-d H:i:s", strtotime($timeOutAt)) : null;

if ($timeInAt && !$timeInSql) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid time-in value."]);
    exit;
}

if ($timeOutAt && !$timeOutSql) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid time-out value."]);
    exit;
}

if ($timeInSql && $timeOutSql && strtotime($timeOutSql) < strtotime($timeInSql)) {
    http_response_code(400);
    echo json_encode(["error" => "Time out cannot be earlier than time in."]);
    exit;
}

$timeInValue = $timeInSql ? "'" . $conn->real_escape_string($timeInSql) . "'" : "NULL";
$timeOutValue = $timeOutSql ? "'" . $conn->real_escape_string($timeOutSql) . "'" : "NULL";
$tagValue = ($tag !== null && $tag !== "") ? "'" . $conn->real_escape_string($tag) . "'" : "NULL";
$noteValue = "'" . $conn->real_escape_string($note) . "'";

$attendanceCheck = $conn->query(
    "SELECT id
     FROM attendance_logs
     WHERE id=$attendanceId
       AND cluster_id=$cluster_id
       AND employee_id=$employee_id
     LIMIT 1"
);

if (!$attendanceCheck || $attendanceCheck->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["error" => "Attendance record not found for this employee."]);
    exit;
}

$conn->query(
    "UPDATE attendance_logs
     SET time_in_at=$timeInValue,
         time_out_at=$timeOutValue,
         tag=$tagValue,
         note=$noteValue
     WHERE id=$attendanceId"
);

echo json_encode([
    "success" => true,
    "attendance" => [
        "timeInAt" => $timeInSql,
        "timeOutAt" => $timeOutSql,
        "tag" => $tag,
        "note" => $note
    ]
]);