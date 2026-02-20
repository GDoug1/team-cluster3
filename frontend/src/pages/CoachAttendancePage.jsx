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
  const [searchQuery, setSearchQuery] = useState("");
  const [historyDateStartFilter, setHistoryDateStartFilter] = useState("");
  const [historyDateEndFilter, setHistoryDateEndFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [editForm, setEditForm] = useState({
    timeInAt: "",
    timeOutAt: "",
    tag: "",
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const toDateInputValue = value => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toDateTimeLocalValue = value => {
    if (!value) return "";
    const parsedValue = typeof value === "string" ? value.replace(" ", "T") : value;
    const date = new Date(parsedValue);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toSqlDateTimeValue = value => {
    if (!value) return null;
    return `${value.replace("T", " ")}:00`;
  };

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

  const filteredAttendanceHistory = useMemo(() => {
    if (!selectedMember || !Array.isArray(selectedMember.attendance_history)) return [];
    if (!historyDateStartFilter && !historyDateEndFilter) return selectedMember.attendance_history;

    const activeStartDate = historyDateStartFilter || null;
    const activeEndDate = historyDateEndFilter || null;

    return selectedMember.attendance_history
      .map(monthHistory => ({
        ...monthHistory,
        entries: monthHistory.entries.filter(entry => {
          const entryDate = toDateInputValue(entry.time_in_at ?? entry.time_out_at);
          if (!entryDate) return false;

          if (activeStartDate && entryDate < activeStartDate) return false;
          if (activeEndDate && entryDate > activeEndDate) return false;
          return true;
        }),
      }))
      .filter(monthHistory => monthHistory.entries.length > 0);
  }, [historyDateEndFilter, historyDateStartFilter, selectedMember]);

  const attendanceHistoryEntries = useMemo(() => (
    filteredAttendanceHistory.flatMap(monthHistory => monthHistory.entries ?? [])
  ), [filteredAttendanceHistory]);

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
                  </div>
                  {filteredAttendanceRows.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      className="table-row attendance-row-button"
                      onClick={() => {
                        setSelectedMember(member);
                        setEditForm({
                          timeInAt: toDateTimeLocalValue(member.time_in_at),
                          timeOutAt: toDateTimeLocalValue(member.time_out_at),
                          tag: member.attendance_tag ?? "",
                          note: member.attendance_note ?? "",
                        });
                        setSaveFeedback("");
                        setHistoryDateStartFilter("");
                        setHistoryDateEndFilter("");
                      }}
                    >
                      <div className="table-cell attendance-name">{member.fullname}</div>
                      <div className="table-cell">{formatDateTime(member.time_in_at)}</div>
                      <div className="table-cell">{formatDateTime(member.time_out_at)}</div>
                      <div className="table-cell">{member.attendance_tag ?? "Pending"}</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedMember && (
                <div className="modal-overlay" role="presentation" onClick={() => {
                        setSelectedMember(null);
                        setSaveFeedback("");
                        setHistoryDateStartFilter("");
                        setHistoryDateEndFilter("");
                      }}>
                  <section className="modal-card attendance-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                    <header className="modal-header">
                      <div>
                        <h3 className="modal-title">{selectedMember.fullname}</h3>
                        <p className="modal-subtitle">Attendance details</p>
                      </div>
                      <button type="button" className="btn secondary" onClick={() => {
                        setSelectedMember(null);
                        setSaveFeedback("");
                        setHistoryDateStartFilter("");
                        setHistoryDateEndFilter("");
                      }}>
                        Close
                      </button>
                    </header>
                    <div className="modal-body attendance-modal-grid">
                      <div className="attendance-detail-item attendance-detail-note">
                        <span className="attendance-detail-label">Edit Latest Attendance</span>
                        <div className="attendance-history-range-filter" role="group" aria-label="Edit latest attendance values">
                          <label className="attendance-history-filter" htmlFor="coach-attendance-time-in">
                            <span>Time In</span>
                            <input
                              id="coach-attendance-time-in"
                              type="datetime-local"
                              value={editForm.timeInAt}
                              onChange={event => setEditForm(current => ({ ...current, timeInAt: event.target.value }))}
                            />
                          </label>
                          <label className="attendance-history-filter" htmlFor="coach-attendance-time-out">
                            <span>Time Out</span>
                            <input
                              id="coach-attendance-time-out"
                              type="datetime-local"
                              value={editForm.timeOutAt}
                              onChange={event => setEditForm(current => ({ ...current, timeOutAt: event.target.value }))}
                            />
                          </label>
                          <label className="attendance-history-filter" htmlFor="coach-attendance-tag">
                            <span>Tag</span>
                            <input
                              id="coach-attendance-tag"
                              type="text"
                              value={editForm.tag}
                              onChange={event => setEditForm(current => ({ ...current, tag: event.target.value }))}
                            />
                          </label>
                          <label className="attendance-history-filter" htmlFor="coach-attendance-note">
                            <span>Note</span>
                            <input
                              id="coach-attendance-note"
                              type="text"
                              value={editForm.note}
                              onChange={event => setEditForm(current => ({ ...current, note: event.target.value }))}
                            />
                          </label>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="btn"
                            disabled={isSaving}
                            onClick={async () => {
                              if (!activeCluster) return;

                              setIsSaving(true);
                              setSaveFeedback("");
                              try {
                                await apiFetch("api/coach_update_attendance.php", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    cluster_id: activeCluster.id,
                                    employee_id: selectedMember.id,
                                    timeInAt: toSqlDateTimeValue(editForm.timeInAt),
                                    timeOutAt: toSqlDateTimeValue(editForm.timeOutAt),
                                    tag: editForm.tag.trim() || null,
                                    note: editForm.note,
                                  }),
                                });

                                const refreshedMembers = await apiFetch(`api/manage_members.php?cluster_id=${activeCluster.id}`);
                                setAttendanceRows(refreshedMembers);
                                const refreshedMember = refreshedMembers.find(member => Number(member.id) === Number(selectedMember.id));
                                if (refreshedMember) {
                                  setSelectedMember(refreshedMember);
                                  setEditForm({
                                    timeInAt: toDateTimeLocalValue(refreshedMember.time_in_at),
                                    timeOutAt: toDateTimeLocalValue(refreshedMember.time_out_at),
                                    tag: refreshedMember.attendance_tag ?? "",
                                    note: refreshedMember.attendance_note ?? "",
                                  });
                                }
                                setSaveFeedback("Attendance updated successfully.");
                              } catch (saveError) {
                                setSaveFeedback(saveError?.error ?? "Unable to update attendance.");
                              } finally {
                                setIsSaving(false);
                              }
                            }}
                          >
                            {isSaving ? "Saving..." : "Save Attendance"}
                          </button>
                        </div>
                        {saveFeedback && <span className="attendance-detail-value">{saveFeedback}</span>}
                      </div>
                      <div className="attendance-detail-item attendance-detail-note">
                        <span className="attendance-detail-label">Attendance History</span>
                        {Array.isArray(selectedMember.attendance_history) && selectedMember.attendance_history.length > 0 ? (
                          <>
                            <div className="attendance-history-range-filter" role="group" aria-label="Filter attendance history by date range">
                              <label className="attendance-history-filter" htmlFor="attendance-history-date-filter-start">
                                <span>From</span>
                                <input
                                  id="attendance-history-date-filter-start"
                                  type="date"
                                  value={historyDateStartFilter}
                                  onChange={event => setHistoryDateStartFilter(event.target.value)}
                                />
                              </label>
                              <label className="attendance-history-filter" htmlFor="attendance-history-date-filter-end">
                                <span>To</span>
                                <input
                                  id="attendance-history-date-filter-end"
                                  type="date"
                                  value={historyDateEndFilter}
                                  onChange={event => setHistoryDateEndFilter(event.target.value)}
                                />
                              </label>
                            </div>
                            {attendanceHistoryEntries.length > 0 && (
                              <div className="employee-attendance-history-table" role="table" aria-label="Attendance history">
                                <div className="employee-attendance-history-header" role="row">
                                  <span role="columnheader">Date</span>
                                  <span role="columnheader">Cluster</span>
                                  <span role="columnheader">Time In</span>
                                  <span role="columnheader">Time Out</span>
                                  <span role="columnheader">Tag</span>
                                </div>
                                {attendanceHistoryEntries.map((entry, index) => (
                                  <div
                                    key={`${entry.time_in_at ?? entry.time_out_at ?? "history"}-${index}`}
                                    className="employee-attendance-history-row"
                                    role="row"
                                  >
                                    <span role="cell">{formatDateTime(entry.time_in_at ?? entry.time_out_at)}</span>
                                    <span role="cell">{activeCluster?.name ?? "—"}</span>
                                    <span role="cell">{formatDateTime(entry.time_in_at)}</span>
                                    <span role="cell">{formatDateTime(entry.time_out_at)}</span>
                                    <span role="cell">
                                      <span className={`member-status-tag ${entry.tag ? "is-active" : ""}`}>
                                        {entry.tag ?? "Pending"}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {attendanceHistoryEntries.length === 0 && (
                              <span className="attendance-detail-value">No attendance records match the selected date range.</span>
                            )}
                          </>
                        ) : (
                          <span className="attendance-detail-value">No attendance history yet.</span>
                        )}
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