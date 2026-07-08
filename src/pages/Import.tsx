import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  parseUpload,
  mergeResults,
  groupBySeries,
} from '../lib/importParser';
import { autoMatchGroups, commitImport } from '../lib/importer';
import { celebrate } from '../lib/celebrate';
import { formatWatchTime, formatNumber } from '../lib/format';
import { Poster } from '../components/Poster';
import { ManualMatchModal } from './ManualMatchModal';
import type { ParsedShowGroup, ImportSummary, Show } from '../types';

type Stage =
  | 'idle'
  | 'reading'
  | 'matching'
  | 'preview'
  | 'importing'
  | 'done'
  | 'error'
  | 'empty';

export function Import() {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<Stage>('idle');
  const [groups, setGroups] = useState<ParsedShowGroup[]>([]);
  const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [currentPoster, setCurrentPoster] = useState<Show | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [manualGroup, setManualGroup] = useState<ParsedShowGroup | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setStage('reading');
      try {
        const results = await Promise.all(list.map(parseUpload));
        const merged = mergeResults(results);
        setIgnoredFiles(merged.ignoredFiles);
        if (merged.watches.length === 0) {
          setStage('empty');
          return;
        }
        const grouped = groupBySeries(merged.watches);
        setGroups(grouped);
        setStage('matching');
        setProgress({ done: 0, total: grouped.length });
        await autoMatchGroups(grouped, (done, total) =>
          setProgress({ done, total }),
        );
        setGroups([...grouped]);
        setStage('preview');
      } catch {
        setStage('error');
      }
    },
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  async function runImport() {
    setStage('importing');
    setProgress({ done: 0, total: groups.filter((g) => g.resolved).length });
    const result = await commitImport(groups, (done, total, show) => {
      setProgress({ done, total });
      setCurrentPoster(show);
    });
    setSummary(result);
    setStage('done');
    celebrate('big');
  }

  function resolveManual(group: ParsedShowGroup, show: Show) {
    group.match = show;
    group.resolved = true;
    setGroups([...groups]);
    setManualGroup(null);
  }
  function skipManual(group: ParsedShowGroup) {
    group.resolved = false;
    group.match = null;
    setGroups([...groups]);
    setManualGroup(null);
  }

  const matchedCount = groups.filter((g) => g.resolved && g.match).length;
  const unmatchedCount = groups.length - matchedCount;
  const totalEpisodes = groups.reduce((a, g) => a + g.episodeCount, 0);

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-2xl font-extrabold">{t('import.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('import.subtitle')}</p>
      </div>

      <AnimatePresence mode="wait">
        {stage === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
                dragging
                  ? 'border-gold bg-gold/10'
                  : 'border-overlay/15 bg-overlay/[0.02] hover:border-gold/40'
              }`}
            >
              <div className="mb-4 text-5xl">📦</div>
              <p className="font-bold">{t('import.dropzone_title')}</p>
              <p className="mt-1 text-sm text-muted">
                {t('import.dropzone_body')}
              </p>
              <span className="btn-gold mt-5">{t('import.browse')}</span>
              <input
                ref={inputRef}
                type="file"
                accept=".zip,.csv"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          </motion.div>
        )}

        {(stage === 'reading' || stage === 'matching') && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card flex flex-col items-center p-10 text-center">
              <Spinner />
              <p className="mt-4 font-semibold">
                {stage === 'reading' ? t('import.reading') : t('import.matching')}
              </p>
              {stage === 'matching' && progress.total > 0 && (
                <div className="mt-4 w-full max-w-xs">
                  <ProgressBar done={progress.done} total={progress.total} />
                  <p className="mt-2 text-xs text-faint">
                    {progress.done} / {progress.total}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <PreviewStat value={formatNumber(groups.length, i18n.language)} label={t('discover.title')} />
              <PreviewStat value={formatNumber(totalEpisodes, i18n.language)} label={t('common.episodes')} />
              <PreviewStat
                value={formatNumber(unmatchedCount, i18n.language)}
                label={t('import.needs_match')}
                warn={unmatchedCount > 0}
              />
            </div>

            {ignoredFiles.length > 0 && (
              <p className="rounded-xl bg-overlay/5 px-3 py-2 text-xs text-muted">
                {t('import.ignored_files', { files: ignoredFiles.join(', ') })}
              </p>
            )}

            <div className="space-y-2">
              {groups.map((g) => (
                <GroupRow
                  key={g.seriesExternalId ?? g.seriesName}
                  group={g}
                  onMatch={() => setManualGroup(g)}
                />
              ))}
            </div>

            <div className="sticky bottom-24 space-y-2">
              <button
                className="btn-gold w-full"
                disabled={matchedCount === 0}
                onClick={runImport}
              >
                {t('import.confirm_import', { count: matchedCount })}
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'importing' && (
          <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="card flex flex-col items-center p-10 text-center">
              <AnimatePresence mode="popLayout">
                {currentPoster && (
                  <motion.div
                    key={currentPoster.id}
                    initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    className="mb-4 w-24"
                  >
                    <Poster
                      path={currentPoster.posterPath}
                      alt={currentPoster.name}
                      className="aspect-[2/3] rounded-xl ring-1 ring-gold/40"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="font-semibold">{t('import.importing')}</p>
              <p className="mt-1 h-5 text-sm text-gold-400">
                {currentPoster?.name}
              </p>
              <div className="mt-4 w-full max-w-xs">
                <ProgressBar done={progress.done} total={progress.total} />
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'done' && summary && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="card p-8 text-center">
              <div className="mb-3 text-5xl">🎉</div>
              <h2 className="text-xl font-extrabold">{t('import.done_title')}</h2>
              <p className="mt-3 text-fg">
                {t('import.done_body', {
                  episodes: formatNumber(summary.episodesImported, i18n.language),
                  time: formatWatchTime(summary.totalMinutes, t),
                })}
              </p>
              {summary.duplicatesSkipped > 0 && (
                <p className="mt-2 text-sm text-faint">
                  {t('import.done_duplicates', {
                    count: summary.duplicatesSkipped,
                  })}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2">
                <Link to="/profile" className="btn-gold">
                  {t('import.view_profile')}
                </Link>
                <Link to="/" className="btn-ghost">
                  {t('nav.home')}
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'empty' && (
          <ErrorCard
            key="empty"
            icon="🔎"
            title={t('import.nothing_found_title')}
            body={t('import.nothing_found_body')}
            onRetry={() => setStage('idle')}
            retryLabel={t('common.retry')}
          />
        )}

        {stage === 'error' && (
          <ErrorCard
            key="error"
            icon="😕"
            title={t('import.error_title')}
            body={t('import.error_body')}
            onRetry={() => setStage('idle')}
            retryLabel={t('common.retry')}
          />
        )}
      </AnimatePresence>

      {manualGroup && (
        <ManualMatchModal
          group={manualGroup}
          onResolve={(show) => resolveManual(manualGroup, show)}
          onSkip={() => skipManual(manualGroup)}
          onClose={() => setManualGroup(null)}
        />
      )}
    </div>
  );
}

function GroupRow({
  group,
  onMatch,
}: {
  group: ParsedShowGroup;
  onMatch: () => void;
}) {
  const { t } = useTranslation();
  const resolved = group.resolved && group.match;
  return (
    <div className="card flex items-center gap-3 p-2.5">
      <div className="h-16 w-11 shrink-0">
        {group.match ? (
          <Poster
            path={group.match.posterPath}
            alt={group.match.name}
            size="w200"
            className="h-full w-full rounded-md"
          />
        ) : (
          <div className="grid h-full w-full place-items-center rounded-md bg-navy-700 text-faint">
            ?
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {group.match?.name ?? group.seriesName}
        </p>
        <p className="text-xs text-faint">
          {group.match && group.match.name !== group.seriesName
            ? `${group.seriesName} · `
            : ''}
          {group.episodeCount} {t('common.episodes')}
        </p>
      </div>
      {resolved ? (
        <span className="chip bg-emerald-500/15 text-emerald-300">
          {t('import.matched')}
        </span>
      ) : (
        <button
          onClick={onMatch}
          className="chip bg-gold/15 text-gold-400 hover:bg-gold/25"
        >
          {t('import.match_manually')}
        </button>
      )}
    </div>
  );
}

function PreviewStat({
  value,
  label,
  warn,
}: {
  value: string;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className="card p-3 text-center">
      <p className={`text-xl font-extrabold ${warn ? 'text-rose-300' : ''}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-overlay/10">
      <motion.div
        className="h-full rounded-full bg-gold"
        animate={{ width: `${pct}%` }}
        transition={{ ease: 'easeOut' }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-overlay/10 border-t-gold" />
  );
}

function ErrorCard({
  icon,
  title,
  body,
  onRetry,
  retryLabel,
}: {
  icon: string;
  title: string;
  body: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card p-8 text-center">
        <div className="mb-3 text-4xl">{icon}</div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <button className="btn-gold mt-5" onClick={onRetry}>
          {retryLabel}
        </button>
      </div>
    </motion.div>
  );
}
