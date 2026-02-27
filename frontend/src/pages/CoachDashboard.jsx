import { useEffect, useState } from "react";
import { apiFetch } from "../api/api";
import useLiveDateTime from "../hooks/useLiveDateTime";
import useCurrentUser from "../hooks/useCurrentUser";

export default function CoachDashboard() {
  const statusTags = ["On Time", "Late", "Pending"];
  const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const defaultDaySchedule = {
    startTime: "9:00",
    startPeriod: "AM",
    endTime: "5:00",
    endPeriod: "PM",
    lunchBreakStartTime: "12:00",
    lunchBreakStartPeriod: "PM",
    lunchBreakEndTime: "12:30",
    lunchBreakEndPeriod: "PM",
    breakStartTime: "3:00",
    breakStartPeriod: "PM",
    breakEndTime: "3:30",
    breakEndPeriod: "PM"
  };
  const timeOptions = Array.from({ length: 24 }, (_, index) => {
    const hour = Math.floor(index / 2) + 1;
    const minute = (index % 2) * 30;
    return `${hour}:${minute.toString().padStart(2, "0")}`;
  });
  const MAX_SHIFT_MINUTES = 9 * 60;
  const [clusters, setClusters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState({ name: "", description: "" });
  const [editingClusterId, setEditingClusterId] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const [activeCluster, setActiveCluster] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberError, setMemberError] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState("");
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [scheduleMember, setScheduleMember] = useState(null);
  const [scheduleError, setScheduleError] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isDisbanding, setIsDisbanding] = useState(false);
  const [activeMembers, setActiveMembers] = useState([]);
  const [activeMembersLoading, setActiveMembersLoading] = useState(false);
  const [activeMembersError, setActiveMembersError] = useState("");
  const [activeMemberTagFilter, setActiveMemberTagFilter] = useState("all");
  const [confirmState, setConfirmState] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    daySchedules: {
      Mon: { ...defaultDaySchedule },
      Tue: { ...defaultDaySchedule },
      Wed: { ...defaultDaySchedule },
      Thu: { ...defaultDaySchedule },
      Fri: { ...defaultDaySchedule }
    }
  });
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

  const createDaySchedules = (days = [], baseSchedule = {}) => {
    const daySchedules = {};
    dayOptions.forEach(day => {
      daySchedules[day] = {
        startTime: baseSchedule.startTime ?? "9:00",
        startPeriod: baseSchedule.startPeriod ?? "AM",
        endTime: baseSchedule.endTime ?? "6:00",
        endPeriod: baseSchedule.endPeriod ?? "PM",
        lunchBreakStartTime: baseSchedule.lunchBreakStartTime ?? baseSchedule.lunchBreakTime ?? "12:00",
        lunchBreakStartPeriod: baseSchedule.lunchBreakStartPeriod ?? baseSchedule.lunchBreakPeriod ?? "PM",
        lunchBreakEndTime: baseSchedule.lunchBreakEndTime ?? "1:00",
        lunchBreakEndPeriod: baseSchedule.lunchBreakEndPeriod ?? "PM",
        breakStartTime: baseSchedule.breakStartTime ?? baseSchedule.breakTime ?? "3:00",
        breakStartPeriod: baseSchedule.breakStartPeriod ?? baseSchedule.breakPeriod ?? "PM",
        breakEndTime: baseSchedule.breakEndTime ?? "3:30",
        breakEndPeriod: baseSchedule.breakEndPeriod ?? "PM"
      };
    });

    if (baseSchedule && typeof baseSchedule === "object") {
      const source =
        baseSchedule.daySchedules && typeof baseSchedule.daySchedules === "object"
          ? baseSchedule.daySchedules
          : {};

      Object.entries(source).forEach(([day, value]) => {
        if (!dayOptions.includes(day) || !value || typeof value !== "object") return;
        daySchedules[day] = {
          startTime: value.startTime ?? daySchedules[day].startTime,
          startPeriod: value.startPeriod ?? daySchedules[day].startPeriod,
          endTime: value.endTime ?? daySchedules[day].endTime,
          endPeriod: value.endPeriod ?? daySchedules[day].endPeriod,
          lunchBreakStartTime:
            value.lunchBreakStartTime ?? value.lunchBreakTime ?? daySchedules[day].lunchBreakStartTime,
          lunchBreakStartPeriod:
            value.lunchBreakStartPeriod ?? value.lunchBreakPeriod ?? daySchedules[day].lunchBreakStartPeriod,
          lunchBreakEndTime: value.lunchBreakEndTime ?? daySchedules[day].lunchBreakEndTime,
          lunchBreakEndPeriod: value.lunchBreakEndPeriod ?? daySchedules[day].lunchBreakEndPeriod,
          breakStartTime: value.breakStartTime ?? value.breakTime ?? daySchedules[day].breakStartTime,
          breakStartPeriod: value.breakStartPeriod ?? value.breakPeriod ?? daySchedules[day].breakStartPeriod,
          breakEndTime: value.breakEndTime ?? daySchedules[day].breakEndTime,
          breakEndPeriod: value.breakEndPeriod ?? daySchedules[day].breakEndPeriod
        };
      });
    }

    days.forEach(day => {
      if (!dayOptions.includes(day)) return;
      if (!daySchedules[day]) {
        daySchedules[day] = { ...defaultDaySchedule };
      }
    });

    return daySchedules;
  };

  const buildScheduleForm = schedule => {
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
      const defaultDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      return {
        days: defaultDays,
        daySchedules: createDaySchedules(defaultDays)
      };
    }

    const days = Array.isArray(schedule.days)
      ? schedule.days.filter(day => dayOptions.includes(day))
      : ["Mon", "Tue", "Wed", "Thu", "Fri"];

    return {
      days,
      daySchedules: createDaySchedules(days, schedule)
    };
  };

  const formatTimeRange = schedule => {
    if (!schedule || typeof schedule !== "object") return "";
    const startTime = schedule.startTime ?? "9:00";
    const startPeriod = schedule.startPeriod ?? "AM";
    const endTime = schedule.endTime ?? "5:00";
    const endPeriod = schedule.endPeriod ?? "PM";
    return `${startTime} ${startPeriod} - ${endTime} ${endPeriod}`;
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

  const getEndTimeOptions = (startTime, startPeriod) => {
    const startMinutes = toMinutes(startTime, startPeriod);
    if (startMinutes === null) {
      return timeOptions.map(time => ({ time, period: "AM" }));
    }

    const validOptions = [];
    for (let offset = 30; offset <= MAX_SHIFT_MINUTES; offset += 30) {
      const totalMinutes = startMinutes + offset;
      const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

      const hour24 = Math.floor(normalizedMinutes / 60);
      const minute = normalizedMinutes % 60;
      const period = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 || 12;
      validOptions.push({
        time: `${hour12}:${String(minute).padStart(2, "0")}`,
        period
      });
    }

    return validOptions;
  };

  const getTimeOptionsWithinRange = (startTime, startPeriod, endTime, endPeriod) => {
    const startMinutes = toMinutes(startTime, startPeriod);
    const endMinutes = toMinutes(endTime, endPeriod);

    if (startMinutes === null || endMinutes === null) {
      return [];
    }

    let rangeEndMinutes = endMinutes;
    if (endMinutes < startMinutes) {
      rangeEndMinutes += 24 * 60;
    }

    const options = [];
    let current = startMinutes;
    while (current <= rangeEndMinutes) {
      const normalizedMinutes = ((current % (24 * 60)) + 24 * 60) % (24 * 60);
      const hour24 = Math.floor(normalizedMinutes / 60);
      const minute = normalizedMinutes % 60;
      const period = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 || 12;
      options.push({
        time: `${hour12}:${String(minute).padStart(2, "0")}`,
        period
      });
      current += 30;
    }

    return options;
  };

  const formatBreakTimeRange = (startTime, startPeriod, endTime, endPeriod) => {
    if (!startTime || !startPeriod || !endTime || !endPeriod) return "—";
    return `${startTime} ${startPeriod} - ${endTime} ${endPeriod}`;
  };

  const isTimeWithinRange = (
    nowMinutes,
    startTime,
    startPeriod,
    endTime,
    endPeriod
  ) => {
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

  const getCurrentDayLabel = () => {
    const dayIndex = new Date().getDay();
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIndex];
  };

  const getMemberCurrentStatus = member => {
    const normalizedSchedule = normalizeSchedule(member?.schedule);
    if (
      !normalizedSchedule ||
      typeof normalizedSchedule !== "object" ||
      Array.isArray(normalizedSchedule)
    ) {
      return null;
    }

    const assignedDays = Array.isArray(normalizedSchedule.days)
      ? normalizedSchedule.days
      : [];
    if (assignedDays.length === 0) {
      return null;
    }

    const currentDay = getCurrentDayLabel();
    const isWorkingToday = assignedDays.includes(currentDay);

    if (!isWorkingToday) {
      return { label: "Not available", className: "status-not-available" };
    }

    const daySchedule = normalizedSchedule.daySchedules?.[currentDay];
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

  const getMemberStatusTag = statusLabel => {
    if (statusLabel === "On lunch break") return "Lunch Time";
    if (statusLabel === "On break time") return "Break Time";
    if (statusLabel === "Not available") return "Pending";
    if (statusLabel === "Available") return "On Time";
    return null;
  };

  const getActiveStatusTag = member => {
    const status = getMemberCurrentStatus(member);
    return member.attendance_tag ?? getMemberStatusTag(status?.label);
  };

  const filteredActiveMembers = activeMembers.filter(member => {
    if (activeMemberTagFilter === "all") return true;
    return getActiveStatusTag(member) === activeMemberTagFilter;
  });

  const filteredAvailableEmployees = availableEmployees.filter(employee =>
    employee.fullname
      .toLowerCase()
      .includes(employeeSearchQuery.trim().toLowerCase())
  );

  useEffect(() => {
    apiFetch("api/coach_clusters.php").then(setClusters);
  }, []);

useEffect(() => {
    const active = clusters.find(cluster => cluster.status === "active");
    if (!active) {
      setActiveMembers([]);
      setActiveMembersError("");
      setActiveMembersLoading(false);
      return;
    }

    setActiveMembersLoading(true);
    setActiveMembersError("");

    apiFetch(`api/manage_members.php?cluster_id=${active.id}`)
      .then(memberData => {
        const normalizedMembers = memberData.map(member => ({
          ...member,
          schedule: normalizeSchedule(member.schedule)
        }));
        setActiveMembers(normalizedMembers);
      })
      .catch(err => {
        setActiveMembersError(err?.error ?? "Unable to load active team members.");
      })
      .finally(() => {
        setActiveMembersLoading(false);
      });
  }, [clusters]);

  useEffect(() => {
    if (!activeCluster) return;
    setMemberLoading(true);
    setEmployeeLoading(true);
    setMemberError("");
    setEmployeeError("");
    setShowMemberForm(false);
    setSelectedEmployee("");
    setEmployeeSearchQuery("");

    Promise.all([
      apiFetch(`api/manage_members.php?cluster_id=${activeCluster.id}`),
      apiFetch("api/employee_list.php")
    ])
      .then(([memberData, employeeData]) => {
        const normalizedMembers = memberData.map(member => ({
          ...member,
          schedule: normalizeSchedule(member.schedule)
        }));
        setMembers(normalizedMembers);
        const assigned = new Set(memberData.map(member => member.id));
        setAvailableEmployees(
          employeeData.filter(employee => !assigned.has(employee.id))
        );
      })
      .catch(err => {
        const message = err?.error ?? "Unable to load team members.";
        setMemberError(message);
        setEmployeeError(message);
      })
      .finally(() => {
        setMemberLoading(false);
        setEmployeeLoading(false);
      });
  }, [activeCluster]);

  const handleLogout = async () => {
    try {
      await apiFetch("auth/logout.php", { method: "POST" });
    } catch {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("teamClusterUser");
      window.location.href = "/login";
    }
  };

  const handleChange = event => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const formatDate = value => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (isSubmitting) return;
    if (clusters.length > 0) {
      setError("Only one team cluster is allowed per team coach.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        name: formValues.name.trim(),
        description: formValues.description.trim()
      };

      const created = await apiFetch("api/create_cluster.php", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setClusters(prev => [created, ...prev]);
      setFormValues({ name: "", description: "" });
      setShowForm(false);
    } catch (err) {
      setError(err?.error ?? "Unable to create cluster.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClusterId(null);
    setFormValues({ name: "", description: "" });
    setError("");
  };

  const handleManageClick = cluster => {
    setActiveCluster(cluster);
  };

  const handleEditCluster = cluster => {
    if (!cluster || cluster.status !== "rejected") return;

    setShowForm(true);
    setEditingClusterId(cluster.id);
    setFormValues({
      name: cluster.name ?? "",
      description: cluster.description ?? ""
    });
    setError("");
  };

  const handleReuploadCluster = async cluster => {
    if (!cluster || isReuploading) return;

    const trimmedName = formValues.name.trim();
    const trimmedDescription = formValues.description.trim();

    if (!trimmedName) {
      setError("Cluster name is required.");
      return;
    }

    setIsReuploading(true);
    setError("");

    try {
      await apiFetch("api/resubmit_cluster.php", {
        method: "POST",
        body: JSON.stringify({
          cluster_id: cluster.id,
          name: trimmedName,
          description: trimmedDescription
        })
      });
      setClusters(prev =>
        prev.map(item =>
          item.id === cluster.id
            ? {
                ...item,
                name: trimmedName,
                description: trimmedDescription,
                status: "pending",
                rejection_reason: null
              }
            : item
        )
      );
      setEditingClusterId(null);
      setShowForm(false);
      setFormValues({ name: "", description: "" });
    } catch (err) {
      setError(err?.error ?? "Unable to re-upload cluster for review.");
    } finally {
      setIsReuploading(false);
    }
  };

  const handleDisbandCluster = async cluster => {
    if (!cluster || isDisbanding) return;
    setConfirmState({
      title: "Disband cluster?",
      message: `Disband ${cluster.name}? This will remove all members and schedules.`,
      confirmLabel: "Disband",
      variant: "danger",
      onConfirm: async () => {
        setIsDisbanding(true);
        setError("");

        try {
          await apiFetch("api/disband_cluster.php", {
            method: "POST",
            body: JSON.stringify({ cluster_id: cluster.id })
          });
          setClusters(prev => prev.filter(item => item.id !== cluster.id));
          if (activeCluster?.id === cluster.id) {
            handleCloseModal();
          }
          setShowForm(false);
        } catch (err) {
          setError(err?.error ?? "Unable to disband cluster.");
        } finally {
          setIsDisbanding(false);
        }
      }
    });
  };

  const handleCloseModal = () => {
    setActiveCluster(null);
    setMembers([]);
    setAvailableEmployees([]);
    setMemberError("");
    setEmployeeError("");
    setScheduleMember(null);
    setScheduleError("");
    setShowMemberForm(false);
    setSelectedEmployee("");
    setEmployeeSearchQuery("");
  };

  const handleOpenSchedule = member => {
    const normalizedSchedule = normalizeSchedule(member?.schedule);
    setScheduleMember({ ...member, schedule: normalizedSchedule });
    setScheduleError("");
    setScheduleForm(buildScheduleForm(normalizedSchedule));
  };

  const handleCloseSchedule = () => {
    setScheduleMember(null);
    setScheduleError("");
  };

  const handleToggleDay = day => {
    setScheduleForm(prev => {
      const hasDay = prev.days.includes(day);
      return {
        ...prev,
         days: hasDay ? prev.days.filter(item => item !== day) : [...prev.days, day],
        daySchedules: {
          ...prev.daySchedules,
          [day]: prev.daySchedules?.[day] ?? { ...defaultDaySchedule }
        }
      };
    });
  };

  const handleChangeDayTime = (day, field, value) => {
    setScheduleForm(prev => {
      const baseDaySchedule = prev.daySchedules?.[day] ?? { ...defaultDaySchedule };
      const currentDaySchedule = { ...baseDaySchedule };

      if (["endTime", "lunchBreakStart", "lunchBreakEnd", "breakStart", "breakEnd"].includes(field)) {
        const [time, period] = String(value).split("|");

        if (field === "endTime") {
          currentDaySchedule.endTime = time ?? baseDaySchedule.endTime;
          currentDaySchedule.endPeriod = period ?? baseDaySchedule.endPeriod;
        }

        if (field === "lunchBreakStart") {
          currentDaySchedule.lunchBreakStartTime = time ?? baseDaySchedule.lunchBreakStartTime;
          currentDaySchedule.lunchBreakStartPeriod = period ?? baseDaySchedule.lunchBreakStartPeriod;
        }

        if (field === "lunchBreakEnd") {
          currentDaySchedule.lunchBreakEndTime = time ?? baseDaySchedule.lunchBreakEndTime;
          currentDaySchedule.lunchBreakEndPeriod = period ?? baseDaySchedule.lunchBreakEndPeriod;
        }

        if (field === "breakStart") {
          currentDaySchedule.breakStartTime = time ?? baseDaySchedule.breakStartTime;
          currentDaySchedule.breakStartPeriod = period ?? baseDaySchedule.breakStartPeriod;
        }

        if (field === "breakEnd") {
          currentDaySchedule.breakEndTime = time ?? baseDaySchedule.breakEndTime;
          currentDaySchedule.breakEndPeriod = period ?? baseDaySchedule.breakEndPeriod;
        }
      } else {
        currentDaySchedule[field] = value;
      }

      const endTimeOptions = getEndTimeOptions(
        currentDaySchedule.startTime,
        currentDaySchedule.startPeriod
      );
      const hasSelectedEndTime = endTimeOptions.some(
        option =>
          option.time === currentDaySchedule.endTime &&
          option.period === currentDaySchedule.endPeriod
      );

      if (!hasSelectedEndTime && endTimeOptions.length > 0) {
        currentDaySchedule.endTime = endTimeOptions[0].time;
        currentDaySchedule.endPeriod = endTimeOptions[0].period;
      }

      const shiftRangeOptions = getTimeOptionsWithinRange(
        currentDaySchedule.startTime,
        currentDaySchedule.startPeriod,
        currentDaySchedule.endTime,
        currentDaySchedule.endPeriod
      );

      const hasLunchStart = shiftRangeOptions.some(
        option =>
          option.time === currentDaySchedule.lunchBreakStartTime &&
          option.period === currentDaySchedule.lunchBreakStartPeriod
      );
      if (!hasLunchStart && shiftRangeOptions.length > 0) {
        currentDaySchedule.lunchBreakStartTime = shiftRangeOptions[0].time;
        currentDaySchedule.lunchBreakStartPeriod = shiftRangeOptions[0].period;
      }

      const lunchEndOptions = getTimeOptionsWithinRange(
        currentDaySchedule.lunchBreakStartTime,
        currentDaySchedule.lunchBreakStartPeriod,
        currentDaySchedule.endTime,
        currentDaySchedule.endPeriod
      );
      const hasLunchEnd = lunchEndOptions.some(
        option =>
          option.time === currentDaySchedule.lunchBreakEndTime &&
          option.period === currentDaySchedule.lunchBreakEndPeriod
      );
      if (!hasLunchEnd && lunchEndOptions.length > 0) {
        currentDaySchedule.lunchBreakEndTime = lunchEndOptions[0].time;
        currentDaySchedule.lunchBreakEndPeriod = lunchEndOptions[0].period;
      }

      const hasBreakStart = shiftRangeOptions.some(
        option =>
          option.time === currentDaySchedule.breakStartTime &&
          option.period === currentDaySchedule.breakStartPeriod
      );
      if (!hasBreakStart && shiftRangeOptions.length > 0) {
        const fallbackBreak = shiftRangeOptions[Math.min(1, shiftRangeOptions.length - 1)] ?? shiftRangeOptions[0];
        currentDaySchedule.breakStartTime = fallbackBreak.time;
        currentDaySchedule.breakStartPeriod = fallbackBreak.period;
      }

      const breakEndOptions = getTimeOptionsWithinRange(
        currentDaySchedule.breakStartTime,
        currentDaySchedule.breakStartPeriod,
        currentDaySchedule.endTime,
        currentDaySchedule.endPeriod
      );
      const hasBreakEnd = breakEndOptions.some(
        option =>
          option.time === currentDaySchedule.breakEndTime &&
          option.period === currentDaySchedule.breakEndPeriod
      );
      if (!hasBreakEnd && breakEndOptions.length > 0) {
        currentDaySchedule.breakEndTime = breakEndOptions[0].time;
        currentDaySchedule.breakEndPeriod = breakEndOptions[0].period;
      }


      return {
        ...prev,
        daySchedules: {
          ...prev.daySchedules,
          [day]: currentDaySchedule
        }
      };
    });
  };

  const getScheduleSummary = member => {
    const normalizedSchedule = normalizeSchedule(member?.schedule);
    if (!normalizedSchedule || Array.isArray(normalizedSchedule)) {
      return "Not scheduled";
    }

    const days = Array.isArray(normalizedSchedule.days) ? normalizedSchedule.days : [];
    if (days.length === 0) return "Not scheduled";

    const firstDaySchedule = normalizedSchedule.daySchedules?.[days[0]];
    if (!firstDaySchedule) return "Schedule set";

    const firstRange = formatTimeRange(firstDaySchedule);
    const hasMixedRanges = days.some(day => {
      const daySchedule = normalizedSchedule.daySchedules?.[day];
      if (!daySchedule) return true;
      return formatTimeRange(daySchedule) !== firstRange;
    });

    return hasMixedRanges ? "Variable shifts" : firstRange;
  };

  const getAssignedDays = member => {
    const normalizedSchedule = normalizeSchedule(member?.schedule);
    if (
      normalizedSchedule &&
      typeof normalizedSchedule === "object" &&
      !Array.isArray(normalizedSchedule) &&
      Array.isArray(normalizedSchedule.days) &&
      normalizedSchedule.days.length > 0
    ) {
      return normalizedSchedule.days;
    }

    if (Array.isArray(normalizedSchedule) && normalizedSchedule.length > 0) {
      return normalizedSchedule;
    }

    return [];
  };

  const formatActiveMemberDayTime = (member, day) => {
    const normalizedSchedule = normalizeSchedule(member?.schedule);

    if (
      normalizedSchedule &&
      typeof normalizedSchedule === "object" &&
      !Array.isArray(normalizedSchedule)
    ) {
      const isAssigned = Array.isArray(normalizedSchedule.days)
        ? normalizedSchedule.days.includes(day)
        : false;
      if (!isAssigned) return "—";

      const daySchedule = normalizedSchedule.daySchedules?.[day];
      if (!daySchedule) return "Schedule set";

      return {
        shift: formatTimeRange(daySchedule),
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
    }

    if (Array.isArray(normalizedSchedule)) {
      return normalizedSchedule.includes(day)
        ? { shift: "Schedule set", lunchBreak: "—", breakTime: "—" }
        : "—";
    }

    return "—";
  };

  const handleSaveSchedule = async () => {
    if (!scheduleMember || !activeCluster || isSavingSchedule) return;
    setIsSavingSchedule(true);
    setScheduleError("");

    try {
      const payload = {
        cluster_id: activeCluster.id,
        employee_id: scheduleMember.id,
        schedule: scheduleForm
      };

      await apiFetch("api/save_schedule.php", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setMembers(prev =>
        prev.map(member =>
          member.id === scheduleMember.id
            ? { ...member, schedule: scheduleForm }
            : member
        )
      );
      setActiveMembers(prev =>
        prev.map(member =>
          member.id === scheduleMember.id
            ? { ...member, schedule: scheduleForm }
            : member
        )
      );
      setScheduleMember(prev =>
        prev ? { ...prev, schedule: scheduleForm } : prev
      );
      handleCloseSchedule();
    } catch (err) {
      setScheduleError(err?.error ?? "Unable to save schedule.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedEmployee || isAddingMember || !activeCluster) return;
    setIsAddingMember(true);
    setMemberError("");

    try {
      const added = await apiFetch("api/add_member.php", {
        method: "POST",
        body: JSON.stringify({
          cluster_id: activeCluster.id,
          employee_id: Number(selectedEmployee)
        })
      });
      setMembers(prev => [...prev, added]);
      setActiveMembers(prev => [...prev, added]);
      setAvailableEmployees(prev =>
        prev.filter(employee => employee.id !== added.id)
      );
      setSelectedEmployee("");
      setEmployeeSearchQuery("");
      setShowMemberForm(false);
      setClusters(prev =>
        prev.map(cluster =>
          cluster.id === activeCluster.id
            ? { ...cluster, members: Number(cluster.members ?? 0) + 1 }
            : cluster
        )
      );
    } catch (err) {
      setMemberError(err?.error ?? "Unable to add member.");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteMember = async member => {
    if (!member || !activeCluster || isDeletingMember) return;
    setConfirmState({
      title: "Remove member?",
      message: `Remove ${member.fullname} from ${activeCluster.name}?`,
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: async () => {
        setIsDeletingMember(true);
        setMemberError("");

        try {
          await apiFetch("api/delete_member.php", {
            method: "POST",
            body: JSON.stringify({
              cluster_id: activeCluster.id,
              employee_id: member.id
            })
          });

          setMembers(prev => prev.filter(item => item.id !== member.id));
          setActiveMembers(prev => prev.filter(item => item.id !== member.id));
          setAvailableEmployees(prev => [...prev, { id: member.id, fullname: member.fullname }]);
          setClusters(prev =>
            prev.map(cluster =>
              cluster.id === activeCluster.id
                ? {
                    ...cluster,
                    members: Math.max(Number(cluster.members ?? 1) - 1, 0)
                  }
                : cluster
            )
          );
        } catch (err) {
          setMemberError(err?.error ?? "Unable to remove member.");
        } finally {
          setIsDeletingMember(false);
        }
      }
    });
  };

      const handleConfirmAction = async () => {
    if (!confirmState?.onConfirm) return;
    await confirmState.onConfirm();
    setConfirmState(null);
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
          <div className="nav-item">Dashboard</div>
          <div className="nav-item active">Team</div>
          <button className="nav-item" type="button" onClick={() => (window.location.href = "/coach/attendance")}>Attendance</button>
          <div className="nav-item">Schedule</div>
        </nav>

        <button className="sidebar-footer" type="button" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>DASHBOARD</h2>
            <div className="nav-item">Team Coach Dashboard</div>
          </div>
          <div className="toolbar">
            <span className="datetime">{dateTimeLabel}</span>
           {clusters.length === 0 && (
              <button
                className="btn primary"
                type="button"
                onClick={() => setShowForm(prev => !prev)}
              >
                {showForm ? "Close" : "+ Add Cluster"}
              </button>
            )}
          </div>
        </header>

        <section className="content">
          {showForm && (clusters.length === 0 || editingClusterId !== null) && (
            <form
              className="card cluster-form"
              onSubmit={
                editingClusterId !== null
                  ? event => {
                      event.preventDefault();
                      const cluster = clusters.find(item => item.id === editingClusterId);
                      if (cluster) {
                        handleReuploadCluster(cluster);
                      }
                    }
                  : handleSubmit
              }
            >
              <div className="form-header">
                {editingClusterId !== null ? "Edit Rejected Team Cluster" : "Create Team Cluster"}
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Cluster Name</span>
                  <input
                    name="name"
                    value={formValues.name}
                    onChange={handleChange}
                    placeholder="Enter a cluster name"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Description</span>
                  <textarea
                    name="description"
                    value={formValues.description}
                    onChange={handleChange}
                    placeholder="Add a short description"
                    rows={3}
                  />
                </label>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="form-actions">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  className="btn primary"
                  type="submit"
                  disabled={
                    editingClusterId !== null
                      ? isReuploading || !formValues.name.trim()
                      : isSubmitting || !formValues.name.trim()
                  }
                >
                  {editingClusterId !== null
                    ? isReuploading
                      ? "Re-uploading..."
                      : "Save & Re-upload"
                    : isSubmitting
                      ? "Creating..."
                      : "Create"}
                </button>
              </div>
            </form>
          )}
          <div className="section-title">Manage your team clusters</div>

          {clusters.length === 0 && (
            <div className="empty-state">No clusters assigned yet.</div>
          )}
        
          {clusters.length > 0 && (
            <div className="table-card">
              <div className="table-header">
                <div>Cluster Name</div>
                <div>Description</div>
                <div>Members</div>
                <div>Created</div>
                <div>Status</div>
                <div>Rejection Reason</div>
                <div>Action</div>
              </div>
             {clusters.map(c => (
                <div key={c.id} className="table-row">
                  <div className="table-cell">{c.name}</div>
                  <div className="table-cell muted">
                    {c.description || "—"}
                  </div>
                  <div className="table-cell">{c.members ?? 0}</div>
                  <div className="table-cell">{formatDate(c.created_at)}</div>
                  <div className="table-cell">
                    <span className={`badge ${c.status}`}>{c.status}</span>
                  </div>
                  <div className="table-cell muted">
                    {c.rejection_reason || "—"}
                  </div>
                  <div className="table-cell">
                    <button
                      className="btn link"
                      type="button"
                      disabled={c.status !== "active"}
                      onClick={() => handleManageClick(c)}
                    >
                      Manage
                    </button>
                    {c.status === "rejected" && (
                      <>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => handleEditCluster(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() =>
                            editingClusterId === c.id ? handleReuploadCluster(c) : handleEditCluster(c)
                          }
                          disabled={isReuploading && editingClusterId === c.id}
                        >
                          {isReuploading && editingClusterId === c.id ? "Re-uploading..." : "Re-upload"}
                        </button>
                      </>
                    )}
                    <button
                      className="btn danger"
                      type="button"
                      onClick={() => handleDisbandCluster(c)}
                      disabled={isDisbanding}
                    >
                      {isDisbanding ? "Disbanding..." : "Disband"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {clusters.some(cluster => cluster.status === "active") && (
            <div className="active-team-panel">
              <div className="active-team-header">
                <div className="section-title">Active Team Members</div>
                <label className="active-team-filter" htmlFor="active-member-tag-filter">
                  <span>Filter by Tag</span>
                  <select
                    id="active-member-tag-filter"
                    className="member-select"
                    value={activeMemberTagFilter}
                    onChange={event => setActiveMemberTagFilter(event.target.value)}
                  >
                    <option value="all">All Tags</option>
                    {statusTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </label>
              </div>
              {activeMembersLoading && (
                <div className="modal-text">Loading members...</div>
              )}
              {!activeMembersLoading && activeMembersError && (
                <div className="error">{activeMembersError}</div>
              )}
              {!activeMembersLoading && !activeMembersError && activeMembers.length === 0 && (
                <div className="empty-state">No employees added to the active cluster yet.</div>
              )}
              {!activeMembersLoading && !activeMembersError && activeMembers.length > 0 && filteredActiveMembers.length === 0 && (
                <div className="empty-state">No employees match the selected tag.</div>
              )}
              {!activeMembersLoading && !activeMembersError && filteredActiveMembers.length > 0 && (
                <div className="active-members-schedule-table" role="table" aria-label="Active team schedule">
                  <div className="active-members-schedule-header" role="row">
                    <span role="columnheader">Members</span>
                    <span role="columnheader">Mon</span>
                    <span role="columnheader">Tue</span>
                    <span role="columnheader">Wed</span>
                    <span role="columnheader">Thu</span>
                    <span role="columnheader">Fri</span>
                    <span role="columnheader">Sat</span>
                    <span role="columnheader">Sun</span>
                    <span role="columnheader">Status and Tags</span>
                  </div>
                  {filteredActiveMembers.map(member => {
                    const status = getMemberCurrentStatus(member);
                    const activeStatusTag = getActiveStatusTag(member);
                    return (
                      <div key={member.id} className="active-members-schedule-row" role="row">
                        <div className="active-members-owner" role="cell">{member.fullname}</div>
                        {dayOptions.map(day => {
                          const dayInfo = formatActiveMemberDayTime(member, day);

                          if (typeof dayInfo === "string") {
                            return (
                              <div key={`${member.id}-${day}`} role="cell">{dayInfo}</div>
                            );
                          }

                          return (
                            <div key={`${member.id}-${day}`} role="cell" className="active-day-cell">
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
                          {status && (
                            <>
                              <span className={`member-status-pill ${status.className}`}>{status.label}</span>
                              <div className="member-status-tag-list" aria-label="Status tags">
                                {statusTags.map(tag => (
                                  <span
                                    key={`${member.id}-${tag}`}
                                    className={`member-status-tag ${activeStatusTag === tag ? "is-active" : ""}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
        {activeCluster && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card manage-team-modal">
              <div className="modal-header">
                <div>
                  <div className="modal-title">Manage Team</div>
                  <div className="modal-subtitle">
                    Cluster Name: {activeCluster.name}
                  </div>
                </div>
                <button
                   className="btn link modal-close-btn"
                  type="button"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
              <div className="modal-body">
                <p className="modal-text">
                  Add or update members for this team cluster.
                </p>
                <div className="manage-team-summary">
                  <div className="summary-pill">
                    <span className="summary-label">Team members</span>
                    <span className="summary-value">{members.length}</span>
                  </div>
                  <div className="summary-pill summary-pill-muted">
                    <span className="summary-label">Available employees</span>
                    <span className="summary-value">{availableEmployees.length}</span>
                  </div>
                </div>
                {memberLoading ? (
                  <div className="modal-text">Loading members...</div>
                ) : (
                  <div className="member-list manage-team-list">
                    {members.length === 0 && (
                      <div className="empty-surface">No members assigned yet.</div>
                    )}
                    {members.length > 0 && (
                      <div className="member-header">
                        <span>Members</span>
                        <span>Current Schedule</span>
                        <span>Assigned Days</span>
                        <span className="member-action-col">Actions</span>
                      </div>
                    )}
                    {members.map(member => (
                      <div key={member.id} className="member-item">
                        <div className="member-name">{member.fullname}</div>
                        <div className="member-schedule-summary">
                          {getScheduleSummary(member)}
                        </div>
                        <div className="member-days">
                          {getAssignedDays(member).length > 0 ? (
                            <div className="member-day-chips">
                              {getAssignedDays(member).map(day => (
                                <span key={`${member.id}-${day}`} className="member-day-chip">
                                  {day}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "Not scheduled"
                          )}
                        </div>
                        <div className="member-action">
                          <button
                            className="btn link"
                            type="button"
                            onClick={() => handleOpenSchedule(member)}
                          >
                            Schedule
                          </button>
                          <button
                            className="btn danger"
                            type="button"
                            onClick={() => handleDeleteMember(member)}
                            disabled={isDeletingMember}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {memberError && <div className="error">{memberError}</div>}
                <div className="member-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => setShowMemberForm(prev => !prev)}
                    disabled={employeeLoading || availableEmployees.length === 0}
                  >
                    {showMemberForm ? "Hide add member form" : "+ Add Member"}
                  </button>
                  {employeeLoading && (
                    <span className="modal-text">Loading employees...</span>
                  )}
                  {!employeeLoading &&
                    availableEmployees.length === 0 &&
                    !employeeError && (
                      <span className="modal-text">
                        All employees are already assigned.
                      </span>
                    )}
                </div>
                {employeeError && <div className="error">{employeeError}</div>}
                {showMemberForm && availableEmployees.length > 0 && (
                 <div className="member-form manage-team-form-card">
                    <div className="member-form-head">
                      <div className="member-form-title">Add a new member</div>
                      <p className="member-form-subtitle">
                        Search by name, pick the employee, then confirm to assign them.
                      </p>
                    </div>
                    <div className="member-form-inputs">
                      <label className="form-field">
                        <span>Search employee</span>
                        <input
                          type="search"
                          className="member-search-input"
                          value={employeeSearchQuery}
                          onChange={event => setEmployeeSearchQuery(event.target.value)}
                          placeholder="Type a name"
                        />
                      </label>
                      <label className="form-field">
                        <span>Select employee</span>
                        <select
                          className="member-select"
                          value={selectedEmployee}
                          onChange={event => setSelectedEmployee(event.target.value)}
                        >
                          <option value="">Choose a member</option>
                          {filteredAvailableEmployees.map(employee => (
                            <option key={employee.id} value={employee.id}>
                              {employee.fullname}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {filteredAvailableEmployees.length === 0 && (
                      <div className="member-form-empty-state modal-text">
                        No employees match your search.
                      </div>
                    )}
                    <button
                      className="btn secondary member-form-submit"
                      type="button"
                      onClick={handleAddMember}
                      disabled={!selectedEmployee || isAddingMember}
                    >
                      {isAddingMember ? "Adding..." : "Confirm member"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {scheduleMember && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card schedule-modal">
              <div className="modal-header">
                <div>
                  <div className="modal-title">Manage Member Schedule</div>
                  <div className="modal-subtitle">
                    Employee Name: {scheduleMember.fullname}
                  </div>
                </div>
                <button
                   className="btn link modal-close-btn"
                  type="button"
                  onClick={handleCloseSchedule}
                >
                  Close
                </button>
              </div>
              <div className="modal-body">
                <div className="schedule-card">
                  <div className="schedule-heading">
                    <div className="schedule-label">Schedule Details</div>
                    <p className="schedule-helper-text">
                      Turn days on or off, then update the work shift, lunch, and break windows.
                    </p>
                  </div>
                  <div className="schedule-day-grid">
                    {dayOptions.map(day => {
                      const isWorkingDay = scheduleForm.days.includes(day);
                      const daySchedule = scheduleForm.daySchedules?.[day] ?? defaultDaySchedule;
                      const endTimeOptions = getEndTimeOptions(
                        daySchedule.startTime,
                        daySchedule.startPeriod
                      );
                      const shiftRangeOptions = getTimeOptionsWithinRange(
                        daySchedule.startTime,
                        daySchedule.startPeriod,
                        daySchedule.endTime,
                        daySchedule.endPeriod
                      );
                      const lunchBreakEndOptions = getTimeOptionsWithinRange(
                        daySchedule.lunchBreakStartTime,
                        daySchedule.lunchBreakStartPeriod,
                        daySchedule.endTime,
                        daySchedule.endPeriod
                      );
                      const breakEndOptions = getTimeOptionsWithinRange(
                        daySchedule.breakStartTime,
                        daySchedule.breakStartPeriod,
                        daySchedule.endTime,
                        daySchedule.endPeriod
                      );

                      return (
                        <div key={day} className="schedule-day-row">
                          <div className="schedule-day-header">
                            <label className="schedule-day-toggle">
                              <input
                                type="checkbox"
                                checked={isWorkingDay}
                                onChange={() => handleToggleDay(day)}
                              />
                              <span>{day}</span>
                            </label>
                            <span
                              className={`schedule-day-status ${
                                isWorkingDay ? "is-working" : "is-off"
                              }`}
                            >
                              {isWorkingDay ? "Working day" : "Off day"}
                            </span>
                          </div>
                          {isWorkingDay ? (
                            <div className="schedule-time-grid">
                              <div className="schedule-time-label">Start time</div>
                              <div className="schedule-time-label">End time</div>
                              <div className="schedule-time-label-g1">Lunch break start</div>
                              <div className="schedule-time-label">Lunch break end</div>
                              <div className="schedule-time-label-g2">Break time start</div>
                              <div className="schedule-time-label">Break time end</div>

                              <div className="schedule-time-row schedule-start-time">
                                <select
                                  value={daySchedule.startTime}
                                  onChange={event =>
                                    handleChangeDayTime(day, "startTime", event.target.value)
                                  }
                                >
                                  {timeOptions.map(time => (
                                    <option key={`${day}-start-${time}`} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={daySchedule.startPeriod}
                                  onChange={event =>
                                    handleChangeDayTime(day, "startPeriod", event.target.value)
                                  }
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>

                              <div className="schedule-time-row">
                                <select
                                  value={`${daySchedule.endTime}|${daySchedule.endPeriod}`}
                                  onChange={event =>
                                    handleChangeDayTime(day, "endTime", event.target.value)
                                  }
                                >
                                  {endTimeOptions.map(option => (
                                    <option
                                      key={`${day}-end-${option.time}-${option.period}`}
                                      value={`${option.time}|${option.period}`}
                                    >
                                      {option.time} {option.period}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="schedule-time-row-g1">
                                <select
                                  className="schedule-break-select"
                                  value={`${daySchedule.lunchBreakStartTime}|${daySchedule.lunchBreakStartPeriod}`}
                                  onChange={event =>
                                    handleChangeDayTime(day, "lunchBreakStart", event.target.value)
                                  }
                                >
                                  {shiftRangeOptions.map(option => (
                                    <option
                                      key={`${day}-lunch-start-${option.time}-${option.period}`}
                                      value={`${option.time}|${option.period}`}
                                    >
                                      {option.time} {option.period}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="schedule-time-row">
                                <select
                                  className="schedule-break-select"
                                  value={`${daySchedule.lunchBreakEndTime}|${daySchedule.lunchBreakEndPeriod}`}
                                  onChange={event =>
                                    handleChangeDayTime(day, "lunchBreakEnd", event.target.value)
                                  }
                                >
                                  {lunchBreakEndOptions.map(option => (
                                    <option
                                      key={`${day}-lunch-end-${option.time}-${option.period}`}
                                      value={`${option.time}|${option.period}`}
                                    >
                                      {option.time} {option.period}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="schedule-time-row-g2">
                                <select
                                  className="schedule-break-select1"
                                  value={`${daySchedule.breakStartTime}|${daySchedule.breakStartPeriod}`}
                                  onChange={event =>
                                    handleChangeDayTime(day, "breakStart", event.target.value)
                                  }
                                >
                                  {shiftRangeOptions.map(option => (
                                    <option
                                      key={`${day}-break-start-${option.time}-${option.period}`}
                                      value={`${option.time}|${option.period}`}
                                    >
                                      {option.time} {option.period}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="schedule-time-row">
                                <select
                                  className="schedule-break-select1"
                                  value={`${daySchedule.breakEndTime}|${daySchedule.breakEndPeriod}`}
                                  onChange={event =>
                                    handleChangeDayTime(day, "breakEnd", event.target.value)
                                  }
                                >
                                  {breakEndOptions.map(option => (
                                    <option
                                      key={`${day}-break-end-${option.time}-${option.period}`}
                                      value={`${option.time}|${option.period}`}
                                    >
                                      {option.time} {option.period}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="schedule-not-working">Not working</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="form-actions">
                  {scheduleError && <div className="error">{scheduleError}</div>}
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={handleCloseSchedule}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleSaveSchedule}
                    disabled={isSavingSchedule}
                  >
                    {isSavingSchedule ? "Saving..." : "Save Schedule"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmState && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={confirmState.title}>
            <div className="modal-card confirm-modal-card">
              <div>
                <h3 className="confirm-modal-title">{confirmState.title}</h3>
                <p className="confirm-modal-message">{confirmState.message}</p>
              </div>
              <div className="confirm-modal-actions">
                <button
                  className="btn confirm-cancel-btn"
                  type="button"
                  onClick={() => setConfirmState(null)}
                  disabled={isDeletingMember || isDisbanding}
                >
                  Cancel
                </button>
                <button
                  className={`btn ${confirmState.variant === "danger" ? "confirm-danger-btn" : "primary"}`}
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={isDeletingMember || isDisbanding}
                >
                  {confirmState.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}