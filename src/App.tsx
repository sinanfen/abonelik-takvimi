import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Calendar, LayoutList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from '@/features/calendar/CalendarView';
import { AdminPanel } from '@/features/admin';
import type { Subscription } from '@/types';
import {
  SubscriptionFormModal,
  useCreateSubscription,
  useUpdateSubscription,
  type SubscriptionFormData,
} from '@/features/subscriptions';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useNotificationService } from '@/features/notifications/useNotificationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  const { theme } = useSettingsStore();

  useNotificationService();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();

  const handleNewSubscription = () => {
    setEditingSubscription(null);
    setIsFormModalOpen(true);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (data: SubscriptionFormData) => {
    try {
      if (editingSubscription) {
        await updateMutation.mutateAsync({
          id: editingSubscription.id,
          input: {
            name: data.name,
            type: data.type,
            category: data.category,
            frequency: data.frequency,
            dayOfMonth: data.dayOfMonth,
            amount: data.amount,
            currency: data.currency,
            notes: data.notes,
            statementDay: data.statementDay,
            dueDay: data.dueDay,
            reminders: data.reminders,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          type: data.type,
          category: data.category,
          frequency: data.frequency,
          dayOfMonth: data.dayOfMonth,
          amount: data.amount,
          currency: data.currency,
          notes: data.notes,
          statementDay: data.statementDay,
          dueDay: data.dueDay,
          reminders: data.reminders,
        });
      }
      setIsFormModalOpen(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Failed to save subscription:', error);
      throw error;
    }
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingSubscription(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <div className="flex items-center justify-center border-b border-border py-2">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Takvim
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Yönetim
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <CalendarView onNewSubscription={handleNewSubscription} onOpenSettings={handleOpenSettings} />
        </TabsContent>

        <TabsContent value="admin" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <AdminPanel
            onNewSubscription={handleNewSubscription}
            onEditSubscription={handleEditSubscription}
            onOpenSettings={handleOpenSettings}
          />
        </TabsContent>
      </Tabs>

      {/* Subscription Form Modal */}
      <SubscriptionFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        initialData={editingSubscription ? {
          name: editingSubscription.name,
          type: editingSubscription.type,
          category: editingSubscription.category,
          frequency: editingSubscription.recurrence.frequency === 'custom' ? 'monthly' : editingSubscription.recurrence.frequency,
          dayOfMonth: editingSubscription.recurrence.dayOfMonth,
          amount: editingSubscription.amount,
          currency: editingSubscription.currency,
          notes: editingSubscription.notes,
          reminders: editingSubscription.reminders,
          statementDay: editingSubscription.statementDay,
          dueDay: editingSubscription.dueDay,
        } : undefined}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
