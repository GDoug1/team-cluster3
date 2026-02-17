<?php
include "../config/database.php";
include "../config/auth.php";
requireRole("employee");

$res = $conn->query(
    "SELECT
        c.id cluster_id,
        c.name cluster_name,
        u.fullname coach_name,
        s.schedule,
        al.time_in_at,
        al.time_out_at,
        al.tag attendance_tag,
        al.note attendance_note
     FROM cluster_members cm
     JOIN clusters c ON cm.cluster_id=c.id
     JOIN users u ON c.coach_id=u.id
     LEFT JOIN schedules s
        ON s.cluster_id=c.id
        AND s.employee_id=cm.employee_id
     LEFT JOIN attendance_logs al
        ON al.id = (
            SELECT al2.id
            FROM attendance_logs al2
            WHERE al2.cluster_id = c.id
              AND al2.employee_id = cm.employee_id
            ORDER BY COALESCE(al2.time_in_at, al2.updated_at) DESC, al2.id DESC
            LIMIT 1
        )
     WHERE cm.employee_id={$_SESSION['user']['id']}
     AND c.status='active'"
);

$out = [];
while ($r = $res->fetch_assoc()) {
    $out[] = $r;
}
echo json_encode($out);