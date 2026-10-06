import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { SuperAdminViewBar } from './components/common/SuperAdminViewBar';
import { GeneralSupervisorView } from './components/dashboard/GeneralSupervisorView';
import { EducationalSupervisorView } from './components/dashboard/EducationalSupervisorView';
import { ManagerView } from './components/dashboard/ManagerView';
import { TeacherView } from './components/dashboard/TeacherView';
import { TeachersListView } from './components/views/TeachersListView';
import { ReportsListView } from './components/views/ReportsListView';
import { StudentsListView } from './components/views/StudentsListView';
import { AddStudentModal } from './components/modals/AddStudentModal';
import { EditStudentModal } from './components/modals/EditStudentModal';
import { AddReportModal } from './components/modals/AddReportModal';
import { VacationModal } from './components/modals/VacationModal';
import { ActivityLogModal } from './components/modals/ActivityLogModal';
import { LoginView } from './components/auth/LoginView';
import { Student, UserRole } from './types';

function AuthenticatedApp() {
  const { currentUser, isSuperAdmin, setPreviewRole } = useApp();

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForVacation, setSelectedStudentForVacation] = useState<Student | null>(null);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  // Switch role preview handler for Super Admin
  const handleSwitchPreviewRole = (role: UserRole | null) => {
    setPreviewRole(role);
    setActiveTab('dashboard');
  };

  // Reset tab to dashboard if teacher has no access to specific tabs
  React.useEffect(() => {
    if (currentUser.role === 'teacher' && activeTab === 'teachers') {
      setActiveTab('students');
    }
  }, [currentUser.role, activeTab]);

  // Handle modal openings
  const handleOpenEdit = (student: Student) => {
    setSelectedStudentForEdit(student);
  };

  const handleOpenReport = (student: Student) => {
    setSelectedStudentForReport(student);
  };

  const handleOpenVacation = (student: Student) => {
    setSelectedStudentForVacation(student);
  };

  const handleOpenAddStudent = () => {
    setIsAddStudentOpen(true);
  };

  const handleOpenActivityLog = () => {
    setIsActivityLogOpen(true);
  };

  // Render content based on active tab & role
  const renderMainContent = () => {
    // Role Teacher: can only see their students or reports
    if (currentUser.role === 'teacher') {
      if (activeTab === 'reports') {
        return <ReportsListView />;
      }
      return <TeacherView />;
    }

    // Screens for Manager & Supervisors
    if (activeTab === 'students') {
      return (
        <StudentsListView
          onAddStudent={handleOpenAddStudent}
          onEditStudent={handleOpenEdit}
          onAddReport={handleOpenReport}
          onManageVacation={handleOpenVacation}
        />
      );
    }

    if (activeTab === 'teachers') {
      return <TeachersListView />;
    }

    if (activeTab === 'reports') {
      return <ReportsListView />;
    }

    // Default 'dashboard' or 'logs':
    // The role dynamically decides which executive dashboard view is rendered!
    if (currentUser.role === 'sub_supervisor') {
      return (
        <EducationalSupervisorView
          onAddStudent={handleOpenAddStudent}
          onAddReport={handleOpenReport}
          onEditStudent={handleOpenEdit}
          onManageVacation={handleOpenVacation}
          onOpenActivityLog={handleOpenActivityLog}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      );
    }

    if (currentUser.role === 'manager') {
      return (
        <ManagerView
          onAddStudent={handleOpenAddStudent}
          onEditStudent={handleOpenEdit}
          onAddReport={handleOpenReport}
          onManageVacation={handleOpenVacation}
        />
      );
    }

    // Default General Supervisor Dashboard
    return (
      <GeneralSupervisorView
        onAddStudent={handleOpenAddStudent}
        onEditStudent={handleOpenEdit}
        onAddReport={handleOpenReport}
        onManageVacation={handleOpenVacation}
      />
    );
  };

  return (
    <div
      className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-[#1A7B88]/20 selection:text-[#125862]"
      dir="rtl"
    >
      {/* Super Admin Preview Bar - Rendered exclusively for mahmoudaliwahkotb@gmail.com and managers */}
      <SuperAdminViewBar onSelectRole={handleSwitchPreviewRole} />

      {/* Unified Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenActivityLog={handleOpenActivityLog}
        onOpenAddStudent={handleOpenAddStudent}
        onToggleSidebar={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
      />

      {/* Unified Right Sidebar */}
      <Sidebar
        activeTab={activeTab === 'logs' ? 'dashboard' : activeTab}
        setActiveTab={(tab) => {
          if (tab === 'logs') {
            setIsActivityLogOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        isOpenMobile={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
      />

      {/* Main Page Content Body */}
      <main
        className={`flex-1 ${
          isSuperAdmin
            ? 'pt-24 lg:pt-20'
            : 'pt-18 lg:pt-16'
        } pb-16 px-3.5 sm:px-6 lg:px-8 lg:mr-72 transition-all duration-300`}
      >
        <div className="max-w-7xl mx-auto">{renderMainContent()}</div>
      </main>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
      />

      <EditStudentModal
        isOpen={selectedStudentForEdit !== null}
        student={selectedStudentForEdit}
        onClose={() => setSelectedStudentForEdit(null)}
      />

      <AddReportModal
        isOpen={selectedStudentForReport !== null}
        student={selectedStudentForReport}
        onClose={() => setSelectedStudentForReport(null)}
      />

      <VacationModal
        isOpen={selectedStudentForVacation !== null}
        student={selectedStudentForVacation}
        onClose={() => setSelectedStudentForVacation(null)}
      />

      <ActivityLogModal
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
      />
    </div>
  );
}

function MainAppContent() {
  const { isLoggedIn } = useApp();

  if (!isLoggedIn) {
    return <LoginView />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
