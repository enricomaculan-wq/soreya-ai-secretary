import { createOrganizationForUser, getUserOrganization, type UserOrganization } from '@soreya/database';
import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthCard,
  AuthNotice,
  AuthNoticeText,
  authFieldStyles,
  authScreenStyles,
} from '@/components/auth-card';
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
      <SafeAreaView style={authScreenStyles.screen}>
        <Text style={authScreenStyles.loadingText}>{t('common.loading')}...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        demoMode={demoMode}
        hasConfig={hasConfig}
        initialMessage={message}
        onAuthenticated={async (nextUser) => {
          setUser(nextUser);
          await loadOrganizationForUser(nextUser);
        }}
      />
    );
  }

  if (!userOrganization && hasConfig && !demoMode) {
    return (
      <OnboardingScreen
        onCreated={async () => {
          await loadOrganizationForUser(user);
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
  demoMode,
  hasConfig,
  initialMessage,
  onAuthenticated,
}: {
  demoMode: boolean;
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
      setMessage(t('login.missingSupabase'));
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
    <SafeAreaView style={authScreenStyles.screen}>
      <AuthCard
        badge={demoMode ? t('demo.badge') : undefined}
        description={demoMode ? t('demo.description') : t('login.description')}
        eyebrow="Soreya"
        title={mode === 'sign-in' ? t('login.signIn') : t('login.signUp')}
      >
        {!hasConfig && !demoMode ? (
          <AuthNotice tone="warning">
            <AuthNoticeText tone="warning">{t('login.missingSupabase')}</AuthNoticeText>
          </AuthNotice>
        ) : null}

        {demoMode ? (
          <AuthNotice tone="warning">
            <AuthNoticeText tone="warning">{t('demo.loginDescription')}</AuthNoticeText>
          </AuthNotice>
        ) : null}

        <View style={authFieldStyles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t('login.email')}
            placeholderTextColor="#a3a3a3"
            style={authFieldStyles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            onChangeText={setPassword}
            placeholder={t('login.password')}
            placeholderTextColor="#a3a3a3"
            secureTextEntry
            style={authFieldStyles.input}
            value={password}
          />

          {message ? (
            <View style={authFieldStyles.messageBox}>
              <Text style={authFieldStyles.messageText}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={isSubmitting || !hasConfig}
            onPress={submit}
            style={[authFieldStyles.primaryButton, (isSubmitting || !hasConfig) && authFieldStyles.disabledButton]}
          >
            <Text style={authFieldStyles.primaryButtonText}>
              {isSubmitting ? `${t('common.loading')}...` : mode === 'sign-in' ? t('login.signIn') : t('login.signUp')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setMessage(null);
            }}
            style={authFieldStyles.secondaryLink}
          >
            <Text style={authFieldStyles.secondaryLinkText}>
              {mode === 'sign-in' ? t('login.createAccount') : t('login.useExisting')}
            </Text>
          </Pressable>
        </View>
      </AuthCard>
    </SafeAreaView>
  );
}

function OnboardingScreen({ onCreated }: { onCreated: () => Promise<void> }) {
  const { t } = useI18n();
  const [organizationName, setOrganizationName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Rome');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setMessage(null);
    setIsSubmitting(true);

    try {
      await createOrganizationForUser(getSupabaseMobileClient(), {
        name: organizationName,
        timezone,
      });
      await onCreated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('common.unavailable'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={authScreenStyles.screen}>
      <AuthCard
        description={t('onboarding.description')}
        eyebrow={t('onboarding.eyebrow')}
        title={t('onboarding.title')}
      >
        <View style={authFieldStyles.form}>
          <View>
            <Text style={authFieldStyles.label}>{t('onboarding.organizationName')}</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setOrganizationName}
              placeholder={t('onboarding.organizationName')}
              placeholderTextColor="#a3a3a3"
              style={authFieldStyles.input}
              value={organizationName}
            />
          </View>

          <View>
            <Text style={authFieldStyles.label}>{t('onboarding.defaultTimezone')}</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setTimezone}
              placeholder="Europe/Rome"
              placeholderTextColor="#a3a3a3"
              style={authFieldStyles.input}
              value={timezone}
            />
          </View>

          <AuthNotice tone="trust">
            <AuthNoticeText tone="trust">{t('onboarding.firstMembership')}</AuthNoticeText>
          </AuthNotice>

          {message ? (
            <View style={authFieldStyles.messageBox}>
              <Text style={authFieldStyles.messageText}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={isSubmitting || organizationName.trim().length < 2}
            onPress={submit}
            style={[
              authFieldStyles.primaryButton,
              (isSubmitting || organizationName.trim().length < 2) && authFieldStyles.disabledButton,
            ]}
          >
            <Text style={authFieldStyles.primaryButtonText}>
              {isSubmitting ? `${t('common.loading')}...` : t('onboarding.createOrganization')}
            </Text>
          </Pressable>
        </View>
      </AuthCard>
    </SafeAreaView>
  );
}
