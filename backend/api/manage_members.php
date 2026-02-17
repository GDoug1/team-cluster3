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
        ON al.id = (
            SELECT al2.id
            FROM attendance_logs al2
            WHERE al2.cluster_id = cm.cluster_id
              AND al2.employee_id = cm.employee_id
            ORDER BY COALESCE(al2.time_in_at, al2.updated_at) DESC, al2.id DESC
            LIMIT 1
        )
     WHERE cm.cluster_id=$cluster_id"
);

$members = [];
while ($m = $res->fetch_assoc()) {
    $m["attendance_history"] = [];
    $members[] = $m;
}

$historyRes = $conn->query(
    "SELECT employee_id,
            DATE_FORMAT(COALESCE(time_in_at, time_out_at, updated_at), '%Y-%m') AS month_key,
            DATE_FORMAT(COALESCE(time_in_at, time_out_at, updated_at), '%M %Y') AS month_label,
            time_in_at,
            time_out_at,
            tag,
            note
     FROM attendance_logs
     WHERE cluster_id=$cluster_id
     ORDER BY COALESCE(time_in_at, time_out_at, updated_at) DESC, id DESC"
);

$historyByEmployee = [];
while ($history = $historyRes->fetch_assoc()) {
    $employeeId = (int)$history["employee_id"];
    if (!isset($historyByEmployee[$employeeId])) {
        $historyByEmployee[$employeeId] = [];
    }

    $monthKey = $history["month_key"];
    if (!isset($historyByEmployee[$employeeId][$monthKey])) {
        $historyByEmployee[$employeeId][$monthKey] = [
            "month" => $history["month_label"],
            "entries" => []
        ];
    }

    $historyByEmployee[$employeeId][$monthKey]["entries"][] = [
        "time_in_at" => $history["time_in_at"],
        "time_out_at" => $history["time_out_at"],
        "tag" => $history["tag"],
        "note" => $history["note"]
    ];
}

foreach ($members as &$member) {
    $memberId = (int)$member["id"];
    if (isset($historyByEmployee[$memberId])) {
        $member["attendance_history"] = array_values($historyByEmployee[$memberId]);
    }
}
unset($member);

echo json_encode($members);