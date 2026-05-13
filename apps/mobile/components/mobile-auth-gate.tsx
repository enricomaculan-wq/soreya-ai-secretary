import { getUserOrganization, type UserOrganization } from '@soreya/database';
import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';

type AuthContextValue = {
  user: User | null;
  userOrganization: UserOrganization | null;
  refreshOrganization: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSoreyaAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useSoreyaAuth must be used inside MobileAuthGate.');
  }

  return context;
}

export function MobileAuthGate({ children }: { children: ReactNode }) {
  const { locale, t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [userOrganization, setUserOrganization] = useState<UserOrganization | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const hasConfig = hasSupabaseMobileConfig();
  const demoMode = shouldUseMobileDemoData();

  const loadOrganizationForUser = useCallback(async (nextUser: User | null) => {
    if (demoMode && nextUser) {
      setUserOrganization(createDemoUserOrganization(locale));
      return;
    }

    if (!hasConfig || !nextUser) {
      setUserOrganization(null);
      return;
    }

    const organization = await getUserOrganization(getSupabaseMobileClient(), nextUser.id);
    setUserOrganization(organization);
  }, [demoMode, hasConfig, locale]);

  const refreshOrganization = useCallback(async () => {
    await loadOrganizationForUser(user);
  }, [loadOrganizationForUser, user]);

  const signOut = useCallback(async () => {
    if (demoMode) {
      setMessage(t('demo.loginDescription'));
      return;
    }

    if (!hasConfig) {
      return;
    }

    await getSupabaseMobileClient().auth.signOut();
    setUser(null);
    setUserOrganization(null);
  }, [demoMode, hasConfig, t]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (demoMode) {
        const demoUser = createDemoUser(locale);

        if (isMounted) {
          setUser(demoUser);
          setUserOrganization(createDemoUserOrganization(locale));
          setMessage(t('demo.description'));
          setIsChecking(false);
        }
        return;
      }

      if (!hasConfig) {
        setIsChecking(false);
        return;
      }

      try {
        const supabase = getSupabaseMobileClient();
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const sessionUser = data.session?.user ?? null;

        if (!isMounted) {
          return;
        }

        setUser(sessionUser);

        if (sessionUser) {
          const organization = await getUserOrganization(supabase, sessionUser.id);

          if (isMounted) {
            setUserOrganization(organization);
          }
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : 'Unable to load Supabase session.');
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    }

    loadSession();

    if (!hasConfig || demoMode) {
      return () => {
        isMounted = false;
      };
    }

    const { data } = getSupabaseMobileClient().auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        loadOrganizationForUser(nextUser).catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : 'Unable to load organization.');
        });
      } else {
        setUserOrganization(null);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [demoMode, hasConfig, loadOrganizationForUser, locale, t]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      userOrganization,
      refreshOrganization,
      signOut,
    }),
    [refreshOrganization, signOut, user, userOrganization],
  );

  if (isChecking) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.loadingText}>{t('common.loading')}...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        hasConfig={hasConfig}
        initialMessage={message}
        onAuthenticated={async (nextUser) => {
          setUser(nextUser);
          await loadOrganizationForUser(nextUser);
        }}
      />
    );
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

function createDemoUser(locale: 'it' | 'en'): User {
  const demo = getMobileDemoData(locale);

  return {
    id: demo.membership.user_id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'demo@soreya.local',
    app_metadata: { provider: 'demo', providers: ['demo'] },
    user_metadata: { demo: true, name: 'Soreya Demo User' },
    created_at: demo.membership.created_at,
    updated_at: demo.membership.updated_at,
  } as User;
}

function createDemoUserOrganization(locale: 'it' | 'en'): UserOrganization {
  const demo = getMobileDemoData(locale);

  return {
    organization: demo.organization,
    membership: demo.membership,
  };
}

function LoginScreen({
  hasConfig,
  initialMessage,
  onAuthenticated,
}: {
  hasConfig: boolean;
  initialMessage: string | null;
  onAuthenticated: (user: User) => Promise<void>;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage);

  async function submit() {
    setMessage(null);

    if (!hasConfig) {
      setMessage('Supabase');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseMobileClient();
      const credentials = { email: email.trim(), password };
      const response =
        mode === 'sign-in'
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials);

      if (response.error) {
        throw response.error;
      }

      if (!response.data.user || !response.data.session) {
        setMessage(t('login.checkEmail'));
        return;
      }

      await onAuthenticated(response.data.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('login.authFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Soreya</Text>
        <Text style={styles.title}>{mode === 'sign-in' ? t('login.signIn') : t('login.signUp')}</Text>
        <Text style={styles.body}>
          {t('login.description')}
        </Text>

        {!hasConfig ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{t('login.missingSupabase')}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#a8a29e"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            onChangeText={setPassword}
            placeholder={t('login.password')}
            placeholderTextColor="#a8a29e"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={isSubmitting || !hasConfig}
            onPress={submit}
            style={[styles.primaryButton, (isSubmitting || !hasConfig) && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? `${t('common.loading')}...` : mode === 'sign-in' ? t('login.signIn') : t('login.signUp')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setMessage(null);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {mode === 'sign-in' ? t('login.createAccount') : t('login.useExisting')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#f7f6f2',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#57534e',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e5e4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
    width: '100%',
  },
  eyebrow: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1c1917',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginTop: 8,
  },
  body: {
    color: '#78716c',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  warningText: {
    color: '#92400e',
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
    gap: 12,
    marginTop: 18,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1c1917',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  messageBox: {
    backgroundColor: '#f5f5f4',
    borderColor: '#e7e5e4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  messageText: {
    color: '#57534e',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1c1917',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#a8a29e',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '700',
  },
});
