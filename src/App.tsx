import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { GeneralSupervisorView } from './components/dashboard/GeneralSupervisorView';
import { EducationalSupervisorView } from './components/dashboard/EducationalSupervisorView';
import { ManagerView } from './components/dashboard/ManagerView';
import { TeacherView } from './components/dashboard/TeacherView';
import { TeachersListView } from './components/views/TeachersListView';
import { ReportsListView } from './components/views/ReportsListView';
import { SettingsView } from './components/views/SettingsView';
import { AddStudentModal } from './components/modals/AddStudentModal';
import { EditStudentModal } from './components/modals/EditStudentModal';
import { AddReportModal } from './components/modals/AddReportModal';
import { VacationModal } from './components/modals/VacationModal';
import { ActivityLogModal } from './components/modals/ActivityLogModal';
import { LoginView } from './components/auth/LoginView';
import { Student } from './types';

function MainAppContent() {
  const { isLoggedIn, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForVacation, setSelectedStudentForVacation] = useState<Student | null>(null);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  if (!isLoggedIn) {
    return <LoginView />;
  }

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

    if (activeTab === 'teachers') {
      return <TeachersListView />;
    }
    if (activeTab === 'reports') {
      return <ReportsListView />;
    }
    if (activeTab === 'settings') {
      return <SettingsView />;
    }
    if (activeTab === 'logs') {
      // open modal and show dashboard
      return (
        <GeneralSupervisorView
          onAddStudent={handleOpenAddStudent}
          onEditStudent={handleOpenEdit}
          onAddReport={handleOpenReport}
          onManageVacation={handleOpenVacation}
        />
      );
    }

    // Default 'dashboard' or 'students':
    // The role dynamically decides which dashboard view is rendered!
    if (currentUser.role === 'sub_supervisor') {
      return (
        <EducationalSupervisorView
          onAddStudent={handleOpenAddStudent}
          onAddReport={handleOpenReport}
          onEditStudent={handleOpenEdit}
          onManageVacation={handleOpenVacation}
          onOpenActivityLog={handleOpenActivityLog}
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

    // Default General Supervisor
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
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d] flex flex-col font-sans" dir="rtl">
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
      <main className="flex-1 pt-20 pb-12 px-4 sm:px-6 lg:px-8 lg:mr-72 transition-all duration-300">
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

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
