import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/AppLayout';
import Characters from '@/pages/Characters';
import CharacterSheet from '@/pages/CharacterSheet';
import SkillTrees from '@/pages/SkillTrees';
import EditTree from '@/pages/EditTree';
import SpendPoints from '@/pages/SpendPoints.jsx';
import Races from '@/pages/Races.jsx';
import EditMyTree from '@/pages/EditMyTree.jsx';
import Rules from '@/pages/Rules.jsx';
import Group from '@/pages/Group.jsx';
import Inventory from '@/pages/Inventory.jsx';
import LootTable from '@/pages/LootTable.jsx';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Characters />} />
        <Route path="/character" element={<CharacterSheet />} />
        <Route path="/skill-trees" element={<SkillTrees />} />
        <Route path="/edit-tree" element={<EditTree />} />
        <Route path="/spend-points" element={<SpendPoints />} />
        <Route path="/races" element={<Races />} />
        <Route path="/edit-my-tree" element={<EditMyTree />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/group" element={<Group />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/loot-table" element={<LootTable />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App