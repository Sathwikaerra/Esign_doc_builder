import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import WorkflowList from './pages/workflows/WorkflowList'
import WorkflowDetail from './pages/workflows/WorkflowDetail'
import CreateWorkflow from './pages/workflows/CreateWorkflow'
import TemplateList from './pages/templates/TemplateList'
import TemplateForm from './pages/templates/TemplateForm'
import ContractDetail from './pages/contracts/ContractDetail'
import SignDocument from './pages/SignDocument'

export default function App() {
  return (
    <Routes>
      {/* Signers open their emailed link without an account, signed in or not */}
      <Route path="/sign/:token" element={<SignDocument />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowList />} />
          <Route path="/workflows/new" element={<CreateWorkflow />} />
          <Route path="/workflows/:id" element={<WorkflowDetail />} />
          <Route path="/templates" element={<TemplateList />} />
          <Route path="/templates/new" element={<TemplateForm />} />
          <Route path="/templates/:id" element={<TemplateForm />} />
          <Route path="/contracts/:id" element={<ContractDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
