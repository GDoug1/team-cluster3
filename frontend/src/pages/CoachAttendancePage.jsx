import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import useLiveDateTime from "../hooks/useLiveDateTime";
import useCurrentUser from "../hooks/useCurrentUser";

const formatDateTime = value => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function CoachAttendancePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const dateTimeLabel = useLiveDateTime();

  const [activeCluster, setActiveCluster] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadAttendance = async () => {
      setLoading(true);
      setError("");

      try {
        const clusters = await apiFetch("api/coach_clusters.php");
        const cluster = clusters.find(item => item.status === "active") ?? null;

        if (ignore) return;
        setActiveCluster(cluster);

        if (!cluster) {
          setAttendanceRows([]);
          return;
        }

        const members = await apiFetch(`api/manage_members.php?cluster_id=${cluster.id}`);
        if (ignore) return;
        setAttendanceRows(members);
      } catch (err) {
        if (ignore) return;
        setError(err?.error ?? "Unable to load attendance records.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadAttendance();

    return () => {
      ignore = true;
    };
  }, []);

  const attendanceSummary = useMemo(() => {
    const total = attendanceRows.length;
    const timedIn = attendanceRows.filter(member => member.time_in_at && !member.time_out_at).length;
    const completed = attendanceRows.filter(member => member.time_in_at && member.time_out_at).length;

    return { total, timedIn, completed };
  }, [attendanceRows]);

  const handleLogout = async () => {
    try {
      await apiFetch("auth/logout.php", { method: "POST" });
    } catch {
      console.error("Logout failed");
    } finally {
      localStorage.removeItem("teamClusterUser");
      window.location.href = "/login";
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="avatar">TC</div>
          <div>
            <div>Team Coach</div>
            <div className="user-meta">{user?.fullname ?? "Team Coach"}</div>
          </div>
        </div>

        <nav className="nav">
          <button className="nav-item" type="button" onClick={() => navigate("/coach")}>Dashboard</button>
          <button className="nav-item" type="button" onClick={() => navigate("/coach")}>Team</button>
          <button className="nav-item active" type="button">Attendance</button>
          <button className="nav-item" type="button" onClick={() => navigate("/coach")}>Schedule</button>
        </nav>

        <button className="sidebar-footer" type="button" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>ATTENDANCE</h2>
            <div className="nav-item">Team Coach Attendance Page</div>
          </div>
          <div className="toolbar">
            <span className="datetime">{dateTimeLabel}</span>
            <button className="btn secondary" type="button" onClick={() => navigate("/coach")}>Back to Dashboard</button>
          </div>
        </header>

        <section className="content">
          {loading && <div className="modal-text">Loading attendance records...</div>}
          {!loading && error && <div className="error">{error}</div>}

          {!loading && !error && !activeCluster && (
            <div className="empty-state">No active team cluster found. Attendance records will appear once a cluster is active.</div>
          )}

          {!loading && !error && activeCluster && (
            <>
              <div className="section-title">{activeCluster.name} Attendance</div>
              <div className="attendance-summary-grid">
                <div className="overview-card">
                  <div className="overview-label">Employees</div>
                  <div className="overview-value">{attendanceSummary.total}</div>
                </div>
                <div className="overview-card">
                  <div className="overview-label">Timed In</div>
                  <div className="overview-value">{attendanceSummary.timedIn}</div>
                </div>
                <div className="overview-card">
                  <div className="overview-label">Completed Shift</div>
                  <div className="overview-value">{attendanceSummary.completed}</div>
                </div>
              </div>

              {attendanceRows.length === 0 && (
                <div className="empty-state">No employees assigned to the active cluster yet.</div>
              )}

              {attendanceRows.length > 0 && (
                <div className="table-card attendance-table">
                  <div className="table-header">
                    <div>Employee</div>
                    <div>Time In</div>
                    <div>Time Out</div>
                    <div>Tag</div>
                    <div>Note</div>
                  </div>
                  {attendanceRows.map(member => (
                    <div key={member.id} className="table-row">
                      <div className="table-cell">{member.fullname}</div>
                      <div className="table-cell">{formatDateTime(member.time_in_at)}</div>
                      <div className="table-cell">{formatDateTime(member.time_out_at)}</div>
                      <div className="table-cell">{member.attendance_tag ?? "Pending"}</div>
                      <div className="table-cell muted">{member.attendance_note || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}