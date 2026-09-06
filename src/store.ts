import { useState, useEffect, useCallback } from 'react';
import { Goal, Profile, Settings, GoalShortcut, DEFAULT_GOAL_SHORTCUTS } from './types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './lib/supabase';

const defaultProfile: Profile = {
  name: 'Usuário',
  photoUrl: '',
  currency: 'BRL',
};

const defaultSettings: Settings = {
  theme: 'system',
};

export function useStore() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen to Supabase auth state
  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: any = null;

    // Timeout de segurança: se a rede estiver lenta ou falhar, sai do "Carregando..." em no máximo 2.5 segundos
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoaded(true);
      }
    }, 2500);

    const setupRealtime = (uid: string) => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      realtimeChannel = supabase
        .channel(`user-sync-${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${uid}`,
          },
          (payload) => {
            const newRow = payload.new as any;
            if (newRow?.profile) {
              setProfile(prev => ({ ...defaultProfile, ...newRow.profile }));
            }
            if (newRow?.settings) {
              setSettings(prev => ({ ...defaultSettings, ...newRow.settings }));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'goals',
            filter: `user_id=eq.${uid}`,
          },
          async () => {
            const { data: goalsData } = await supabase
              .from('goals')
              .select('data')
              .eq('user_id', uid);
            if (goalsData) {
              setGoals(goalsData.map((g: any) => g.data as Goal));
            }
          }
        )
        .subscribe();
    };

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error || !session) {
          setIsLoaded(true);
        } else if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email ?? null);
          setUserId(session.user.id);
          setupRealtime(session.user.id);
          await loadUserData(session.user.id);
        }
      } catch (err) {
        console.error("Error fetching initial session:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;
      
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email ?? null);
        setUserId(session.user.id);
        setupRealtime(session.user.id);
        await loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
        setIsAuthenticated(false);
        setUserEmail(null);
        setUserId(null);
        setGoals([]);
        setProfile(defaultProfile);
        setSettings(defaultSettings);
        setIsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const userPromise = supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      const goalsPromise = supabase
        .from('goals')
        .select('data')
        .eq('user_id', uid);

      const [userRes, goalsRes] = await Promise.allSettled([userPromise, goalsPromise]);

      if (userRes.status === 'fulfilled' && userRes.value.data) {
        const userData = userRes.value.data;
        if (userData.profile) {
          setProfile(prev => ({ ...defaultProfile, ...userData.profile }));
        }
        if (userData.settings) {
          setSettings(prev => ({ ...defaultSettings, ...userData.settings }));
        }
        if (userData.created_at) {
          setUserCreatedAt(userData.created_at);
        }
      } else if (userRes.status === 'fulfilled' && !userRes.value.data && !userRes.value.error) {
        // Se ainda não existir linha na tabela users, cria o registro inicial
        supabase
          .from('users')
          .insert({ id: uid, profile: defaultProfile, settings: defaultSettings })
          .then();
      }

      if (goalsRes.status === 'fulfilled' && goalsRes.value.data) {
        setGoals(goalsRes.value.data.map((g: any) => g.data as Goal));
      }
    } catch (e) {
      console.error('Failed to load user data', e);
    } finally {
      setIsLoaded(true);
    }
  };

  // Sincronização automática quando o aplicativo ganha foco (ao alternar abas ou desbloquear celular)
  useEffect(() => {
    if (!userId) return;

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        loadUserData(userId);
      }
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('online', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('online', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [userId]);

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  const handleSetProfile = useCallback(async (newProfile: Profile) => {
    setProfile(newProfile);
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('users')
        .upsert({ id: userId, profile: newProfile }, { onConflict: 'id' });
      if (error) {
        console.error('Failed to save profile:', error);
      }
    } catch (err) {
      console.error('Erro de rede ao salvar perfil:', err);
    }
  }, [userId]);

  // Update settings
  const handleSetSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    if (!userId) return;
    try {
      await supabase
        .from('users')
        .upsert({ id: userId, settings: newSettings }, { onConflict: 'id' });
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    }
  }, [userId]);

  // Sync goals to Supabase
  const saveGoals = useCallback(async (newGoals: Goal[]) => {
    setGoals(newGoals);
    if (!userId) return;
    try {
      await supabase.from('goals').delete().eq('user_id', userId);
      if (newGoals.length > 0) {
        await supabase.from('goals').insert(
          newGoals.map(g => ({ user_id: userId, goal_id: g.id, data: g }))
        );
      }
    } catch (e) {
      console.error('Failed to save goals', e);
    }
  }, [userId]);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'savedAmount' | 'history'>) => {
    const newGoal: Goal = {
      ...goal,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      savedAmount: 0,
      history: [],
      shortcuts: goal.shortcuts && goal.shortcuts.length > 0 ? goal.shortcuts : DEFAULT_GOAL_SHORTCUTS,
    };
    saveGoals([...goals, newGoal]);
  }, [goals, saveGoals]);

  const updateGoal = useCallback((id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt' | 'savedAmount' | 'history'>>) => {
    saveGoals(goals.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)));
  }, [goals, saveGoals]);

  const updateGoalShortcuts = useCallback((goalId: string, shortcuts: GoalShortcut[]) => {
    saveGoals(goals.map((goal) => (goal.id === goalId ? { ...goal, shortcuts } : goal)));
  }, [goals, saveGoals]);

  const deleteGoal = useCallback((id: string) => {
    saveGoals(goals.filter((g) => g.id !== id));
  }, [goals, saveGoals]);

  const addMoney = useCallback((goalId: string, amount: number) => {
    saveGoals(goals.map((goal) => {
      if (goal.id === goalId) {
        const newSavedAmount = Math.min(goal.savedAmount + amount, goal.targetAmount);
        const actualAdded = newSavedAmount - goal.savedAmount;
        if (actualAdded > 0) {
          return {
            ...goal,
            savedAmount: newSavedAmount,
            history: [...goal.history, { id: uuidv4(), date: new Date().toISOString(), amount: actualAdded }],
          };
        }
      }
      return goal;
    }));
  }, [goals, saveGoals]);

  const removeMoney = useCallback((goalId: string, amount: number) => {
    saveGoals(goals.map((goal) => {
      if (goal.id === goalId) {
        const newSavedAmount = Math.max(goal.savedAmount - amount, 0);
        const actualRemoved = goal.savedAmount - newSavedAmount;
        if (actualRemoved > 0) {
          return {
            ...goal,
            savedAmount: newSavedAmount,
            history: [...goal.history, { id: uuidv4(), date: new Date().toISOString(), amount: -actualRemoved }],
          };
        }
      }
      return goal;
    }));
  }, [goals, saveGoals]);

  const clearHistory = useCallback((goalId: string) => {
    saveGoals(goals.map((goal) => (goal.id === goalId ? { ...goal, history: [] } : goal)));
  }, [goals, saveGoals]);

  const importData = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.goals) saveGoals(parsed.goals);
      if (parsed.profile) handleSetProfile(parsed.profile);
      if (parsed.settings) handleSetSettings(parsed.settings);
      return true;
    } catch (e) {
      console.error('Failed to import data', e);
      return false;
    }
  }, [saveGoals, handleSetProfile, handleSetSettings]);

  return {
    goals,
    profile,
    settings,
    setProfile: handleSetProfile,
    setSettings: handleSetSettings,
    addGoal,
    updateGoal,
    updateGoalShortcuts,
    deleteGoal,
    addMoney,
    removeMoney,
    clearHistory,
    importData,
    isLoaded,
    isAuthenticated,
    setIsAuthenticated,
    userCreatedAt,
    userEmail
  };
}
