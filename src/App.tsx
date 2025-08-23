import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Cases } from './pages/Cases';
import { Documents } from './pages/Documents';
import { Calendar } from './pages/Calendar';
import { Contracts } from './pages/Contracts';
import { Auth } from './pages/Auth';
import { useAuth } from './hooks/useAuth';
import { CaseDetails } from './pages/CaseDetails';
import { ContractDetails } from './pages/ContractDetails';
import { Vendors } from './pages/Vendors';
import { VendorDetails } from './pages/VendorDetails';
import { Budget } from './pages/Budget';
import { Tasks } from './pages/Tasks';
import { TaskDetails } from './pages/TaskDetails';
import { LegalResources } from './pages/resources/LegalResources';
import { CaseLaw } from './pages/resources/CaseLaw';
import { Legislation } from './pages/resources/Legislation';
import { Regulations } from './pages/resources/Regulations';
import { Gazettes } from './pages/resources/Gazettes';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Toaster } from "./components/ui/toaster"
import AIAssistant from './pages/AIAssistant';
import { Compliance } from './pages/Compliance';
import { ComplianceSurvey } from './pages/ComplianceSurvey';
import { ComplianceSurveyComplete } from './pages/ComplianceSurveyComplete';
import { ComplianceConfirmation } from './pages/ComplianceConfirmation';
import { EmailVerification } from './pages/EmailVerification';
import { PasswordReset } from './pages/PasswordReset';
import { ToastProvider } from './components/ui/toast';

function App() {
  const { user, loading, checkAuth } = useAuth();

  // Check authentication on app load
  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ToastProvider>
      <Router>
        {loading ? (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <Routes>
            {/* Public routes - accessible without authentication */}
            <Route path="/compliance-survey/:token" element={<ComplianceSurvey />} />
            <Route path="/compliance-survey-complete" element={<ComplianceSurveyComplete />} />
            <Route path="/compliance-confirm/:token" element={<ComplianceConfirmation />} />
            
            {/* Protected routes - require authentication */}
            {!user ? (
              <Route path="*" element={<Auth />} />
            ) : (
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/cases" element={<Cases />} />
                    <Route path="/cases/:id" element={<CaseDetails />} />
                    <Route path="/contracts" element={<Contracts />} />
                    <Route path="/contracts/:id" element={<ContractDetails />} />
                    <Route path="/vendors" element={<Vendors />} />
                    <Route path="/vendors/:id" element={<VendorDetails />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/budget" element={<Budget />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/tasks/:id" element={<TaskDetails />} />
                    <Route path="/resources" element={<LegalResources />} />
                    <Route path="/resources/case-law" element={<CaseLaw />} />
                    <Route path="/resources/legislation" element={<Legislation />} />
                    <Route path="/resources/regulations" element={<Regulations />} />
                    <Route path="/resources/gazettes" element={<Gazettes />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/compliance" element={<Compliance />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/verify-email" element={<EmailVerification />} />
                    <Route path="/reset-password" element={<PasswordReset />} />
                  </Routes>
                </Layout>
              } />
            )}
          </Routes>
        )}
      </Router>
      <Toaster />
    </ToastProvider>
  );
}

export default App;