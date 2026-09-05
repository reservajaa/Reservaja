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
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error || !session) {
          setIsLoaded(true);
        } else if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email ?? null);
          setUserId(session.user.id);
          await loadUserData(session.user.id);
        }
      } catch (err) {
        console.error("Error fetching initial session:", err);
        if (mounted) setIsLoaded(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return; // Handled by initializeAuth
      
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email ?? null);
        setUserId(session.user.id);
        await loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
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
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      // Upsert: cria registro do usuário se não existir
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({ id: uid }, { onConflict: 'id', ignoreDuplicates: true })
        .select('*')
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.warn('Tabela users pode não existir ainda:', userError.message);
      }

      if (userData) {
        console.log("Loaded userData from Supabase:", userData);
        if (userData.profile) setProfile({ ...defaultProfile, ...userData.profile });
        if (userData.settings) setSettings({ ...defaultSettings, ...userData.settings });
        if (userData.created_at) setUserCreatedAt(userData.created_at);
      }

      // Load goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('data')
        .eq('user_id', uid);

      if (goalsError) {
        console.warn('Tabela goals pode não existir ainda:', goalsError.message);
      }

      if (goalsData) {
        setGoals(goalsData.map((g: any) => g.data as Goal));
      }
    } catch (e) {
      console.error('Failed to load user data', e);
    } finally {
      setIsLoaded(true);
    }
  };

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
    const { error } = await supabase
      .from('users')
      .upsert({ id: userId, profile: newProfile }, { onConflict: 'id' });
    if (error) {
      console.error('Failed to save profile:', error);
    }
  }, [userId]);

  // Update settings
  const handleSetSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    if (!userId) return;
    await supabase
      .from('users')
      .upsert({ id: userId, settings: newSettings }, { onConflict: 'id' });
  }, [userId]);

  // Sync goals to Supabase
  const saveGoals = useCallback(async (newGoals: Goal[]) => {
    setGoals(newGoals);
    if (!userId) return;
    try {
      // Delete all and re-insert (simple sync strategy)
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
