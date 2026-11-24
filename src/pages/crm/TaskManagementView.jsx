import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { apiFetch } from '../../utils/apiClient';
import { hasUserAccess, getStoredUserPermissions } from '../../utils/userPermissions';
import './TaskManagementView.css';

const TASK_CATEGORIES = [
  'General',
  'Documentation',
  'Customer Follow-up',
  'Billing / Accounting',
  'Banking & Settlements',
  'Government Applications',
  'PAN Card Service',
  'Utility & Bill Payments',
  'Office Administration',
  'Client Verification',
  'Technical Support'
];

const PRIORITIES = [
  { value: 'Low', label: 'Low', color: '#64748b', bg: '#f1f5f9' },
  { value: 'Medium', label: 'Medium', color: '#2563eb', bg: '#eff6ff' },
  { value: 'High', label: 'High', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'Urgent', label: 'Urgent', color: '#ef4444', bg: '#fef2f2' }
];

const WORK_STATUSES = [
  { value: 'Not Started', label: 'Not Started', color: '#64748b', bg: '#f1f5f9', icon: '⚪' },
  { value: 'In Progress', label: 'In Progress', color: '#2563eb', bg: '#eff6ff', icon: '🔄' },
  { value: 'On Hold', label: 'On Hold', color: '#f59e0b', bg: '#fffbeb', icon: '⏸️' },
  { value: 'Completed', label: 'Completed', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
  { value: 'Cancelled', label: 'Cancelled', color: '#94a3b8', bg: '#f8fafc', icon: '❌' }
];

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TaskManagementView({ user, onBack, userPermissions }) {
  const effectivePermissions = useMemo(() => {
    return userPermissions || getStoredUserPermissions();
  }, [userPermissions]);

  // Determine if current user is an employee
  const isEmployee = useMemo(() => {
    return Boolean(
      (user && (user.isEmployee || user.role === 'employee' || user.employeeUid)) ||
      (typeof user === 'string' && user.includes('-EMP')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('userRole') === 'employee') ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('userRole') === 'employee') ||
      (typeof localStorage !== 'undefined' && (localStorage.getItem('currentUser') || '').includes('-EMP'))
    );
  }, [user]);

  // Current employee UID if logged in as employee
  const currentEmployeeUid = useMemo(() => {
    if (typeof user === 'string' && user.includes('-EMP')) return user.trim();
    if (user && typeof user === 'object' && user.employeeUid) return String(user.employeeUid).trim();
    if (user && typeof user === 'object' && typeof user.userId === 'string' && user.userId.includes('-EMP')) return user.userId.trim();
    if (typeof localStorage !== 'undefined') {
      const cur = localStorage.getItem('currentUser') || '';
      if (cur.includes('-EMP')) return cur.trim();
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        if (stored.employeeUid) return String(stored.employeeUid).trim();
      } catch (_) {}
    }
    return null;
  }, [user]);

  // Active Employees for selection
  const [employees, setEmployees] = useState([]);

  const currentEmployeeName = useMemo(() => {
    // If employees list is loaded, find by currentEmployeeUid (guaranteed correct: e.g. "rutuja")
    if (employees && employees.length > 0 && currentEmployeeUid) {
      const matched = employees.find(e => (e.employeeUid || '').toLowerCase() === currentEmployeeUid.toLowerCase());
      if (matched && matched.fullName) return matched.fullName;
    }
    if (user && typeof user === 'object') {
      if (user.fullName) return user.fullName;
      if (user.employeeName) return user.employeeName;
      if (user.name && user.employeeUid) return user.name;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        // Only use stored name if it genuinely belongs to this employeeUid
        if (stored.employeeUid && currentEmployeeUid && stored.employeeUid.toLowerCase() === currentEmployeeUid.toLowerCase()) {
          if (stored.fullName || stored.name) return stored.fullName || stored.name;
        }
      } catch (_) {}
    }
    return currentEmployeeUid || 'Employee';
  }, [user, currentEmployeeUid, employees]);

  // Retailer ID - MUST ALWAYS BE THE CANONICAL RETAILER ID (e.g. MBTAR000010101), NEVER the EMP UID
  const activeRetailerId = useMemo(() => {
    if (typeof user === 'string' && user.trim() && user.trim().toLowerCase() !== 'user' && user.trim().toLowerCase() !== 'admin') {
      const s = user.trim();
      return s.includes('-EMP') ? s.split('-EMP')[0].trim() : s;
    }
    if (user && typeof user === 'object') {
      if (user.retailerId && String(user.retailerId).trim() && String(user.retailerId).trim().toLowerCase() !== 'user') {
        const rid = String(user.retailerId).trim();
        return rid.includes('-EMP') ? rid.split('-EMP')[0].trim() : rid;
      }
      const id = user.userId || user.userUid || user.customId;
      if (id && String(id).trim() && String(id).trim().toLowerCase() !== 'user') {
        const rid = String(id).trim();
        return rid.includes('-EMP') ? rid.split('-EMP')[0].trim() : rid;
      }
      if (user.username && user.username !== 'user') {
        const un = String(user.username).trim();
        return un.includes('-EMP') ? un.split('-EMP')[0].trim() : un;
      }
    }
    const current = localStorage.getItem('currentUser');
    if (current && current.trim() && current.trim().toLowerCase() !== 'user' && current.trim().toLowerCase() !== 'admin') {
      const cur = current.trim();
      return cur.includes('-EMP') ? cur.split('-EMP')[0].trim() : cur;
    }
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const id = stored.retailerId || stored.userId || stored.userUid;
      if (id && String(id).trim() && String(id).trim().toLowerCase() !== 'user') {
        const rid = String(id).trim();
        return rid.includes('-EMP') ? rid.split('-EMP')[0].trim() : rid;
      }
    } catch (_) {}
    return 'MBTAR000010101';
  }, [user]);

  // Primary Permissions
  const canAddTask = useMemo(() => {
    if (!isEmployee) return true;
    return hasUserAccess(effectivePermissions, 'crm.task.add');
  }, [isEmployee, effectivePermissions]);

  const canEditTask = useMemo(() => {
    if (!isEmployee) return true;
    return hasUserAccess(effectivePermissions, 'crm.task.edit');
  }, [isEmployee, effectivePermissions]);

  const canDeleteTask = useMemo(() => {
    if (isEmployee) return false; // Strictly only retailers can delete tasks
    return true;
  }, [isEmployee]);

  // Common Request Headers
  const getRequestHeaders = useCallback(() => {
    const headers = {
      'Content-Type': 'application/json',
      'x-retailer-id': activeRetailerId
    };
    if (isEmployee && currentEmployeeUid) {
      headers['x-employee-uid'] = currentEmployeeUid;
      headers['x-employee-name'] = currentEmployeeName;
    }
    return headers;
  }, [activeRetailerId, isEmployee, currentEmployeeUid, currentEmployeeName]);

  // --- Active Tab State (DEFAULT VIEW: Calendar) ---
  const [activeTab, setActiveTab] = useState('calendar');

  // Calendar State
  const [calendarMode, setCalendarMode] = useState('month'); // 'month' | 'week' | 'day'
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(getTodayString());

  // List View State
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    myTasks: 0,
    assigned: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    overdue: 0
  });

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Reports State
  const [reportRange, setReportRange] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [reportEmployee, setReportEmployee] = useState('ALL');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportStats, setReportStats] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // null = Add, object = Edit
  const [viewingTask, setViewingTask] = useState(null);
  const [savingTask, setSavingTask] = useState(false);

  // Quick Status Updater Form inside Viewing Modal
  const [quickStatus, setQuickStatus] = useState('');
  const [quickRemarks, setQuickRemarks] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    startDate: getTodayString(),
    dueDate: getTodayString(),
    startTime: '',
    dueTime: '',
    priority: 'Medium',
    assignmentType: 'myself',
    assignedEmployeeUids: [],
    notes: '',
    reminderDateTime: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch active employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/crm/tasks/employees?retailerId=${activeRetailerId}`, {
        headers: getRequestHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.warn('Failed to fetch employees for tasks:', err);
    }
  }, [activeRetailerId, getRequestHeaders]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Fetch Calendar Events
  const fetchCalendarEvents = useCallback(async () => {
    setLoadingCalendar(true);
    try {
      const year = calendarDate.getFullYear();
      const monthStr = `${year}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`;
      let url = `/api/crm/tasks/calendar?month=${monthStr}&retailerId=${activeRetailerId}`;
      if (isEmployee && currentEmployeeUid) {
        url += `&employeeUid=${encodeURIComponent(currentEmployeeUid)}`;
      } else if (filterEmployee && filterEmployee !== 'ALL') {
        url += `&employeeUid=${encodeURIComponent(filterEmployee)}`;
      }

      const res = await apiFetch(url, { headers: getRequestHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.events || data.tasks)) {
        setCalendarEvents(data.events || data.tasks);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoadingCalendar(false);
    }
  }, [calendarDate, activeRetailerId, isEmployee, currentEmployeeUid, filterEmployee, getRequestHeaders]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarEvents();
    }
  }, [activeTab, fetchCalendarEvents]);

  // Fetch Tasks List
  const fetchTasks = useCallback(async (targetPage = 1) => {
    setLoadingTasks(true);
    try {
      const params = new URLSearchParams();
      params.append('retailerId', activeRetailerId);
      params.append('page', String(targetPage));
      params.append('limit', '15');

      if (activeTab === 'my_tasks') params.append('view', 'my_tasks');
      else if (activeTab === 'assigned') params.append('view', 'assigned');
      else if (activeTab === 'completed') params.append('view', 'completed');
      else if (activeTab === 'pending') params.append('view', 'pending');
      else if (activeTab === 'in_progress') params.append('view', 'in_progress');
      else if (activeTab === 'overdue') params.append('view', 'overdue');
      else params.append('view', 'all');

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (filterStatus && filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterPriority && filterPriority !== 'ALL') params.append('priority', filterPriority);
      if (filterCategory && filterCategory !== 'ALL') params.append('category', filterCategory);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      if (isEmployee && currentEmployeeUid) {
        params.append('employeeUid', currentEmployeeUid);
      } else if (filterEmployee && filterEmployee !== 'ALL') {
        params.append('employeeUid', filterEmployee);
      }

      const res = await apiFetch(`/api/crm/tasks?${params.toString()}`, {
        headers: getRequestHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        if (data.counts) {
          setTabCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [
    activeRetailerId,
    activeTab,
    searchQuery,
    filterStatus,
    filterPriority,
    filterCategory,
    filterStartDate,
    filterEndDate,
    isEmployee,
    currentEmployeeUid,
    filterEmployee,
    getRequestHeaders
  ]);

  useEffect(() => {
    if (activeTab !== 'calendar' && activeTab !== 'reports') {
      fetchTasks(1);
    }
  }, [activeTab, fetchTasks]);

  // Fetch Reports Stats
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const params = new URLSearchParams();
      params.append('retailerId', activeRetailerId);
      params.append('range', reportRange);

      if (reportRange === 'custom') {
        if (reportStartDate) params.append('startDate', reportStartDate);
        if (reportEndDate) params.append('endDate', reportEndDate);
      }

      if (isEmployee && currentEmployeeUid) {
        params.append('employeeUid', currentEmployeeUid);
      } else if (reportEmployee && reportEmployee !== 'ALL') {
        params.append('employeeUid', reportEmployee);
      }

      const res = await apiFetch(`/api/crm/tasks/stats?${params.toString()}`, {
        headers: getRequestHeaders()
      });
      const data = await res.json();
      if (data.success && (data.stats || data.summary)) {
        setReportStats(data.stats || data.summary);
      }
    } catch (err) {
      console.error('Error fetching task reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [activeRetailerId, reportRange, reportStartDate, reportEndDate, isEmployee, currentEmployeeUid, reportEmployee, getRequestHeaders]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, fetchReports]);

  // Open Add Modal
  const handleOpenAddModal = (presetDate = null) => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      category: 'General',
      startDate: presetDate || getTodayString(),
      dueDate: presetDate || getTodayString(),
      startTime: '',
      dueTime: '',
      priority: 'Medium',
      assignmentType: isEmployee ? 'myself' : 'myself',
      assignedEmployeeUids: isEmployee && currentEmployeeUid ? [currentEmployeeUid] : [],
      notes: '',
      reminderDateTime: ''
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    const aType = task.assignmentType || 'myself';
    let empUids = Array.isArray(task.assignedEmployees)
      ? task.assignedEmployees.map((e) => e.employeeUid).filter(Boolean)
      : [];
    if (task.assignedToUid && !empUids.includes(task.assignedToUid) && task.assignedToUid.includes('-EMP')) {
      empUids.push(task.assignedToUid);
    }
    setFormData({
      title: task.title || '',
      description: task.description || '',
      category: task.category || 'General',
      startDate: task.startDate || getTodayString(),
      dueDate: task.dueDate || getTodayString(),
      startTime: task.startTime || '',
      dueTime: task.dueTime || '',
      priority: task.priority || 'Medium',
      assignmentType: aType,
      assignedEmployeeUids: empUids,
      notes: task.notes || '',
      reminderDateTime: task.reminderDateTime ? task.reminderDateTime.slice(0, 16) : ''
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Open View Details Modal
  const handleOpenViewModal = (task) => {
    setViewingTask(task);
    setQuickStatus(task.workStatus || 'Not Started');
    setQuickRemarks('');
    // Asynchronously fetch complete single task details to ensure freshest status, remarks, and creator info
    if (task && (task.taskId || task._id)) {
      apiFetch(`/api/crm/tasks/${task.taskId || task._id}`, {
        headers: getRequestHeaders()
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.task) {
            setViewingTask(data.task);
            setQuickStatus(data.task.workStatus || 'Not Started');
          }
        })
        .catch((err) => console.warn('Could not fetch full task details:', err));
    }
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e) => {
    if (e) e.preventDefault();
    const errors = {};
    if (!formData.title || !formData.title.trim()) {
      errors.title = 'Task title is required';
    }
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required';
    }
    if (formData.startDate && formData.dueDate && formData.dueDate < formData.startDate) {
      errors.dueDate = 'Due date cannot be earlier than start date';
    }
    if (formData.assignmentType === 'employee') {
      const isSelfAssignment = isEmployee && formData.assignedEmployeeUids.length === 1 && formData.assignedEmployeeUids[0] === currentEmployeeUid;
      if (!isSelfAssignment && (!formData.assignedEmployeeUids || formData.assignedEmployeeUids.length === 0)) {
        errors.assignedEmployeeUids = 'Please select at least one employee';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSavingTask(true);
    try {
      let finalAssignmentType = formData.assignmentType;
      let finalEmployeeUids = [...(formData.assignedEmployeeUids || [])];

      if (isEmployee) {
        if (formData.assignmentType === 'myself') {
          finalAssignmentType = 'myself';
          if (currentEmployeeUid && !finalEmployeeUids.includes(currentEmployeeUid)) {
            finalEmployeeUids = [currentEmployeeUid];
          }
        } else if (formData.assignmentType === 'retailer') {
          finalAssignmentType = 'retailer';
          finalEmployeeUids = [];
        }
      }

      const payload = {
        retailerId: activeRetailerId,
        ...formData,
        assignmentType: finalAssignmentType,
        assignedEmployeeUids: finalEmployeeUids
      };

      let url = '/api/crm/tasks';
      let method = 'POST';
      if (editingTask) {
        url = `/api/crm/tasks/${editingTask.taskId || editingTask._id}`;
        method = 'PUT';
      }

      const res = await apiFetch(url, {
        method,
        headers: getRequestHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: editingTask ? 'Task Updated!' : 'Task Created!',
          text: data.message || `Task ${data.task?.taskId || ''} saved successfully.`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        setIsAddEditModalOpen(false);
        // Refresh views
        if (activeTab === 'calendar') fetchCalendarEvents();
        else if (activeTab === 'reports') fetchReports();
        else fetchTasks(page);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Operation Failed',
          text: data.message || 'Unable to save task. Please try again.'
        });
      }
    } catch (err) {
      console.error('Error saving task:', err);
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Failed to communicate with the server. Please check your connection.'
      });
    } finally {
      setSavingTask(false);
    }
  };

  // Quick Status Update
  const handleUpdateStatus = async () => {
    if (!viewingTask || !quickStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await apiFetch(`/api/crm/tasks/${viewingTask.taskId || viewingTask._id}/status`, {
        method: 'PATCH',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          workStatus: quickStatus,
          remarks: quickRemarks
        })
      });
      const data = await res.json();
      if (data.success && data.task) {
        setViewingTask(data.task);
        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `Task marked as "${quickStatus}"`,
          timer: 1800,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        // Refresh background views
        if (activeTab === 'calendar') fetchCalendarEvents();
        else if (activeTab === 'reports') fetchReports();
        else fetchTasks(page);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: data.message || 'Could not update status'
        });
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (task) => {
    if (!canDeleteTask) {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Only the retailer has permission to delete tasks.'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Task?',
      html: `<p>Are you sure you want to permanently delete task <strong>"${task.title}"</strong> (${task.taskId})?</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/crm/tasks/${task.taskId || task._id}?retailerId=${activeRetailerId}`, {
          method: 'DELETE',
          headers: getRequestHeaders()
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Task Deleted',
            text: 'The task has been permanently removed.',
            timer: 1800,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          if (viewingTask && (viewingTask.taskId === task.taskId || viewingTask._id === task._id)) {
            setViewingTask(null);
          }
          if (activeTab === 'calendar') fetchCalendarEvents();
          else if (activeTab === 'reports') fetchReports();
          else fetchTasks(page);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: data.message || 'Unable to delete task'
          });
        }
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  // Generate Excel (.xlsx) Export
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams();
      params.append('retailerId', activeRetailerId);
      params.append('limit', '1000');
      params.append('page', '1');
      if (reportRange !== 'all') params.append('range', reportRange);
      if (reportRange === 'custom') {
        if (reportStartDate) params.append('startDate', reportStartDate);
        if (reportEndDate) params.append('endDate', reportEndDate);
      }
      if (reportEmployee && reportEmployee !== 'ALL') {
        params.append('employeeUid', reportEmployee);
      }

      const res = await apiFetch(`/api/crm/tasks?${params.toString()}`, {
        headers: getRequestHeaders()
      });
      const data = await res.json();
      const exportTasks = data.tasks || tasks;

      const statsRes = await apiFetch(`/api/crm/tasks/stats?${params.toString()}`, {
        headers: getRequestHeaders()
      });
      const statsData = await statsRes.json();
      const stats = statsData.stats || reportStats || {};

      const wb = XLSX.utils.book_new();

      // --- SHEET 1: Task Summary ---
      const summaryRows = [
        ['MB MITRA CRM — TASK MANAGEMENT EXECUTIVE SUMMARY'],
        [`Generated On: ${new Date().toLocaleString()}`, `Retailer ID: ${activeRetailerId}`],
        [],
        ['Metric', 'Count / Value'],
        ['Total Tasks', stats.total || exportTasks.length],
        ['Completed Tasks', stats.completed || 0],
        ['In Progress Tasks', stats.inProgress || 0],
        ['Not Started Tasks', stats.notStarted || 0],
        ['On Hold Tasks', stats.onHold || 0],
        ['Overdue Tasks', stats.overdue || 0],
        ['Cancelled Tasks', stats.cancelled || 0],
        ['Overall Completion Rate', `${stats.completionRate || 0}%`],
        [],
        ['PRIORITY BREAKDOWN', 'Count'],
        ['Urgent', stats.priorityBreakdown?.Urgent || 0],
        ['High', stats.priorityBreakdown?.High || 0],
        ['Medium', stats.priorityBreakdown?.Medium || 0],
        ['Low', stats.priorityBreakdown?.Low || 0]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Task Summary');

      // --- SHEET 2: All Tasks ---
      const taskHeaders = [
        'Task ID',
        'Task Title',
        'Category',
        'Priority',
        'Work Status',
        'Is Overdue',
        'Assignment Type',
        'Assigned To',
        'Start Date',
        'Start Time',
        'Due Date',
        'Due Time',
        'Created Date',
        'Created By',
        'Completed Date',
        'Completed By',
        'Completion Remarks',
        'Notes'
      ];

      const taskRows = [taskHeaders];
      exportTasks.forEach((t) => {
        let assignedTo = 'Myself';
        if (t.assignmentType === 'employee') {
          if (Array.isArray(t.assignedEmployees) && t.assignedEmployees.length > 0) {
            assignedTo = t.assignedEmployees.map((e) => `${e.employeeName} (${e.employeeUid})`).join(', ');
          } else if (t.assignedToName) {
            assignedTo = `${t.assignedToName} (${t.assignedToUid || ''})`;
          }
        }
        taskRows.push([
          t.taskId || '',
          t.title || '',
          t.category || '',
          t.priority || '',
          t.workStatus || '',
          t.isOverdue ? 'YES' : 'NO',
          t.assignmentType === 'employee' ? 'Employee' : 'Myself',
          assignedTo,
          t.startDate || '',
          t.startTime || '',
          t.dueDate || '',
          t.dueTime || '',
          t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
          t.createdByName || t.createdBy?.name || (t.createdByRole === 'employee' ? (t.createdByUid || 'Employee') : 'Retailer'),
          t.completedAt ? new Date(t.completedAt).toLocaleDateString() : '',
          t.completedByName || '',
          t.completionRemarks || '',
          t.notes || ''
        ]);
      });

      const wsTasks = XLSX.utils.aoa_to_sheet(taskRows);
      wsTasks['!cols'] = [
        { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 16 }, { wch: 35 }, { wch: 14 }, { wch: 12 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 16 },
        { wch: 20 }, { wch: 30 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(wb, wsTasks, 'All Tasks');

      // --- SHEET 3: Employee Performance ---
      const empHeaders = [
        'Employee UID',
        'Employee Name',
        'Department',
        'Total Assigned',
        'Completed',
        'In Progress',
        'On Hold',
        'Overdue',
        'Cancelled',
        'Completion Rate (%)'
      ];
      const empRows = [empHeaders];
      const empPerf = stats.employeePerformance || [];
      empPerf.forEach((ep) => {
        empRows.push([
          ep.employeeUid || '',
          ep.employeeName || '',
          ep.department || 'Operations',
          ep.totalAssigned || 0,
          ep.completed || 0,
          ep.inProgress || 0,
          ep.onHold || 0,
          ep.overdue || 0,
          ep.cancelled || 0,
          `${ep.completionRate || 0}%`
        ]);
      });

      const wsEmp = XLSX.utils.aoa_to_sheet(empRows);
      wsEmp['!cols'] = [
        { wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 14 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, wsEmp, 'Employee Performance');

      const fileName = `MB_Mitra_Task_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Excel Export Ready',
        text: `Downloaded ${fileName} containing 3 detailed sheets.`,
        timer: 2500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err) {
      console.error('Error generating Excel report:', err);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Unable to build Excel spreadsheet. Please try again.'
      });
    } finally {
      setExportingExcel(false);
    }
  };

  // --- Calendar Navigation Helpers ---
  const handlePrevCalendar = () => {
    setCalendarDate((prev) => {
      const d = new Date(prev);
      if (calendarMode === 'month') d.setMonth(d.getMonth() - 1);
      else if (calendarMode === 'week') d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextCalendar = () => {
    setCalendarDate((prev) => {
      const d = new Date(prev);
      if (calendarMode === 'month') d.setMonth(d.getMonth() + 1);
      else if (calendarMode === 'week') d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleTodayCalendar = () => {
    const today = new Date();
    setCalendarDate(today);
    setSelectedCalendarDay(getTodayString());
  };

  // Calendar Month Grid Generator
  const calendarMonthGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === getTodayString()
      });
    }

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        isToday: dateStr === getTodayString()
      });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === getTodayString()
      });
    }

    return cells;
  }, [calendarDate]);

  // Tasks mapped by date string for quick calendar lookup
  const tasksByDate = useMemo(() => {
    const map = {};
    calendarEvents.forEach((ev) => {
      const key = ev.dueDate || ev.startDate;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [calendarEvents]);

  // Selected date tasks
  const selectedDateTasks = useMemo(() => {
    return tasksByDate[selectedCalendarDay] || [];
  }, [tasksByDate, selectedCalendarDay]);

  // Calendar Title (e.g. "November 2026")
  const calendarTitle = useMemo(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (calendarMode === 'month') {
      return `${months[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;
    }
    if (calendarMode === 'week') {
      const startOfWeek = new Date(calendarDate);
      startOfWeek.setDate(calendarDate.getDate() - calendarDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return calendarDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [calendarDate, calendarMode]);

  return (
    <div className="task-view-container">
      {/* Top Breadcrumb & Control Header - Compact Single Line */}
      <div className="task-header-card">
        <div className="task-header-left">
          <button className="task-back-btn" onClick={onBack} title="Return to CRM Dashboard">
            ← Back to CRM Suite
          </button>
          <div className="task-header-titles">
            <h2>
              <span className="task-header-icon">📋</span>
              Task Management
              <span className="task-badge-total">
                {isEmployee ? `Assigned to ${currentEmployeeName}` : 'CRM Workspace'}
              </span>
            </h2>
            <span className="task-header-subtitle">
              • Interactive task calendar, employee work assignments, deadline tracking, and performance reports.
            </span>
          </div>
        </div>

        <div className="task-header-right">
          {canAddTask && (
            <button className="task-add-btn" onClick={() => handleOpenAddModal()}>
              <span className="task-btn-icon">+</span> Add New Task
            </button>
          )}
          <button
            className="task-refresh-btn"
            onClick={() => {
              if (activeTab === 'calendar') fetchCalendarEvents();
              else if (activeTab === 'reports') fetchReports();
              else fetchTasks(page);
            }}
            title="Refresh Tasks"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="task-tabs-bar">
        {/* 1. Calendar View (Default) */}
        <button
          className={`task-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <span className="task-tab-icon">📅</span>
          Calendar
          <span className="task-tab-badge-default">Default</span>
        </button>

        {/* 2. Tasks */}
        <button
          className={`task-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('all');
            setFilterStatus('ALL');
            setPage(1);
          }}
        >
          <span className="task-tab-icon">📋</span>
          Tasks
          {tabCounts.all > 0 && <span className="task-tab-counter">{tabCounts.all}</span>}
        </button>

        {/* 3. My Tasks */}
        {!isEmployee && (
          <button
            className={`task-tab-btn ${activeTab === 'my_tasks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('my_tasks');
              setFilterStatus('ALL');
              setPage(1);
            }}
          >
            <span className="task-tab-icon">👤</span>
            My Tasks
            {tabCounts.myTasks > 0 && <span className="task-tab-counter">{tabCounts.myTasks}</span>}
          </button>
        )}

        {/* 4. Assigned Tasks */}
        {!isEmployee && (
          <button
            className={`task-tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('assigned');
              setFilterStatus('ALL');
              setPage(1);
            }}
          >
            <span className="task-tab-icon">👥</span>
            Assigned Tasks
            {tabCounts.assigned > 0 && <span className="task-tab-counter">{tabCounts.assigned}</span>}
          </button>
        )}

        {/* 5. Reports */}
        <button
          className={`task-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="task-tab-icon">📊</span>
          Reports
        </button>
      </div>

      {/* =================================================================== */}
      {/* 1. CALENDAR VIEW (DEFAULT) */}
      {/* =================================================================== */}
      {activeTab === 'calendar' && (
        <div className="task-calendar-wrapper">
          {/* Calendar Header Controls */}
          <div className="task-calendar-topbar">
            <div className="task-calendar-nav-group">
              <button className="task-cal-btn" onClick={handlePrevCalendar} title="Previous">
                ◀
              </button>
              <button className="task-cal-btn task-cal-today" onClick={handleTodayCalendar}>
                Today
              </button>
              <button className="task-cal-btn" onClick={handleNextCalendar} title="Next">
                ▶
              </button>
              <h3 className="task-cal-title">{calendarTitle}</h3>
            </div>

            <div className="task-calendar-actions-group">
              {!isEmployee && employees.length > 0 && (
                <div className="task-filter-pill">
                  <span className="task-pill-label">Employee:</span>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="task-cal-select"
                  >
                    <option value="ALL">All Team Members</option>
                    <option value="myself">Myself (Retailer)</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeUid} value={emp.employeeUid}>
                        {emp.fullName} ({emp.employeeUid})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="task-view-mode-toggle">
                <button
                  className={`task-mode-btn ${calendarMode === 'month' ? 'active' : ''}`}
                  onClick={() => setCalendarMode('month')}
                >
                  Month
                </button>
                <button
                  className={`task-mode-btn ${calendarMode === 'week' ? 'active' : ''}`}
                  onClick={() => setCalendarMode('week')}
                >
                  Week
                </button>
                <button
                  className={`task-mode-btn ${calendarMode === 'day' ? 'active' : ''}`}
                  onClick={() => setCalendarMode('day')}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Legend */}
          <div className="task-calendar-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#2563eb' }}></span> In Progress
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span> Completed
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span> On Hold
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#64748b' }}></span> Not Started
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span> Overdue
            </span>
            {loadingCalendar && (
              <span className="task-cal-loading-pill">
                <span className="task-cal-spinner"></span> Updating events...
              </span>
            )}
          </div>

          <div className="task-calendar-layout">
            {/* MONTH VIEW */}
            {calendarMode === 'month' && (
              <div className="task-month-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="task-month-col-header">
                    {d}
                  </div>
                ))}

                {calendarMonthGrid.map((cell) => {
                  const dayEvents = tasksByDate[cell.dateStr] || [];
                  const isSelected = cell.dateStr === selectedCalendarDay;

                  return (
                    <div
                      key={cell.dateStr}
                      className={`task-cal-day-cell ${cell.isCurrentMonth ? '' : 'outside-month'} ${
                        cell.isToday ? 'is-today' : ''
                      } ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedCalendarDay(cell.dateStr)}
                    >
                      <div className="task-cell-header">
                        <span className={`task-cell-number ${cell.isToday ? 'today-pill' : ''}`}>
                          {cell.dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="task-cell-count-badge" title={`${dayEvents.length} tasks scheduled`}>
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="task-cell-events">
                        {dayEvents.slice(0, 3).map((ev) => {
                          let chipColor = '#2563eb';
                          if (ev.isOverdue) chipColor = '#ef4444';
                          else if (ev.workStatus === 'Completed') chipColor = '#10b981';
                          else if (ev.workStatus === 'On Hold') chipColor = '#f59e0b';
                          else if (ev.workStatus === 'Not Started') chipColor = '#64748b';

                          return (
                            <div
                              key={ev._id || ev.taskId}
                              className={`task-cal-chip ${ev.isOverdue ? 'overdue-chip' : ''}`}
                              style={{ borderLeftColor: chipColor }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenViewModal(ev);
                              }}
                              title={`${ev.taskId}: ${ev.title} (${ev.workStatus})`}
                            >
                              <span className="task-chip-status-dot" style={{ backgroundColor: chipColor }}></span>
                              <span className="task-chip-title">{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="task-cell-more-badge">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* WEEK VIEW */}
            {calendarMode === 'week' && (
              <div className="task-week-grid">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const day = new Date(calendarDate);
                  day.setDate(calendarDate.getDate() - calendarDate.getDay() + idx);
                  const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
                    day.getDate()
                  ).padStart(2, '0')}`;
                  const dayEvents = tasksByDate[dateStr] || [];
                  const isToday = dateStr === getTodayString();
                  const isSelected = dateStr === selectedCalendarDay;

                  return (
                    <div
                      key={dateStr}
                      className={`task-week-col ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedCalendarDay(dateStr)}
                    >
                      <div className="task-week-col-head">
                        <span className="week-day-name">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                        <span className={`week-day-num ${isToday ? 'today-pill' : ''}`}>{day.getDate()}</span>
                      </div>
                      <div className="task-week-col-body">
                        {dayEvents.map((ev) => (
                          <div
                            key={ev._id || ev.taskId}
                            className={`task-week-card ${ev.isOverdue ? 'is-overdue' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenViewModal(ev);
                            }}
                          >
                            <div className="task-week-card-top">
                              <span className="task-week-badge" style={{ backgroundColor: ev.isOverdue ? '#fee2e2' : '#eff6ff', color: ev.isOverdue ? '#b91c1c' : '#1d4ed8' }}>
                                {ev.isOverdue ? '🚨 Overdue' : ev.priority}
                              </span>
                              <span className="task-week-status">{ev.workStatus}</span>
                            </div>
                            <h4 className="task-week-card-title">{ev.title}</h4>
                            <p className="task-week-card-assignee">
                              👤 {ev.assignmentType === 'employee' ? ev.assignedToName || 'Employee' : 'Retailer'}
                            </p>
                          </div>
                        ))}
                        {dayEvents.length === 0 && (
                          <div className="task-week-empty">No tasks</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DAY VIEW */}
            {calendarMode === 'day' && (
              <div className="task-day-view">
                <div className="task-day-header">
                  <h4>Schedule for {new Date(selectedCalendarDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h4>
                  {canAddTask && (
                    <button
                      className="task-add-day-btn"
                      onClick={() => handleOpenAddModal(selectedCalendarDay)}
                    >
                      + Add Task for this Day
                    </button>
                  )}
                </div>
                <div className="task-day-list">
                  {selectedDateTasks.length === 0 ? (
                    <div className="task-day-no-tasks">
                      <span className="empty-icon">☕</span>
                      <p>No tasks scheduled for this day.</p>
                      {canAddTask && (
                        <button
                          className="task-btn-secondary"
                          onClick={() => handleOpenAddModal(selectedCalendarDay)}
                        >
                          Create a task for {selectedCalendarDay}
                        </button>
                      )}
                    </div>
                  ) : (
                    selectedDateTasks.map((ev) => (
                      <div
                        key={ev._id || ev.taskId}
                        className={`task-day-card ${ev.isOverdue ? 'day-card-overdue' : ''}`}
                        onClick={() => handleOpenViewModal(ev)}
                      >
                        <div className="task-day-card-left">
                          <span className="task-day-tid">{ev.taskId}</span>
                          <h4 className="task-day-title">{ev.title}</h4>
                          <div className="task-day-meta">
                            <span className="task-meta-tag category">{ev.category}</span>
                            <span className={`task-meta-tag priority-${(ev.priority || '').toLowerCase()}`}>
                              {ev.priority}
                            </span>
                            <span className="task-meta-tag assignee">
                              👤 {ev.assignmentType === 'employee' ? ev.assignedToName : 'Myself'}
                            </span>
                          </div>
                        </div>
                        <div className="task-day-card-right">
                          <span className={`task-status-pill status-${(ev.workStatus || '').replace(/\s+/g, '-').toLowerCase()}`}>
                            {ev.workStatus}
                          </span>
                          {ev.isOverdue && <span className="task-overdue-pill">🚨 OVERDUE</span>}
                          <button className="task-card-view-btn">View Details →</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Selected Date Inspector Sidebar (Month View) */}
            {calendarMode === 'month' && (
              <div className="task-day-sidebar">
                <div className="task-sidebar-header">
                  <div>
                    <h4>{new Date(selectedCalendarDay + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}</h4>
                    <span className="task-sidebar-sub">
                      {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'task' : 'tasks'} scheduled
                    </span>
                  </div>
                  {canAddTask && (
                    <button
                      className="task-sidebar-add-btn"
                      onClick={() => handleOpenAddModal(selectedCalendarDay)}
                      title="Add task on this date"
                    >
                      + Add
                    </button>
                  )}
                </div>

                <div className="task-sidebar-body">
                  {selectedDateTasks.length === 0 ? (
                    <div className="task-sidebar-empty">
                      <p>No tasks scheduled on this day.</p>
                      {canAddTask && (
                        <button
                          className="task-inline-add-link"
                          onClick={() => handleOpenAddModal(selectedCalendarDay)}
                        >
                          + Schedule a Task
                        </button>
                      )}
                    </div>
                  ) : (
                    selectedDateTasks.map((task) => (
                      <div
                        key={task._id || task.taskId}
                        className={`task-sidebar-card ${task.isOverdue ? 'sidebar-overdue' : ''}`}
                        onClick={() => handleOpenViewModal(task)}
                      >
                        <div className="sidebar-card-top">
                          <span className="sidebar-task-id">{task.taskId}</span>
                          <span className={`sidebar-task-status status-${(task.workStatus || '').replace(/\s+/g, '-').toLowerCase()}`}>
                            {task.workStatus}
                          </span>
                        </div>
                        <h5 className="sidebar-task-title">{task.title}</h5>
                        <div className="sidebar-card-bottom">
                          <span className="sidebar-assignee">
                            👤 {task.assignmentType === 'employee' ? task.assignedToName || 'Employee' : 'Myself'}
                          </span>
                          {task.isOverdue && <span className="sidebar-overdue-tag">Overdue</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. TASK LIST / TABLE VIEWS (Tasks, My Tasks, Assigned, etc.) */}
      {/* =================================================================== */}
      {activeTab !== 'calendar' && activeTab !== 'reports' && (
        <div className="task-list-view-wrapper">
          {/* Filters Bar */}
          <div className="task-filters-card">
            <div className="task-filter-row">
              <div className="task-search-box">
                <span className="task-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Title, Task ID, Description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="task-search-input"
                />
                {searchQuery && (
                  <button className="task-clear-search" onClick={() => setSearchQuery('')}>
                    ✕
                  </button>
                )}
              </div>

              {!isEmployee && (
                <div className="task-filter-group">
                  <label>Assignee:</label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="task-filter-select"
                  >
                    <option value="ALL">All Assignees</option>
                    <option value="myself">Myself (Retailer)</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeUid} value={emp.employeeUid}>
                        {emp.fullName} ({emp.employeeUid})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="task-filter-group">
                <label>Priority:</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="task-filter-select"
                >
                  <option value="ALL">All Priorities</option>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-filter-group">
                <label>Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="task-filter-select"
                >
                  <option value="ALL">All Statuses</option>
                  {WORK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-filter-group">
                <label>Category:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="task-filter-select"
                >
                  <option value="ALL">All Categories</option>
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {(searchQuery || filterEmployee !== 'ALL' || filterPriority !== 'ALL' || filterStatus !== 'ALL' || filterCategory !== 'ALL' || filterStartDate || filterEndDate) && (
                <button
                  className="task-reset-filter-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterEmployee('ALL');
                    setFilterPriority('ALL');
                    setFilterStatus('ALL');
                    setFilterCategory('ALL');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="task-table-card">
            {loadingTasks ? (
              <div className="task-loading-state">
                <div className="task-spinner"></div>
                <p>Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="task-empty-state">
                <div className="task-empty-icon">📂</div>
                <h3>No Tasks Found</h3>
                <p>
                  {searchQuery || filterEmployee !== 'ALL'
                    ? 'No tasks matched your current filter criteria.'
                    : 'There are no tasks recorded in this category.'}
                </p>
                {canAddTask && (
                  <button className="task-add-btn" onClick={() => handleOpenAddModal()}>
                    + Create Your First Task
                  </button>
                )}
              </div>
            ) : (
              <div className="task-table-responsive">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Task ID</th>
                      <th>Title & Category</th>
                      <th>Assigned To</th>
                      <th>Start Date</th>
                      <th>Due Date</th>
                      <th>Priority</th>
                      <th>Work Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const isOverdue = task.isOverdue;
                      let assignedLabel = task.assignedToName || 'Retailer';
                      if (task.assignmentType === 'employee') {
                        if (Array.isArray(task.assignedEmployees) && task.assignedEmployees.length > 0) {
                          assignedLabel = task.assignedEmployees.map((e) => e.employeeName).join(', ');
                        } else if (task.assignedToName) {
                          assignedLabel = task.assignedToName;
                        }
                      } else if (task.assignmentType === 'retailer') {
                        assignedLabel = 'Retailer';
                      }

                      return (
                        <tr
                          key={task._id || task.taskId}
                          className={isOverdue ? 'row-overdue' : ''}
                          onClick={() => handleOpenViewModal(task)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <span className="task-id-badge">{task.taskId}</span>
                          </td>

                          <td>
                            <div className="task-title-cell">
                              <span className="task-title-text">{task.title}</span>
                              <span className="task-cat-tag">{task.category || 'General'}</span>
                            </div>
                          </td>

                          <td>
                            <div className="task-assignee-cell">
                              <span className="assignee-avatar">
                                {task.assignmentType === 'employee' ? '👔' : '👤'}
                              </span>
                              <span className="assignee-name" title={assignedLabel}>
                                {assignedLabel}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="task-date-text">{task.startDate || '—'}</span>
                          </td>

                          <td>
                            <div className="task-due-cell">
                              <span className={`task-date-text ${isOverdue ? 'text-overdue' : ''}`}>
                                {task.dueDate || '—'}
                              </span>
                              {isOverdue && <span className="task-overdue-tag">Overdue</span>}
                            </div>
                          </td>

                          <td>
                            <span className={`task-prio-badge prio-${(task.priority || 'medium').toLowerCase()}`}>
                              {task.priority || 'Medium'}
                            </span>
                          </td>

                          <td>
                            <span className={`task-status-badge status-${(task.workStatus || 'not-started').replace(/\s+/g, '-').toLowerCase()}`}>
                              {task.workStatus}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <div className="task-row-actions">
                              <button
                                className="task-act-btn view"
                                onClick={() => handleOpenViewModal(task)}
                                title="View Details"
                              >
                                👁️
                              </button>
                              {canEditTask && (
                                <button
                                  className="task-act-btn edit"
                                  onClick={() => handleOpenEditModal(task)}
                                  title="Edit Task"
                                >
                                  ✏️
                                </button>
                              )}
                              {canDeleteTask && (
                                <button
                                  className="task-act-btn delete"
                                  onClick={() => handleDeleteTask(task)}
                                  title="Delete Task"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="task-pagination-bar">
                <span className="task-pagination-info">
                  Showing page {page} of {totalPages} ({totalCount} total tasks)
                </span>
                <div className="task-pagination-buttons">
                  <button
                    className="task-page-btn"
                    disabled={page <= 1}
                    onClick={() => fetchTasks(page - 1)}
                  >
                    ◀ Prev
                  </button>
                  <span className="task-page-current">{page}</span>
                  <button
                    className="task-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => fetchTasks(page + 1)}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. REPORTS & EXCEL EXPORT SECTION */}
      {/* =================================================================== */}
      {activeTab === 'reports' && (
        <div className="task-reports-wrapper">
          <div className="task-reports-filter-card">
            <div className="reports-filter-left">
              <span className="reports-icon">📊</span>
              <div>
                <h3>Task Performance & Summary Reports</h3>
                <p>Google Forms-style response analytics and multi-sheet Microsoft Excel (.xlsx) export.</p>
              </div>
            </div>

            <div className="reports-filter-controls">
              <div className="report-control-item">
                <label>Time Range:</label>
                <select
                  value={reportRange}
                  onChange={(e) => setReportRange(e.target.value)}
                  className="report-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {reportRange === 'custom' && (
                <>
                  <div className="report-control-item">
                    <label>From:</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="report-date-input"
                    />
                  </div>
                  <div className="report-control-item">
                    <label>To:</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="report-date-input"
                    />
                  </div>
                </>
              )}

              {!isEmployee && (
                <div className="report-control-item">
                  <label>Employee:</label>
                  <select
                    value={reportEmployee}
                    onChange={(e) => setReportEmployee(e.target.value)}
                    className="report-select"
                  >
                    <option value="ALL">All Team Members</option>
                    <option value="myself">Retailer Only</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeUid} value={emp.employeeUid}>
                        {emp.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                className="task-excel-export-btn"
                onClick={handleExportExcel}
                disabled={exportingExcel || loadingReports}
              >
                <span className="excel-icon">📥</span>
                {exportingExcel ? 'Generating Spreadsheet...' : 'Download Excel (.xlsx)'}
              </button>
            </div>
          </div>

          {loadingReports ? (
            <div className="task-loading-state">
              <div className="task-spinner"></div>
              <p>Aggregating report telemetry...</p>
            </div>
          ) : reportStats ? (
            <div className="task-reports-content">
              {/* Top KPI Cards */}
              <div className="task-kpi-grid">
                <div className="task-kpi-card total">
                  <div className="kpi-icon-box">📋</div>
                  <div className="kpi-body">
                    <span className="kpi-label">Total Tasks</span>
                    <h2 className="kpi-value">{reportStats.total || 0}</h2>
                  </div>
                </div>

                <div className="task-kpi-card completed">
                  <div className="kpi-icon-box">✅</div>
                  <div className="kpi-body">
                    <span className="kpi-label">Completed</span>
                    <h2 className="kpi-value">{reportStats.completed || 0}</h2>
                  </div>
                </div>

                <div className="task-kpi-card in-progress">
                  <div className="kpi-icon-box">🔄</div>
                  <div className="kpi-body">
                    <span className="kpi-label">In Progress</span>
                    <h2 className="kpi-value">{reportStats.inProgress || 0}</h2>
                  </div>
                </div>

                <div className="task-kpi-card pending">
                  <div className="kpi-icon-box">⏳</div>
                  <div className="kpi-body">
                    <span className="kpi-label">Pending / Not Started</span>
                    <h2 className="kpi-value">{reportStats.pending || 0}</h2>
                  </div>
                </div>

                <div className="task-kpi-card overdue">
                  <div className="kpi-icon-box">🚨</div>
                  <div className="kpi-body">
                    <span className="kpi-label">Overdue Tasks</span>
                    <h2 className="kpi-value text-danger">{reportStats.overdue || 0}</h2>
                  </div>
                </div>

                <div className="task-kpi-card rate">
                  <div className="kpi-icon-box">📈</div>
                  <div className="kpi-body">
                    <span className="kpi-label">Completion Rate</span>
                    <h2 className="kpi-value">{reportStats.completionRate || 0}%</h2>
                  </div>
                </div>
              </div>

              {/* Visual Breakdown Cards (Google Forms Response Style) */}
              <div className="task-charts-grid">
                <div className="task-chart-card">
                  <div className="chart-card-header">
                    <h4>Work Status Distribution</h4>
                    <span className="chart-sub">Breakdown of all active & completed jobs</span>
                  </div>
                  <div className="chart-card-body">
                    {WORK_STATUSES.map((st) => {
                      const count = reportStats.statusBreakdown ? reportStats.statusBreakdown[st.value] || 0 : 0;
                      const pct = reportStats.total > 0 ? Math.round((count / reportStats.total) * 100) : 0;
                      return (
                        <div key={st.value} className="chart-dist-row">
                          <div className="dist-row-label">
                            <span className="dist-icon">{st.icon}</span>
                            <span className="dist-text">{st.label}</span>
                            <span className="dist-count">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="dist-progress-track">
                            <div
                              className="dist-progress-fill"
                              style={{ width: `${pct}%`, backgroundColor: st.color }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="task-chart-card">
                  <div className="chart-card-header">
                    <h4>Task Priority Breakdown</h4>
                    <span className="chart-sub">Urgency distribution of workload</span>
                  </div>
                  <div className="chart-card-body">
                    {PRIORITIES.map((pr) => {
                      const count = reportStats.priorityBreakdown ? reportStats.priorityBreakdown[pr.value] || 0 : 0;
                      const pct = reportStats.total > 0 ? Math.round((count / reportStats.total) * 100) : 0;
                      return (
                        <div key={pr.value} className="chart-dist-row">
                          <div className="dist-row-label">
                            <span className="dist-dot" style={{ backgroundColor: pr.color }}></span>
                            <span className="dist-text">{pr.label}</span>
                            <span className="dist-count">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="dist-progress-track">
                            <div
                              className="dist-progress-fill"
                              style={{ width: `${pct}%`, backgroundColor: pr.color }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="task-chart-card full-width">
                  <div className="chart-card-header">
                    <h4>Category-Wise Task Distribution</h4>
                    <span className="chart-sub">Service and workflow areas generating tasks</span>
                  </div>
                  <div className="chart-card-body cat-dist-grid">
                    {TASK_CATEGORIES.map((cat) => {
                      const count = reportStats.categoryBreakdown ? reportStats.categoryBreakdown[cat] || 0 : 0;
                      const pct = reportStats.total > 0 ? Math.round((count / reportStats.total) * 100) : 0;
                      return (
                        <div key={cat} className="cat-dist-item">
                          <div className="cat-item-top">
                            <span className="cat-name">{cat}</span>
                            <span className="cat-num">{count}</span>
                          </div>
                          <div className="dist-progress-track">
                            <div
                              className="dist-progress-fill"
                              style={{ width: `${pct}%`, backgroundColor: '#3b82f6' }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Employee Performance Breakdown Table */}
              {!isEmployee && (
                <div className="task-emp-perf-card">
                  <div className="emp-perf-header">
                    <div>
                      <h4>Employee-Wise Task Completion & Performance</h4>
                      <p>Real-time completion metrics and efficiency monitoring for staff assigned to this shop.</p>
                    </div>
                  </div>

                  {reportStats.employeePerformance && reportStats.employeePerformance.length > 0 ? (
                    <div className="task-table-responsive">
                      <table className="task-table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Total Assigned</th>
                            <th>Completed</th>
                            <th>In Progress</th>
                            <th>Overdue</th>
                            <th>Completion Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportStats.employeePerformance.map((emp) => (
                            <tr key={emp.employeeUid}>
                              <td>
                                <div className="task-assignee-cell">
                                  <span className="assignee-avatar">👔</span>
                                  <div>
                                    <strong>{emp.employeeName}</strong>
                                    <div className="emp-uid-sub">{emp.employeeUid}</div>
                                  </div>
                                </div>
                              </td>
                              <td>{emp.department || 'Operations'}</td>
                              <td><strong>{emp.totalAssigned}</strong></td>
                              <td>
                                <span className="text-success font-semibold">{emp.completed}</span>
                              </td>
                              <td>{emp.inProgress}</td>
                              <td>
                                <span className={emp.overdue > 0 ? 'text-danger font-semibold' : ''}>
                                  {emp.overdue}
                                </span>
                              </td>
                              <td>
                                <div className="perf-rate-box">
                                  <div className="perf-rate-track">
                                    <div
                                      className="perf-rate-fill"
                                      style={{
                                        width: `${emp.completionRate}%`,
                                        backgroundColor:
                                          emp.completionRate >= 75
                                            ? '#10b981'
                                            : emp.completionRate >= 40
                                            ? '#f59e0b'
                                            : '#ef4444'
                                      }}
                                    ></div>
                                  </div>
                                  <span className="perf-rate-text">{emp.completionRate}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="task-empty-state">
                      <p>No employee task assignments found in this date range.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. ADD / EDIT TASK MODAL */}
      {/* =================================================================== */}
      {isAddEditModalOpen && (
        <div className="task-modal-backdrop" onClick={() => setIsAddEditModalOpen(false)}>
          <div className="task-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <div className="modal-title-box">
                <span className="modal-icon">{editingTask ? '✏️' : '➕'}</span>
                <div>
                  <h3>{editingTask ? `Edit Task (${editingTask.taskId})` : 'Create New Task'}</h3>
                  <p>Organize assignments, deadlines, priority, and assignees.</p>
                </div>
              </div>
              <button
                className="task-modal-close-btn"
                onClick={() => setIsAddEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="task-modal-form">
              <div className="task-form-grid">
                <div className="task-form-group full-width">
                  <label className="required-label">Task Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Verify Customer Aadhaar Documents for New Application"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`task-input ${formErrors.title ? 'is-invalid' : ''}`}
                  />
                  {formErrors.title && <span className="field-err">{formErrors.title}</span>}
                </div>

                <div className="task-form-group full-width">
                  <label>Task Description</label>
                  <textarea
                    rows={2}
                    placeholder="Detailed instructions or context for this assignment..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="task-textarea"
                  ></textarea>
                </div>

                <div className="task-form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="task-select"
                  >
                    {TASK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="task-form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="task-select"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="task-form-group">
                  <label className="required-label">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`task-input ${formErrors.startDate ? 'is-invalid' : ''}`}
                  />
                  {formErrors.startDate && <span className="field-err">{formErrors.startDate}</span>}
                </div>

                <div className="task-form-group">
                  <label>Start Time (Optional)</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="task-input"
                  />
                </div>

                <div className="task-form-group">
                  <label className="required-label">Due Date (Deadline)</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className={`task-input ${formErrors.dueDate ? 'is-invalid' : ''}`}
                  />
                  {formErrors.dueDate && <span className="field-err">{formErrors.dueDate}</span>}
                </div>

                <div className="task-form-group">
                  <label>Due Time (Optional)</label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="task-input"
                  />
                </div>

                <div className="task-form-group full-width assignment-box">
                  <label className="assignment-label">
                    Assignment <span className="text-orange">*</span>
                    <span className="assignment-subtext">
                      {isEmployee
                        ? 'Assign this task to the shop owner, yourself, or a team member'
                        : 'Assign to yourself or delegate to your shop employees'}
                    </span>
                  </label>
                  <div className="assignment-radio-group">
                    {isEmployee ? (
                      <>
                        <label className="assignment-radio">
                          <input
                            type="radio"
                            name="assignmentType"
                            value="retailer"
                            checked={formData.assignmentType === 'retailer'}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                assignmentType: 'retailer',
                                assignedEmployeeUids: []
                              })
                            }
                          />
                          <span>🏬 Assign to Retailer ({activeRetailerId})</span>
                        </label>
                        <label className="assignment-radio">
                          <input
                            type="radio"
                            name="assignmentType"
                            value="myself"
                            checked={
                              formData.assignmentType === 'myself' ||
                              (formData.assignmentType === 'employee' &&
                                formData.assignedEmployeeUids.length === 1 &&
                                formData.assignedEmployeeUids[0] === currentEmployeeUid)
                            }
                            onChange={() =>
                              setFormData({
                                ...formData,
                                assignmentType: 'myself',
                                assignedEmployeeUids: currentEmployeeUid ? [currentEmployeeUid] : []
                              })
                            }
                          />
                          <span>👤 Assign to Myself ({currentEmployeeName})</span>
                        </label>
                        <label className="assignment-radio">
                          <input
                            type="radio"
                            name="assignmentType"
                            value="employee"
                            checked={
                              formData.assignmentType === 'employee' &&
                              !(
                                formData.assignedEmployeeUids.length === 1 &&
                                formData.assignedEmployeeUids[0] === currentEmployeeUid
                              )
                            }
                            onChange={() =>
                              setFormData({
                                ...formData,
                                assignmentType: 'employee',
                                assignedEmployeeUids: []
                              })
                            }
                          />
                          <span>👥 Assign to Other Employee(s)</span>
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="assignment-radio">
                          <input
                            type="radio"
                            name="assignmentType"
                            value="myself"
                            checked={formData.assignmentType === 'myself'}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                assignmentType: 'myself',
                                assignedEmployeeUids: []
                              })
                            }
                          />
                          <span>👤 Assign to Myself (Retailer)</span>
                        </label>
                        <label className="assignment-radio">
                          <input
                            type="radio"
                            name="assignmentType"
                            value="employee"
                            checked={formData.assignmentType === 'employee'}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                assignmentType: 'employee'
                              })
                            }
                          />
                          <span>👥 Assign to Employee(s)</span>
                        </label>
                      </>
                    )}
                  </div>

                  {isEmployee && formData.assignmentType === 'retailer' && (
                    <div className="assignment-selected-pill">
                      <span>🏬 Assigned To:</span>
                      <strong>Retailer / Shop Owner ({activeRetailerId})</strong>
                    </div>
                  )}

                  {isEmployee &&
                    (formData.assignmentType === 'myself' ||
                      (formData.assignmentType === 'employee' &&
                        formData.assignedEmployeeUids.length === 1 &&
                        formData.assignedEmployeeUids[0] === currentEmployeeUid)) && (
                      <div className="assignment-selected-pill">
                        <span>👤 Assigned To:</span>
                        <strong>
                          {currentEmployeeName} ({currentEmployeeUid || 'You'})
                        </strong>
                      </div>
                    )}

                  {((!isEmployee && formData.assignmentType === 'employee') ||
                    (isEmployee &&
                      formData.assignmentType === 'employee' &&
                      !(
                        formData.assignedEmployeeUids.length === 1 &&
                        formData.assignedEmployeeUids[0] === currentEmployeeUid
                      ))) && (
                    <div className="employee-select-section">
                      <label className="required-label">Select Employee(s) to assign:</label>
                      {employees.length === 0 ? (
                        <p className="no-emp-msg">
                          No active employees found under this shop.
                        </p>
                      ) : (
                        <div className="employee-checkbox-list">
                          {employees.map((emp) => {
                            const isChecked = formData.assignedEmployeeUids.includes(emp.employeeUid);
                            const isCurrent = isEmployee && emp.employeeUid === currentEmployeeUid;
                            return (
                              <label
                                key={emp.employeeUid}
                                className={`emp-check-item ${isChecked ? 'checked' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        assignedEmployeeUids: [
                                          ...formData.assignedEmployeeUids,
                                          emp.employeeUid
                                        ]
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        assignedEmployeeUids: formData.assignedEmployeeUids.filter(
                                          (id) => id !== emp.employeeUid
                                        )
                                      });
                                    }
                                  }}
                                />
                                <div className="emp-check-info">
                                  <span className="emp-check-name">
                                    {emp.fullName} {isCurrent ? '(You)' : ''}
                                  </span>
                                  <span className="emp-check-uid">
                                    {emp.employeeUid} ({emp.designation || 'Staff'})
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {formErrors.assignedEmployeeUids && (
                        <span className="field-err">{formErrors.assignedEmployeeUids}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="task-form-group">
                  <label>Additional Notes / Checklist</label>
                  <textarea
                    rows={1}
                    placeholder="Reference links, phone numbers, notes or document numbers..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="task-textarea"
                  ></textarea>
                </div>

                <div className="task-form-group">
                  <label>Reminder Alert (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.reminderDateTime}
                    onChange={(e) => setFormData({ ...formData, reminderDateTime: e.target.value })}
                    className="task-input"
                  />
                </div>
              </div>

              <div className="task-modal-footer">
                <button
                  type="button"
                  className="task-btn-secondary"
                  onClick={() => setIsAddEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="task-btn-primary"
                  disabled={savingTask}
                >
                  {savingTask ? 'Saving Task...' : editingTask ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. TASK DETAILS & STATUS UPDATER MODAL */}
      {/* =================================================================== */}
      {viewingTask && (
        <div className="task-modal-backdrop" onClick={() => setViewingTask(null)}>
          <div className="task-modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <div className="modal-title-box">
                <span className="modal-icon">📋</span>
                <div>
                  <div className="detail-id-row">
                    <span className="detail-task-id">{viewingTask.taskId}</span>
                    <span className={`task-status-badge status-${(viewingTask.workStatus || '').replace(/\s+/g, '-').toLowerCase()}`}>
                      {viewingTask.workStatus}
                    </span>
                    {viewingTask.isOverdue && <span className="task-overdue-tag">🚨 OVERDUE</span>}
                  </div>
                  <h3>{viewingTask.title}</h3>
                </div>
              </div>
              <button className="task-modal-close-btn" onClick={() => setViewingTask(null)}>
                ✕
              </button>
            </div>

            <div className="task-detail-content">
              <div className="detail-meta-grid">
                <div className="meta-box">
                  <span className="meta-label">Category</span>
                  <span className="meta-val">{viewingTask.category || 'General'}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Priority</span>
                  <span className={`meta-val prio-${(viewingTask.priority || 'medium').toLowerCase()}`}>
                    {viewingTask.priority}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Assigned To</span>
                  <span className="meta-val">
                    {viewingTask.assignmentType === 'employee'
                      ? Array.isArray(viewingTask.assignedEmployees) && viewingTask.assignedEmployees.length > 0
                        ? viewingTask.assignedEmployees.map((e) => `${e.employeeName} (${e.employeeUid})`).join(', ')
                        : viewingTask.assignedToName || 'Employee'
                      : viewingTask.assignmentType === 'retailer'
                        ? `Retailer (${viewingTask.assignedToUid || viewingTask.retailerId})`
                        : 'Retailer (Myself)'}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Start Date</span>
                  <span className="meta-val">{viewingTask.startDate} {viewingTask.startTime ? `(${viewingTask.startTime})` : ''}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Due Date</span>
                  <span className={`meta-val ${viewingTask.isOverdue ? 'text-danger font-bold' : ''}`}>
                    {viewingTask.dueDate} {viewingTask.dueTime ? `(${viewingTask.dueTime})` : ''}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Created By</span>
                  <span className="meta-val">
                    {(() => {
                      const creatorName = viewingTask.createdByName || viewingTask.createdBy?.name;
                      const creatorUid = viewingTask.createdByUid || viewingTask.createdBy?.uid;
                      const creatorRole = viewingTask.createdByRole || viewingTask.createdBy?.role;

                      if (creatorRole === 'employee' || (creatorUid && creatorUid.includes('-EMP'))) {
                        if (creatorName && creatorUid && creatorName !== creatorUid) {
                          return `${creatorName} (${creatorUid})`;
                        }
                        return creatorName || creatorUid || 'Employee';
                      }

                      if (creatorName && creatorName.toLowerCase() !== 'retailer') {
                        return creatorUid ? `${creatorName} (${creatorUid})` : creatorName;
                      }

                      return `Retailer (${creatorUid || viewingTask.retailerId || 'Owner'})`;
                    })()}
                  </span>
                </div>
              </div>

              {viewingTask.description && (
                <div className="detail-section">
                  <h4 className="detail-section-title">Description</h4>
                  <div className="detail-text-box">{viewingTask.description}</div>
                </div>
              )}

              {viewingTask.notes && (
                <div className="detail-section">
                  <h4 className="detail-section-title">Notes / Checklist</h4>
                  <div className="detail-text-box">{viewingTask.notes}</div>
                </div>
              )}

              {viewingTask.workStatus === 'Completed' && (
                <div className="detail-section completion-banner">
                  <h4 className="detail-section-title text-success">✅ Task Completion Record</h4>
                  <p>
                    <strong>Completed At:</strong> {viewingTask.completedAt ? new Date(viewingTask.completedAt).toLocaleString() : 'N/A'}
                  </p>
                  <p>
                    <strong>Completed By:</strong> {viewingTask.completedByName || viewingTask.completedByUid || 'User'}
                  </p>
                  {viewingTask.completionRemarks && (
                    <p>
                      <strong>Completion Remarks:</strong> {viewingTask.completionRemarks}
                    </p>
                  )}
                </div>
              )}

              {/* Status Updater Section */}
              <div className="detail-section status-updater-card">
                <h4 className="detail-section-title">Update Work Status</h4>
                <div className="updater-row">
                  <div className="updater-select-box">
                    <label>Change Status:</label>
                    <select
                      value={quickStatus}
                      onChange={(e) => setQuickStatus(e.target.value)}
                      className="task-select"
                    >
                      {WORK_STATUSES.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.icon} {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="updater-input-box">
                    <label>Progress Remarks / Completion Notes:</label>
                    <input
                      type="text"
                      placeholder="e.g. Documents verified, awaiting customer signature..."
                      value={quickRemarks}
                      onChange={(e) => setQuickRemarks(e.target.value)}
                      className="task-input"
                    />
                  </div>

                  <button
                    className="task-btn-primary update-btn"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? 'Updating...' : 'Save Status'}
                  </button>
                </div>
              </div>

              {/* Status History / Activity Log */}
              {Array.isArray(viewingTask.statusHistory) && viewingTask.statusHistory.length > 0 && (
                <div className="detail-section">
                  <h4 className="detail-section-title">Status Activity History</h4>
                  <div className="timeline-list">
                    {viewingTask.statusHistory.map((item, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-top">
                            <span className="timeline-status">
                              {item.fromStatus ? `${item.fromStatus} ➔ ` : ''}
                              <strong>{item.toStatus}</strong>
                            </span>
                            <span className="timeline-time">
                              {item.changedAt ? new Date(item.changedAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <span className="timeline-actor">
                            Changed by: {item.changedByName || item.changedByRole || 'User'}
                          </span>
                          {item.remarks && <p className="timeline-remarks">"{item.remarks}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="task-modal-footer">
              <div className="footer-left">
                {canDeleteTask && (
                  <button
                    className="task-btn-danger"
                    onClick={() => handleDeleteTask(viewingTask)}
                  >
                    🗑️ Delete Task
                  </button>
                )}
              </div>
              <div className="footer-right">
                {canEditTask && (
                  <button
                    className="task-btn-secondary"
                    onClick={() => {
                      setViewingTask(null);
                      handleOpenEditModal(viewingTask);
                    }}
                  >
                    ✏️ Edit Details
                  </button>
                )}
                <button
                  className="task-btn-primary"
                  onClick={() => setViewingTask(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
