import { useEffect, useState } from "react";
import { apiFetch } from "../api/api";
import useLiveDateTime from "../hooks/useLiveDateTime";
import useCurrentUser from "../hooks/useCurrentUser";

export default function EmployeeDashboard() {
  const statusTags = ["On Time", "Late", "Break Time", "Lunch Time"];
  const navItems = ["Dashboard", "Team", "Attendance", "Schedule"];
  const [data, setData] = useState([]);
  const [activeNav, setActiveNav] = useState("Team");
  const [attendanceLog, setAttendanceLog] = useState({
    timeInAt: null,
    timeOutAt: null,
    tag: null,
    note: ""
  });
  const activeCluster = data[0];
  const dateTimeLabel = useLiveDateTime();
  const { user } = useCurrentUser();

  const normalizeSchedule = schedule => {
    if (!schedule) return schedule;
    if (typeof schedule === "string") {
      try {
        return JSON.parse(schedule);
      } catch {
        return schedule;
      }
    }
    return schedule;
  };

  const formatScheduleTime = schedule => {
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      return "Time TBD";
    }
    const startTime = schedule.startTime ?? "9:00";
    const startPeriod = schedule.startPeriod ?? "AM";
    const endTime = schedule.endTime ?? "5:00";
    const endPeriod = schedule.endPeriod ?? "PM";
    return `${startTime} ${startPeriod}–${endTime} ${endPeriod}`;
  };

  const formatBreakTimeRange = (
    startTime,
    startPeriod,
    endTime,
    endPeriod
  ) => {
    if (!startTime || !endTime) return "—";
    return `${startTime} ${startPeriod ?? ""}–${endTime} ${endPeriod ?? ""}`.trim();
  };

  const formatEmployeeDayTime = day => {
    const schedule = activeCluster?.schedule;
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      return "—";
    }

    const assignedDays = Array.isArray(schedule.days) ? schedule.days : [];
    if (!assignedDays.includes(day)) return "—";

    const daySchedule = schedule.daySchedules?.[day];
    if (!daySchedule || typeof daySchedule !== "object") {
      return {
        shift: formatScheduleTime(schedule),
        lunchBreak: "—",
        breakTime: "—"
      };
    }

    return {
      shift: formatScheduleTime(daySchedule),
      lunchBreak: formatBreakTimeRange(
        daySchedule.lunchBreakStartTime,
        daySchedule.lunchBreakStartPeriod,
        daySchedule.lunchBreakEndTime,
        daySchedule.lunchBreakEndPeriod
      ),
      breakTime: formatBreakTimeRange(
        daySchedule.breakStartTime,
        daySchedule.breakStartPeriod,
        daySchedule.breakEndTime,
        daySchedule.breakEndPeriod
      )
    };
  };

  const toMinutes = (time, period) => {
    const [hourPart, minutePart] = String(time).split(":");
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 1 ||
      hour > 12 ||
      ![0, 30].includes(minute)
    ) {
      return null;
    }

    const normalizedHour = hour % 12;
    const periodOffset = period === "PM" ? 12 * 60 : 0;
    return normalizedHour * 60 + minute + periodOffset;
  };

  const getTodaySchedule = () => {
    const schedule = activeCluster?.schedule;
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      return null;
    }

    const currentDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
    const assignedDays = Array.isArray(schedule.days) ? schedule.days : [];
    if (!assignedDays.includes(currentDay)) return null;

    return schedule.daySchedules?.[currentDay] ?? null;
  };

  const isTimeWithinRange = (nowMinutes, startTime, startPeriod, endTime, endPeriod) => {
    const startMinutes = toMinutes(startTime, startPeriod);
    const endMinutes = toMinutes(endTime, endPeriod);

    if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
      return false;
    }

    if (endMinutes < startMinutes) {
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }

    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  };

  const getCurrentStatus = () => {
    const daySchedule = getTodaySchedule();
    if (!daySchedule) {
      return { label: "Not available", className: "status-not-available" };
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (
      !isTimeWithinRange(
        nowMinutes,
        daySchedule.startTime,
        daySchedule.startPeriod,
        daySchedule.endTime,
        daySchedule.endPeriod
      )
    ) {
      return { label: "Not available", className: "status-not-available" };
    }

    if (
      isTimeWithinRange(
        nowMinutes,
        daySchedule.lunchBreakStartTime,
        daySchedule.lunchBreakStartPeriod,
        daySchedule.lunchBreakEndTime,
        daySchedule.lunchBreakEndPeriod
      )
    ) {
      return { label: "On lunch break", className: "status-lunch" };
    }

    if (
      isTimeWithinRange(
        nowMinutes,
        daySchedule.breakStartTime,
        daySchedule.breakStartPeriod,
        daySchedule.breakEndTime,
        daySchedule.breakEndPeriod
      )
    ) {
      return { label: "On break time", className: "status-break" };
    }

    return { label: "Available", className: "status-available" };
  };

  const formatClockTime = date => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }).format(date);
  };

  const persistAttendance = async nextAttendance => {
    if (!activeCluster?.cluster_id) {
      setAttendanceLog(nextAttendance);
      return;
    }

    const response = await apiFetch("api/save_attendance.php", {
      method: "POST",
      body: JSON.stringify({
        cluster_id: activeCluster.cluster_id,
        ...nextAttendance,
        timeInAt: nextAttendance.timeInAt ? nextAttendance.timeInAt.toISOString() : null,
        timeOutAt: nextAttendance.timeOutAt ? nextAttendance.timeOutAt.toISOString() : null
      })
    });

    const savedAttendance = response.attendance ?? {};
    setAttendanceLog({
      timeInAt: savedAttendance.timeInAt ? new Date(savedAttendance.timeInAt) : null,
      timeOutAt: savedAttendance.timeOutAt ? new Date(savedAttendance.timeOutAt) : null,
      tag: savedAttendance.tag ?? null,
      note: savedAttendance.note ?? ""
    });
  };

  const handleTimeIn = async () => {
    if (attendanceLog.timeInAt && !attendanceLog.timeOutAt) {
      setAttendanceLog(prev => ({
        ...prev,
        note: "You are already timed in. Please click Time Out before timing in again."
      }));
      return;
    }

    const now = new Date();
    const daySchedule = getTodaySchedule();

    if (!daySchedule) {
      await persistAttendance({
        timeInAt: now,
        timeOutAt: null,
        tag: "Late",
        note: "No active schedule for today."
      });
      return;
    }

    const scheduledStartMinutes = toMinutes(daySchedule.startTime, daySchedule.startPeriod);
    if (scheduledStartMinutes === null) {
      await persistAttendance({
        timeInAt: now,
        timeOutAt: null,
        tag: "Late",
        note: "Today's start time is not configured."
      });
      return;
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const lateThreshold = scheduledStartMinutes + 15;
    const tag = nowMinutes <= lateThreshold ? "On Time" : "Late";

   await persistAttendance({
      timeInAt: now,
      timeOutAt: null,
      tag,
      note: tag === "On Time" ? "You timed in within the grace period." : "You timed in after the 15-minute grace period."
    });
  };

  const handleTimeOut = async () => {
    if (!attendanceLog.timeInAt || attendanceLog.timeOutAt) {
      setAttendanceLog(prev => ({
        ...prev,
        note: "You must be timed in before clicking Time Out."
      }));
      return;
    }

    const nextAttendance = {
      ...attendanceLog,
      timeOutAt: new Date(),
      note: attendanceLog.timeInAt ? attendanceLog.note : "Please time in before timing out."
    };
    await persistAttendance(nextAttendance);
  };

  const getStatusTag = statusLabel => {
    if (statusLabel === "On lunch break") return "Lunch Time";
    if (statusLabel === "On break time") return "Break Time";
    if (statusLabel === "Not available") return "Late";
    if (statusLabel === "Available") return "On Time";
    return null;
  };

  const getActiveDays = schedule => {
    if (!schedule) return [];
    if (Array.isArray(schedule)) {
      return schedule.map(day => day.slice(0, 3));
    }
    if (typeof schedule === "object") {
      const days = Array.isArray(schedule.days) ? schedule.days : [];
      return days.map(day => day.slice(0, 3));
    }
    return [];
  };

  const scheduleDays = getActiveDays(activeCluster?.schedule);
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentStatus = getCurrentStatus();
  const activeAttendanceTag = attendanceLog.tag ?? getStatusTag(currentStatus.label);
  const hasActiveTimeIn = Boolean(attendanceLog.timeInAt && !attendanceLog.timeOutAt);
  const canClickTimeIn = !hasActiveTimeIn;
  const canClickTimeOut = hasActiveTimeIn;

  useEffect(() => {
    apiFetch("api/employee_clusters.php").then(response => {
      const normalized = response.map(cluster => ({
        ...cluster,
        schedule: normalizeSchedule(cluster.schedule)
      }));
      setData(normalized);
      const active = normalized[0];
      if (active) {
        setAttendanceLog({
          timeInAt: active.time_in_at ? new Date(active.time_in_at) : null,
          timeOutAt: active.time_out_at ? new Date(active.time_out_at) : null,
          tag: active.attendance_tag ?? null,
          note: active.attendance_note ?? ""
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("auth/logout.php", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("teamClusterUser");
      window.location.href = "/login";
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="avatar">EM</div>
          <div>
            <div>Employee</div>
            <div className="user-meta">{user?.fullname ?? "Employee"}</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map(item => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activeNav === item ? "active" : ""}`}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <button className="sidebar-footer" type="button" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{activeNav.toUpperCase()}</h2>
            <div className="section-title">
              {activeNav === "Dashboard" ? "Employee time tracking" : "My team cluster overview"}
            </div>
          </div>
          <span className="datetime">{dateTimeLabel}</span>
        </header>

        <section className="content content-muted">
          {activeNav === "Dashboard" && (
            <div className="employee-card employee-attendance-card">
              <div className="employee-card-header">
                <div className="employee-card-title">Time In / Time Out</div>
              </div>
              <div className="employee-card-body employee-attendance-body">
                <p className="employee-attendance-copy">
                  This control marks your status as <strong>On Time</strong> when you time in on schedule or within 15 minutes after start time.
                </p>
                <div className="employee-attendance-actions">
                  <button type="button" className="btn primary" onClick={handleTimeIn} disabled={!canClickTimeIn}>
                    Time In
                  </button>
                  <button type="button" className="btn secondary" onClick={handleTimeOut} disabled={!canClickTimeOut}>
                    Time Out
                  </button>
                </div>
                <div className="employee-attendance-log">
                  <div><strong>Time In:</strong> {formatClockTime(attendanceLog.timeInAt)}</div>
                  <div><strong>Time Out:</strong> {formatClockTime(attendanceLog.timeOutAt)}</div>
                  <div>
                    <strong>Status Tag:</strong>{" "}
                    <span className={`member-status-tag ${attendanceLog.tag ? "is-active" : ""}`}>
                      {attendanceLog.tag ?? "Pending"}
                    </span>
                  </div>
                  <div><strong>Note:</strong> {attendanceLog.note || "—"}</div>
                </div>
              </div>
            </div>
          )}

          {data.length === 0 && (
            <div className="empty-state">No team cluster details available.</div>
          )}

          {data.length > 0 && activeNav !== "Dashboard" && (
            <div className="employee-panel">
              <div className="employee-card">
                <div className="employee-card-header">
                  <div className="employee-card-title">My Team Cluster Details</div>
                </div>
                <div className="employee-card-body">
                  <div className="employee-overview-grid">
                    <div className="employee-field employee-highlight-field">
                      <div className="employee-field-label">Cluster Name</div>
                      <div className="employee-field-value">
                        {activeCluster?.cluster_name ?? "Not assigned"}
                      </div>
                    </div>
                  <div className="employee-field employee-highlight-field">
                      <div className="employee-field-label">Team Coach</div>
                      <div className="employee-field-value">
                        {activeCluster?.coach_name ?? "Pending"}
                      </div>
                    </div>
                    <div className="employee-field employee-inline-stat">
                      <div className="employee-field-label">Assigned Days</div>
                      <div className="employee-field-value employee-stat-value">
                        {scheduleDays.length}
                      </div>
                    </div>
                    <div className="employee-field employee-inline-stat">
                      <div className="employee-field-label">Weekly Status</div>
                      <div className="employee-field-value employee-stat-value">
                        {scheduleDays.length > 0 ? "Schedule set" : "Pending"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="employee-field employee-highlight-field">
                      <div className="employee-field-label">Latest Attendance Tag</div>
                      <div className="employee-field-value">
                        <span className={`member-status-tag ${activeAttendanceTag ? "is-active" : ""}`}>
                          {activeAttendanceTag ?? "Pending"}
                        </span>
                      </div>
                    </div>
                <div className="employee-card-footer">
                </div>
              </div>
              <div className="employee-card">
                <div className="employee-card-header">
                  <div className="employee-card-title">My Schedule</div>
                </div>
                <div className="employee-card-body">
                  <div className="active-members-schedule-table employee-schedule-table" role="table" aria-label="My schedule">
                    <div className="active-members-schedule-header" role="row">
                      <span role="columnheader">Member</span>
                      {dayLabels.map(day => (
                        <span key={`${day}-header`} role="columnheader">{day}</span>
                      ))}
                      <span role="columnheader">Status and Tags</span>
                    </div>
                    <div className="active-members-schedule-row" role="row">
                      <div className="active-members-owner" role="cell">
                        {user?.fullname ?? "Employee"}
                      </div>
                      {dayLabels.map(day => {
                        const dayInfo = formatEmployeeDayTime(day);

                        if (typeof dayInfo === "string") {
                          return (
                            <div key={`${day}-value`} role="cell">{dayInfo}</div>
                          );
                        }

                        return (
                          <div key={`${day}-value`} role="cell" className="active-day-cell">
                            <div>{dayInfo.shift}</div>
                            <span className="active-day-tag lunch-tag">
                              Lunch break: {dayInfo.lunchBreak}
                            </span>
                            <span className="active-day-tag break-tag">
                              Break time: {dayInfo.breakTime}
                            </span>
                          </div>
                        );
                      })}
                      <div role="cell" className="member-status-and-tags-cell">
                        <span className={`member-status-pill ${currentStatus.className}`}>
                          {currentStatus.label}
                        </span>
                        <div className="member-status-tag-list" aria-label="Status tags">
                          {statusTags.map(tag => (
                            <span
                              key={`employee-${tag}`}
                              className={`member-status-tag ${activeAttendanceTag === tag ? "is-active" : ""}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                   <div className="employee-schedule-caption">
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}