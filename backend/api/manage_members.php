<?php
include "../config/database.php";
include "../config/auth.php";
requireRole("coach");

$cluster_id = (int)$_GET['cluster_id'];

$res = $conn->query(
    "SELECT u.id,
            u.fullname,
            s.schedule,
            al.tag AS attendance_tag,
            al.note AS attendance_note,
            al.time_in_at,
            al.time_out_at
     FROM cluster_members cm
     JOIN users u ON cm.employee_id=u.id
     LEFT JOIN schedules s
        ON s.cluster_id=cm.cluster_id
        AND s.employee_id=cm.employee_id
    LEFT JOIN attendance_logs al
        ON al.cluster_id=cm.cluster_id
        AND al.employee_id=cm.employee_id
     WHERE cm.cluster_id=$cluster_id"
);

$members = [];
while ($m = $res->fetch_assoc()) {
    $members[] = $m;
}

echo json_encode($members);