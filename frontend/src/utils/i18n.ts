import { useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

const translations = {
  ar: {
    // Navigation & Common
    appName: 'منصة التقييم الأكاديمي',
    dashboard: 'لوحة التحكم',
    courses: 'المقررات الدراسية',
    analytics: 'التحليلات والتقارير',
    leaderboard: 'لوحة الصدارة',
    profile: 'الملف الشخصي',
    members: 'أعضاء المقرر',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    welcome: 'مرحباً بك',
    teacher: 'مدرس / محاضر',
    student: 'طالب',
    studentId: 'الرقم الأكاديمي',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    name: 'الاسم الكامل',
    role: 'نوع الحساب',
    actions: 'الإجراءات',
    save: 'حفظ والتعديل',
    cancel: 'إلغاء',
    delete: 'حذف',
    confirm: 'تأكيد',
    search: 'بحث...',
    filter: 'تصفية',
    all: 'الكل',
    status: 'الحالة',
    notifications: 'التنبيهات',
    pendingReviews: 'مراجعة التسليمات المعلقة',
    students: 'قائمة الطلاب',
    settings: 'الإعدادات الشخصية',
    noNotifications: 'لا توجد تنبيهات جديدة',
    markAllRead: 'تحديد الكل كُمقروء',
    loading: 'جاري التحميل...',
    
    // Courses & Sessions
    myCourses: 'مقرراتي الدراسية',
    createCourse: 'إنشاء مقرر جديد',
    joinCourse: 'الانضمام إلى مقرر',
    courseCode: 'رمز المقرر',
    enterCourseCode: 'أدخل رمز المقرر للأنضمام',
    studentsCount: 'عدد الطلاب',
    sessionsCount: 'عدد الجلسات',
    createSession: 'إضافة جلسة / درس جديد',
    sessionTitle: 'عنوان الجلسة',
    sessionDescription: 'وصف الجلسة',
    unlocked: 'مفتوحة للطلاب',
    locked: 'مغلقة',
    unlockSession: 'إلغاء قفل الجلسة',
    lockSession: 'قفل الجلسة',
    deleteCourse: 'حذف المقرر',
    
    // Tasks & Workspace
    tasks: 'المهام والتكليفات',
    createTask: 'إضافة مهمة برمجية جديدة',
    taskTitle: 'عنوان المهمة',
    taskDescription: 'وصف المهمة والمطلوب',
    exampleInput: 'مدخلات توضيحية (Example Input)',
    exampleOutput: 'مخرجات توضيحية (Example Output)',
    deadline: 'الموعد النهائي للتقديم',
    maxGrade: 'الدرجة القصوى',
    maxAttempts: 'الحد الأقصى للمحاولات',
    taskMode: 'نوع التكليف',
    homework: 'واجب منزلي (Homework)',
    inClass: 'تطبيق عملي بالقاعة (In-Class)',
    runCode: 'تشغيل الكود',
    submitTask: 'تسليم المهمة',
    codeEditor: 'محرر البرمجة',
    submissionHistory: 'سجل التسليمات',
    teacherFeedback: 'ملاحظات وتغذية المدرس',
    grade: 'الدرجة',
    pendingGrade: 'قيد التقييم',
    graded: 'تم التقييم',
    notSubmitted: 'لم يتم التسليم',
    notOpened: 'لم يتم الفتح',
    
    // Review Modal & Manual Review
    manualReviewTitle: 'تفاصيل التسليم والتقييم اليدوي',
    studentInfo: 'بيانات الطالب',
    groupName: 'اسم المجموعة / المقرر',
    submissionDate: 'تاريخ التسليم',
    attemptNumber: 'رقم المحاولة',
    submittedCode: 'الكود المُسلم',
    saveGradeFeedback: 'حفظ الدرجة والملاحظات',
    
    // Members Page
    courseMembers: 'أعضاء ومجموعات المقرر',
    instructor: 'المحاضر المسؤول',
    studentRoster: 'قائمة الطلاب المسجلين',
    averageGrade: 'متوسط الدرجات',
    progress: 'نسبة الإنجاز',
    completedTasks: 'المهام المكتملة',
    pendingTasks: 'المهام المعلقة',
    lateTasks: 'تسليمات متاخرة',
    
    // Analytics & Profile
    analyticsOverview: 'نظرة عامة على التحليلات',
    submissionTrends: 'معدل التسليمات اليومية',
    hardestTasks: 'أصعب المهام البرمجية',
    topStudents: 'الطلاب الأكثر تميزاً',
    exportCsv: 'تصدير درجات المقرر (CSV)',
    profilePicture: 'الصورة الشخصية',
    uploadPhoto: 'رفع صورة جديدة',
    removePhoto: 'إزالة الصورة',
    teacherProfile: 'الملف الشخصي للمدرس',
    studentProfile: 'الملف الشخصي للطالب',
    assignedTasks: 'التكاليف المرفوعة',
    totalStudentsTaught: 'إجمالي الطلاب المسجلين',

    // Settings & Profile Edit
    personalInfo: 'المعلومات الشخصية',
    replacePicture: 'تغيير الصورة',
    uploadPicture: 'رفع صورة',
    removePicture: 'إزالة الصورة',
    fullName: 'الاسم الكامل',
    saveChanges: 'حفظ التعديلات',
    changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور الجديدة',
    updatePassword: 'تحديث كلمة المرور',
    preferences: 'تفضيلات التطبيق',
    language: 'لغة العرض',
    theme: 'مظهر الواجهة',
    settingsSubtitle: 'قم بإدارة بياناتك الشخصية وإعدادات الأمان واللغة والمظهر.',
    profileUpdatedSuccess: 'تم تحديث الملف الشخصي بنجاح!',
    passwordChangedSuccess: 'تم تغيير كلمة المرور بنجاح!'
  },
  en: {
    // Navigation & Common
    appName: 'Grading Platform',
    dashboard: 'Dashboard',
    courses: 'Courses',
    analytics: 'Analytics',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    members: 'Course Members',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
    welcome: 'Welcome',
    teacher: 'Teacher',
    student: 'Student',
    studentId: 'Student ID',
    email: 'Email',
    password: 'Password',
    name: 'Full Name',
    role: 'Account Role',
    actions: 'Actions',
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    search: 'Search...',
    filter: 'Filter',
    all: 'All',
    status: 'Status',
    notifications: 'Notifications',
    pendingReviews: 'Pending Reviews',
    students: 'Students Roster',
    settings: 'Settings',
    noNotifications: 'No new notifications',
    markAllRead: 'Mark all read',
    loading: 'Loading...',
    
    // Courses & Sessions
    myCourses: 'My Courses',
    createCourse: 'Create New Course',
    joinCourse: 'Join Course',
    courseCode: 'Course Code',
    enterCourseCode: 'Enter course code to join',
    studentsCount: 'Students Count',
    sessionsCount: 'Sessions Count',
    createSession: 'Add New Session',
    sessionTitle: 'Session Title',
    sessionDescription: 'Session Description',
    unlocked: 'Unlocked for Students',
    locked: 'Locked',
    unlockSession: 'Unlock Session',
    lockSession: 'Lock Session',
    deleteCourse: 'Delete Course',
    
    // Tasks & Workspace
    tasks: 'Tasks & Assignments',
    createTask: 'Add Programming Task',
    taskTitle: 'Task Title',
    taskDescription: 'Task Description & Instructions',
    exampleInput: 'Example Input',
    exampleOutput: 'Example Output',
    deadline: 'Submission Deadline',
    maxGrade: 'Max Grade',
    maxAttempts: 'Max Attempts',
    taskMode: 'Task Mode',
    homework: 'Homework',
    inClass: 'In-Class Lab',
    runCode: 'Run Code',
    submitTask: 'Submit Code',
    codeEditor: 'Code Editor',
    submissionHistory: 'Submission History',
    teacherFeedback: 'Teacher Feedback',
    grade: 'Grade',
    pendingGrade: 'Pending Grade',
    graded: 'Graded',
    notSubmitted: 'Not Submitted',
    notOpened: 'Not Opened',
    
    // Review Modal & Manual Review
    manualReviewTitle: 'Submission Details & Manual Grading',
    studentInfo: 'Student Information',
    groupName: 'Group / Course Name',
    submissionDate: 'Submission Date',
    attemptNumber: 'Attempt Number',
    submittedCode: 'Submitted Code',
    saveGradeFeedback: 'Save Grade & Feedback',
    
    // Members Page
    courseMembers: 'Course Members & Groups',
    instructor: 'Lead Instructor',
    studentRoster: 'Enrolled Students Roster',
    averageGrade: 'Average Grade',
    progress: 'Progress Rate',
    completedTasks: 'Completed Tasks',
    pendingTasks: 'Pending Tasks',
    lateTasks: 'Late Submissions',
    
    // Analytics & Profile
    analyticsOverview: 'Analytics Overview',
    submissionTrends: 'Daily Submission Trends',
    hardestTasks: 'Hardest Tasks',
    topStudents: 'Top Active Students',
    exportCsv: 'Export Grades CSV',
    profilePicture: 'Profile Picture',
    uploadPhoto: 'Upload New Photo',
    removePhoto: 'Remove Photo',
    teacherProfile: 'Teacher Profile',
    studentProfile: 'Student Profile',
    assignedTasks: 'Assigned Tasks',
    totalStudentsTaught: 'Total Students Taught',

    // Settings & Profile Edit
    personalInfo: 'Personal Information',
    replacePicture: 'Replace Picture',
    uploadPicture: 'Upload Picture',
    removePicture: 'Remove Picture',
    fullName: 'Full Name',
    saveChanges: 'Save Changes',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    updatePassword: 'Update Password',
    preferences: 'App Preferences',
    language: 'Display Language',
    theme: 'Interface Theme',
    settingsSubtitle: 'Manage your profile details, security preferences, language, and theme.',
    profileUpdatedSuccess: 'Profile updated successfully!',
    passwordChangedSuccess: 'Password changed successfully!'
  }
};

let currentLang: Language = (localStorage.getItem('app_language') as Language) || 'ar';

export const getLanguage = (): Language => currentLang;

export const setLanguage = (lang: Language) => {
  currentLang = lang;
  localStorage.setItem('app_language', lang);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event('languageChange'));
};

export const t = (key: keyof typeof translations['ar']): string => {
  return translations[currentLang][key] || translations['en'][key] || key;
};

export const useTranslation = () => {
  const [lang, setLangState] = useState<Language>(getLanguage());

  useEffect(() => {
    // Initial RTL setup
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    const handleLangChange = () => {
      setLangState(getLanguage());
    };

    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, [lang]);

  return {
    t,
    lang,
    setLanguage: (newLang: Language) => setLanguage(newLang),
    isRtl: lang === 'ar'
  };
};
