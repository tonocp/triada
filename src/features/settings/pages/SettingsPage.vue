<template>
  <div class="page-container">
    <h1 class="settings-title">{{ t('settings.title') }}</h1>

    <section class="settings-section">
      <h2 class="settings-heading">{{ t('settings.general') }}</h2>
      <Card>
        <template #content>
          <div class="form-group">
            <label for="settings-language">{{ t('settings.language') }}</label>
            <select id="settings-language" v-model="selectedLocale" class="settings-select">
              <option v-for="lang in supportedLocales" :key="lang.code" :value="lang.code">
                {{ lang.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="settings-currency">{{ t('settings.currency') }}</label>
            <select id="settings-currency" v-model="selectedCurrency" class="settings-select">
              <option v-for="curr in supportedCurrencies" :key="curr.code" :value="curr.code">
                {{ curr.symbol }} - {{ curr.name }}
              </option>
            </select>
          </div>
        </template>
      </Card>
    </section>

    <section class="settings-section">
      <h2 class="settings-heading">{{ t('settings.budgetSplit') }}</h2>
      <Card>
        <template #content>
          <BudgetSplitEditor v-model="splitDraft" />
          <p v-if="budgetYear" class="help-text">
            {{ t('settings.budgetSplitScope', { year: budgetYear.year }) }}
          </p>
          <Button
            id="settings-split-save"
            :label="t('common.save')"
            icon="pi pi-check"
            class="w-full settings-split-save"
            :disabled="!canSaveSplit"
            @click="saveSplit"
          />
        </template>
      </Card>
    </section>

    <section class="settings-section">
      <h2 class="settings-heading">{{ t('settings.data') }}</h2>
      <Card>
        <template #content>
          <div class="settings-actions">
            <Button
              id="settings-export"
              :label="t('dashboard.exportDatabase')"
              icon="pi pi-download"
              severity="secondary"
              outlined
              class="w-full"
              @click="exportBackup"
            />
            <Button
              id="settings-import"
              :label="t('dashboard.importDatabase')"
              icon="pi pi-upload"
              severity="secondary"
              outlined
              class="w-full"
              @click="openImportPicker"
            />
            <input
              ref="importFileInput"
              type="file"
              accept="application/json,.json"
              class="visually-hidden"
              @change="onImportFileSelected"
            />
            <p class="help-text">{{ t('dashboard.databaseImportSafetyHint') }}</p>
          </div>
        </template>
      </Card>
    </section>

    <p class="settings-about">{{ t('settings.about') }}</p>

    <Dialog
      v-model:visible="showImportConfirm"
      modal
      :header="t('dashboard.importDatabase')"
      :draggable="false"
      :style="{ width: '90vw' }"
    >
      <p>{{ t('dashboard.databaseImportConfirm') }}</p>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="cancelImport" />
        <Button
          id="settings-import-confirm"
          :label="t('common.confirm')"
          severity="danger"
          @click="confirmImport"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import {
  exportDatabase as exportDatabaseSnapshot,
  getLatestBudgetYear,
  importDatabase as importDatabaseSnapshot,
  updateBudgetSplitForYear,
} from '@/data/repositories';
import {
  DEFAULT_GROUP_SPLIT,
  GROUP_ORDER,
  isValidBudgetSplit,
  type BudgetSplit,
  type BudgetYear,
} from '@/domain/entities';
import { Button, Card } from '@/shared/components/atoms';
import { BudgetSplitEditor } from '@/shared/components/molecules';
import { useCurrency, type SupportedCurrency } from '@/shared/composables/useCurrency';
import { getLocale, setLocale, supportedLocales, type SupportedLocale } from '@/shared/i18n';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const { currency, setCurrency, supportedCurrencies } = useCurrency();

const selectedLocale = ref<SupportedLocale>(getLocale());
const selectedCurrency = ref<SupportedCurrency>(currency.value);
const importFileInput = ref<HTMLInputElement | null>(null);
const showImportConfirm = ref(false);
const pendingImportFile = ref<File | null>(null);

const budgetYear = ref<BudgetYear | null>(null);
const splitDraft = ref<BudgetSplit>({ ...DEFAULT_GROUP_SPLIT });
const isSavingSplit = ref(false);

const splitChanged = computed(
  () =>
    !!budgetYear.value &&
    GROUP_ORDER.some((group) => splitDraft.value[group] !== budgetYear.value?.split[group]),
);
const canSaveSplit = computed(
  () => splitChanged.value && isValidBudgetSplit(splitDraft.value) && !isSavingSplit.value,
);

const isNative = Capacitor.isNativePlatform();

onMounted(async () => {
  budgetYear.value = await getLatestBudgetYear();
  if (budgetYear.value) {
    splitDraft.value = { ...budgetYear.value.split };
  }
});

async function saveSplit(): Promise<void> {
  if (!budgetYear.value || !canSaveSplit.value) {
    return;
  }

  isSavingSplit.value = true;
  try {
    await updateBudgetSplitForYear({
      budgetYearId: budgetYear.value.id,
      split: splitDraft.value,
    });
    budgetYear.value.split = { ...splitDraft.value };
    toast.add({
      severity: 'success',
      summary: t('settings.budgetSplitUpdated'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to update budget split', { error });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('settings.budgetSplitError'),
      life: 3000,
    });
  } finally {
    isSavingSplit.value = false;
  }
}

watch(selectedLocale, (next) => {
  setLocale(next);
});

watch(selectedCurrency, (next) => {
  setCurrency(next);
});

function buildBackupFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `triada-backup-${year}-${month}-${day}.json`;
}

async function exportBackup(): Promise<void> {
  try {
    const snapshot = await exportDatabaseSnapshot();
    const payload = JSON.stringify(snapshot, null, 2);
    const fileName = buildBackupFileName();
    let exported = false;
    let successDetail = t('dashboard.databaseExported');

    if (isNative && Capacitor.getPlatform() === 'android') {
      try {
        await Filesystem.requestPermissions();
      } catch (permissionError) {
        console.error('Failed to request Android filesystem permissions', {
          error: permissionError,
        });
      }

      try {
        await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: payload,
          directory: Directory.ExternalStorage,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        exported = true;
        successDetail = t('dashboard.databaseExportedToDownloads', { fileName });
      } catch (writeError) {
        console.error('Failed to save backup file in Android downloads directory', {
          error: writeError,
          fileName,
        });
      }
    }

    if (!exported && isNative) {
      try {
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: payload,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: fileName,
          url: writeResult.uri,
          dialogTitle: t('dashboard.exportDatabase'),
        });
        exported = true;
        successDetail = t('dashboard.databaseExportedSharedFallback', { fileName });
      } catch (shareError) {
        if (shareError instanceof Error && shareError.name === 'AbortError') {
          return;
        }
        console.error('Failed to share native backup file', { error: shareError });
      }
    }

    if (!exported && typeof navigator.share === 'function') {
      try {
        const backupFile = new File([payload], fileName, { type: 'application/json' });
        await navigator.share({ files: [backupFile] });
        exported = true;
      } catch (shareError) {
        if (shareError instanceof Error && shareError.name === 'AbortError') {
          return;
        }
        console.error('Failed web share fallback for backup file', { error: shareError });
      }
    }

    if (!exported) {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    toast.add({
      severity: 'success',
      summary: t('dashboard.databaseExported'),
      detail: successDetail,
      life: 3000,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    console.error('Failed to export database snapshot', { error });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.databaseExportError'),
      life: 3000,
    });
  }
}

function openImportPicker(): void {
  importFileInput.value?.click();
}

function resetImportInput(): void {
  if (importFileInput.value) {
    importFileInput.value.value = '';
  }
}

function onImportFileSelected(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    resetImportInput();
    return;
  }

  pendingImportFile.value = file;
  showImportConfirm.value = true;
}

function cancelImport(): void {
  showImportConfirm.value = false;
  pendingImportFile.value = null;
  resetImportInput();
}

async function confirmImport(): Promise<void> {
  const file = pendingImportFile.value;
  showImportConfirm.value = false;

  if (!file) {
    return;
  }

  try {
    const fileContents = await file.text();
    const parsedSnapshot = JSON.parse(fileContents) as unknown;
    await importDatabaseSnapshot(parsedSnapshot);

    toast.add({
      severity: 'success',
      summary: t('dashboard.databaseImported'),
      detail: t('dashboard.databaseImported'),
      life: 3000,
    });

    void router.push({ name: 'year' });
  } catch (error) {
    const reason = error instanceof Error ? error.message : t('dashboard.databaseImportError');
    console.error('Failed to import database snapshot from settings', { error });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.databaseImportErrorWithReason', { reason }),
      life: 5000,
    });
  } finally {
    pendingImportFile.value = null;
    resetImportInput();
  }
}
</script>

<style scoped>
.settings-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}

.settings-section {
  margin-bottom: 1.5rem;
}

.settings-heading {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
  margin: 0 0.25rem 0.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.settings-select {
  width: 100%;
  padding: 0.6rem;
  border-radius: var(--t-r-sm);
  border: 1px solid var(--t-border);
  background: var(--t-surface);
  color: var(--t-ink);
  font: inherit;
}

.settings-split-save {
  margin-top: 0.85rem;
}

.settings-actions {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.help-text {
  font-size: 0.8rem;
  color: var(--t-ink-muted);
  margin: 0.25rem 0 0;
}

.settings-about {
  text-align: center;
  font-size: 0.8rem;
  color: var(--t-ink-faint);
  margin-top: 0.5rem;
}
</style>
