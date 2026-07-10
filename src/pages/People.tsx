import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Check, X, Users } from 'lucide-react';
import {
  searchProfiles,
  incomingRequests,
  acceptRequest,
  rejectRequest,
} from '../lib/social';
import { EmptyState } from '../components/EmptyState';
import type { Profile } from '../types';

export function People() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<Profile[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    incomingRequests().then(setRequests).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        setResults(await searchProfiles(q));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  async function accept(p: Profile) {
    await acceptRequest(p.id);
    setRequests((r) => r.filter((x) => x.id !== p.id));
  }
  async function reject(p: Profile) {
    await rejectRequest(p.id);
    setRequests((r) => r.filter((x) => x.id !== p.id));
  }

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-bold lg:text-4xl">{t('people.title')}</h1>

      {/* Follow requests */}
      {requests.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            {t('people.requests')}
          </h2>
          <div className="space-y-2">
            {requests.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5">
                <Avatar name={p.displayName} />
                <Link to={`/u/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.displayName}</p>
                  <p className="truncate text-xs text-faint">@{p.username}</p>
                </Link>
                <button onClick={() => accept(p)} className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-navy-950" aria-label={t('people.accept')}>
                  <Check size={17} strokeWidth={2.5} />
                </button>
                <button onClick={() => reject(p)} className="grid h-9 w-9 place-items-center rounded-lg border border-overlay/10 text-muted hover:text-rose-300" aria-label={t('people.reject')}>
                  <X size={17} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint">
          <Search size={19} strokeWidth={1.75} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('people.search_placeholder')}
          className="w-full rounded-2xl border border-overlay/[0.08] bg-navy-800 py-3 ps-11 pe-4 text-base outline-none transition-colors placeholder:text-faint focus:border-gold/60"
        />
      </div>

      {loading && <p className="text-sm text-faint">{t('common.loading')}</p>}

      {!loading && results && results.length === 0 && (
        <EmptyState icon={<Users size={22} strokeWidth={1.5} />} title={t('people.no_results')} body="" />
      )}

      {!loading && results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((p) => (
            <Link key={p.id} to={`/u/${p.id}`} className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5 hover:bg-navy-700">
              <Avatar name={p.displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.displayName}</p>
                <p className="truncate text-xs text-faint">@{p.username}</p>
              </div>
              <UserPlus size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      )}

      {!loading && !results && requests.length === 0 && (
        <EmptyState
          icon={<Users size={22} strokeWidth={1.5} />}
          title={t('people.empty_title')}
          body={t('people.empty_body')}
        />
      )}
    </div>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-navy-700 font-display text-muted"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}
