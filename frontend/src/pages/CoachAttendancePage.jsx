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

const formatSchedule = schedule => {
  if (!schedule) return "No schedule configured yet.";

  try {
    const parsed = JSON.parse(schedule);
    if (!Array.isArray(parsed) || parsed.length === 0) return "No schedule configured yet.";
    return parsed.join(", ");
  } catch {
    return schedule;
  }
};

export default function CoachAttendancePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const dateTimeLabel = useLiveDateTime();

  const [activeCluster, setActiveCluster] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
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

  const filteredAttendanceRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return attendanceRows;

    return attendanceRows.filter(member => {
      const name = member.fullname?.toLowerCase() ?? "";
      const tag = member.attendance_tag?.toLowerCase() ?? "";
      return name.includes(query) || tag.includes(query);
    });
  }, [attendanceRows, searchQuery]);

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

              <div className="attendance-controls">
                <label className="attendance-search" htmlFor="attendance-search-input">
                  <span>Search employee</span>
                  <input
                    id="attendance-search-input"
                    type="search"
                    placeholder="Search by name or attendance tag"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                  />
                </label>
              </div>

              {attendanceRows.length === 0 && (
                <div className="empty-state">No employees assigned to the active cluster yet.</div>
              )}

              {attendanceRows.length > 0 && filteredAttendanceRows.length === 0 && (
                <div className="empty-state">No employees match your search.</div>
              )}

              {filteredAttendanceRows.length > 0 && (
                <div className="table-card attendance-table">
                  <div className="table-header attendance-header">
                    <div>Employee</div>
                    <div>Time In</div>
                    <div>Time Out</div>
                    <div>Tag</div>
                    <div>Note</div>
                  </div>
                  {filteredAttendanceRows.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      className="table-row attendance-row-button"
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="table-cell attendance-name">{member.fullname}</div>
                      <div className="table-cell">{formatDateTime(member.time_in_at)}</div>
                      <div className="table-cell">{formatDateTime(member.time_out_at)}</div>
                      <div className="table-cell">{member.attendance_tag ?? "Pending"}</div>
                      <div className="table-cell muted">{member.attendance_note || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {selectedMember && (
                <div className="modal-overlay" role="presentation" onClick={() => setSelectedMember(null)}>
                  <section className="modal-card attendance-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                    <header className="modal-header">
                      <div>
                        <h3 className="modal-title">{selectedMember.fullname}</h3>
                        <p className="modal-subtitle">Attendance details</p>
                      </div>
                      <button type="button" className="btn secondary" onClick={() => setSelectedMember(null)}>
                        Close
                      </button>
                    </header>
                    <div className="modal-body attendance-modal-grid">
                      <div className="attendance-detail-item">
                        <span className="attendance-detail-label">Clock In</span>
                        <span className="attendance-detail-value">{formatDateTime(selectedMember.time_in_at)}</span>
                      </div>
                      <div className="attendance-detail-item">
                        <span className="attendance-detail-label">Clock Out</span>
                        <span className="attendance-detail-value">{formatDateTime(selectedMember.time_out_at)}</span>
                      </div>
                      <div className="attendance-detail-item">
                        <span className="attendance-detail-label">Status</span>
                        <span className="attendance-detail-value">{selectedMember.attendance_tag ?? "Pending"}</span>
                      </div>
                      <div className="attendance-detail-item attendance-detail-note">
                        <span className="attendance-detail-label">Coach Note</span>
                        <span className="attendance-detail-value">{selectedMember.attendance_note || "No note provided."}</span>
                      </div>
                      <div className="attendance-detail-item attendance-detail-note">
                        <span className="attendance-detail-label">Weekly Schedule</span>
                        <span className="attendance-detail-value">{formatSchedule(selectedMember.schedule)}</span>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}