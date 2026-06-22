import type {
  OrganizationBrainSettings,
  OrganizationRole,
  OrganizationService,
  ReasoningMode,
} from '@soreya/shared';
import { DEFAULT_ORGANIZATION_BRAIN_SETTINGS, getDemoBrainContext } from '@soreya/shared';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { DataRow } from '@/components/soreya-screen';
import { SoreyaDesign as D } from '@/constants/design';
import { shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { translateMobileError } from '@/lib/mobile-errors';
import { fetchWebApi, shouldUseMobileWebApi } from '@/lib/web-api';

const reasoningModes: ReasoningMode[] = ['conservative', 'balanced', 'proactive'];
const adminRoles: OrganizationRole[] = ['owner', 'admin'];

type BrainSettingsPanelProps = {
  role?: OrganizationRole;
};

export function BrainSettingsPanel({ role }: BrainSettingsPanelProps) {
  const { locale, t } = useI18n();
  const demoMode = shouldUseMobileDemoData();
  const usesWebApi = shouldUseMobileWebApi();
  const canManage = !demoMode && usesWebApi && role ? adminRoles.includes(role) : false;
  const readOnly = demoMode || !usesWebApi || !canManage;

  const [settings, setSettings] = useState<OrganizationBrainSettings>(DEFAULT_ORGANIZATION_BRAIN_SETTINGS);
  const [services, setServices] = useState<OrganizationService[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    slug: '',
    durationMinutes: '30',
    priceCents: '',
    aliases: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadBrain() {
      try {
        if (demoMode) {
          const demoBrain = getDemoBrainContext(locale);
          if (isMounted) {
            setSettings(demoBrain.settings);
            setServices(demoBrain.services);
            setMessage(t('mobile.brain.demoOnly'));
          }
          return;
        }

        if (!usesWebApi) {
          if (isMounted) {
            setMessage(t('mobile.brain.webApiRequired'));
          }
          return;
        }

        const payload = await fetchWebApi<{
          settings?: OrganizationBrainSettings;
          services?: OrganizationService[];
        }>('/api/organization/brain');

        if (isMounted) {
          setSettings(payload.settings ?? DEFAULT_ORGANIZATION_BRAIN_SETTINGS);
          setServices(payload.services ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(
            error instanceof Error
              ? translateMobileError(error.message, t)
              : t('common.unavailable'),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBrain();

    return () => {
      isMounted = false;
    };
  }, [demoMode, locale, t, usesWebApi]);

  async function saveSettings() {
    if (readOnly) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await fetchWebApi<{ settings?: OrganizationBrainSettings }>('/api/organization/brain', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setMessage(t('brain.saved'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function addService() {
    if (readOnly) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const payload = await fetchWebApi<{ service?: OrganizationService }>('/api/organization/services', {
        method: 'POST',
        body: JSON.stringify({
          name: serviceForm.name,
          slug: serviceForm.slug || undefined,
          durationMinutes: Number(serviceForm.durationMinutes),
          priceCents: serviceForm.priceCents === '' ? null : Number(serviceForm.priceCents),
          currency: 'EUR',
          aliases: serviceForm.aliases,
        }),
      });

      if (payload.service) {
        setServices((current) => [...current, payload.service!]);
      }

      setServiceForm({
        name: '',
        slug: '',
        durationMinutes: '30',
        priceCents: '',
        aliases: '',
      });
      setMessage(t('brain.serviceSaved'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <DataRow title={t('brain.title')} detail={`${t('common.loading')}…`} badge={t('common.info')} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>{t('brain.description')}</Text>

      {message ? <DataRow title={t('common.status')} detail={message} badge={t('common.info')} /> : null}

      {readOnly && !demoMode && usesWebApi ? (
        <DataRow title={t('mobile.brain.adminRequired')} detail={t('mobile.brain.openOnWeb')} badge={t('common.info')} />
      ) : null}

      <Text style={styles.label}>{t('brain.reasoningMode')}</Text>
      <View style={styles.modeRow}>
        {reasoningModes.map((mode) => (
          <Pressable
            key={mode}
            disabled={readOnly}
            onPress={() => setSettings((current) => ({ ...current, reasoningMode: mode }))}
            style={[
              styles.modeButton,
              settings.reasoningMode === mode ? styles.modeButtonActive : null,
              readOnly ? styles.readOnly : null,
            ]}>
            <Text
              style={[
                styles.modeButtonText,
                settings.reasoningMode === mode ? styles.modeButtonTextActive : null,
              ]}>
              {t(`brain.reasoningModes.${mode}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('brain.ownerStyleNotes')}</Text>
      <TextInput
        editable={!readOnly}
        multiline
        onChangeText={(value) => setSettings((current) => ({ ...current, ownerStyleNotes: value || null }))}
        placeholder={t('brain.ownerStyleNotesPlaceholder')}
        style={[styles.textArea, readOnly ? styles.readOnlyInput : null]}
        value={settings.ownerStyleNotes ?? ''}
      />

      <ToggleRow
        disabled={readOnly}
        label={t('brain.requireServiceBeforeSlots')}
        onValueChange={(value) => setSettings((current) => ({ ...current, requireServiceBeforeSlots: value }))}
        value={settings.requireServiceBeforeSlots}
      />
      <ToggleRow
        disabled={readOnly}
        label={t('brain.requireExplicitDate')}
        onValueChange={(value) => setSettings((current) => ({ ...current, requireExplicitDate: value }))}
        value={settings.requireExplicitDate}
      />

      {!readOnly ? (
        <Pressable disabled={isSaving} onPress={() => void saveSettings()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t('brain.saveBrain')}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>{t('brain.servicesTitle')}</Text>
      <Text style={styles.sectionDescription}>{t('brain.servicesDescription')}</Text>

      {services.length > 0 ? (
        services.map((service) => (
          <View key={service.id} style={styles.serviceCard}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceMeta}>
              {service.durationMinutes} min
              {service.priceCents !== null
                ? ` · ${(service.priceCents / 100).toFixed(2)} ${service.currency}`
                : ` · ${t('brain.priceOptional')}`}
            </Text>
            {service.aliases.length > 0 ? (
              <Text style={styles.serviceAliases}>{service.aliases.join(', ')}</Text>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{t('brain.emptyServices')}</Text>
      )}

      {!readOnly ? (
        <View style={styles.form}>
          <TextInput
            onChangeText={(value) => setServiceForm((current) => ({ ...current, name: value }))}
            placeholder={t('brain.serviceName')}
            style={styles.input}
            value={serviceForm.name}
          />
          <TextInput
            onChangeText={(value) => setServiceForm((current) => ({ ...current, slug: value }))}
            placeholder={t('brain.serviceSlug')}
            style={styles.input}
            value={serviceForm.slug}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => setServiceForm((current) => ({ ...current, durationMinutes: value }))}
            placeholder={t('brain.durationMinutes')}
            style={styles.input}
            value={serviceForm.durationMinutes}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => setServiceForm((current) => ({ ...current, priceCents: value }))}
            placeholder={t('brain.priceCents')}
            style={styles.input}
            value={serviceForm.priceCents}
          />
          <TextInput
            onChangeText={(value) => setServiceForm((current) => ({ ...current, aliases: value }))}
            placeholder={t('brain.aliases')}
            style={styles.input}
            value={serviceForm.aliases}
          />
          <Pressable disabled={isSaving} onPress={() => void addService()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t('brain.addService')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: D.border, true: D.trustBorder }}
        thumbColor={value ? D.trust : D.surfaceMuted}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  description: {
    color: '#525252',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'column',
    gap: 8,
  },
  modeButton: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeButtonActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  modeButtonText: {
    color: '#525252',
    fontSize: 13,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#0d9488',
  },
  readOnly: {
    opacity: 0.7,
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    fontSize: 14,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: '#fafaf9',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabel: {
    color: '#525252',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 8,
    minHeight: 46,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#171717',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  sectionDescription: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  serviceName: {
    color: '#171717',
    fontSize: 15,
    fontWeight: '700',
  },
  serviceMeta: {
    color: '#525252',
    fontSize: 13,
  },
  serviceAliases: {
    color: '#737373',
    fontSize: 12,
  },
  emptyText: {
    color: '#737373',
    fontSize: 13,
  },
  form: {
    gap: 10,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#525252',
    fontSize: 15,
    fontWeight: '700',
  },
});
