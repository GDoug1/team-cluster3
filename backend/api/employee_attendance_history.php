<?php
include "../config/database.php";
include "../config/auth.php";
requireRole("employee");

$employee_id = (int)$_SESSION["user"]["id"];

$res = $conn->query(
    "SELECT
        al.id,
        al.cluster_id,
        c.name cluster_name,
        al.time_in_at,
        al.time_out_at,
        al.tag,
        al.note,
        al.updated_at
     FROM attendance_logs al
     JOIN clusters c ON c.id = al.cluster_id
     WHERE al.employee_id = $employee_id
     ORDER BY COALESCE(al.time_in_at, al.updated_at) DESC, al.id DESC"
);

$out = [];
while ($row = $res->fetch_assoc()) {
    $out[] = $row;
}

echo json_encode($out);