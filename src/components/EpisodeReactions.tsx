import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasSupabase } from '../lib/supabase';
import {
  episodeReactions,
  myEpisodeReaction,
  saveEpisodeReaction,
  getMyProfile,
  type EpisodeReaction,
} from '../lib/social';
import { timeAgo } from '../lib/format';
import { Avatar } from '../pages/People';

const EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

/** Emoji + short comment on an episode, plus the reactions your friends left. */
export function EpisodeReactions({ episodeId, showId }: { episodeId: string; showId: number }) {
  const { t, i18n } = useTranslation();
  const [signedIn, setSignedIn] = useState(false);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [list, setList] = useState<EpisodeReaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => episodeReactions(episodeId).then(setList).catch(() => {});

  useEffect(() => {
    if (!hasSupabase) return;
    let cancelled = false;
    (async () => {
      const me = await getMyProfile();
      if (cancelled) return;
      setSignedIn(!!me);
      if (me) {
        const mine = await myEpisodeReaction(episodeId);
        if (cancelled) return;
        setEmoji(mine?.emoji ?? null);
        setBody(mine?.body ?? '');
      }
      load();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId]);

  if (!hasSupabase) return null;

  async function save() {
    setBusy(true);
    await saveEpisodeReaction(episodeId, showId, { emoji, body });
    await load();
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const others = list.filter((r) => r.body); // rows worth showing as comments

  return (
    <div className="border-t border-overlay/[0.06] pt-4">
      <p className="mb-2 text-xs font-semibold text-muted">{t('reactions.title')}</p>

      {signedIn && (
        <div className="rounded-xl bg-overlay/[0.04] p-3">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji((cur) => (cur === e ? null : e))}
                className={`grid h-9 w-9 place-items-center rounded-lg text-lg transition-colors ${
                  emoji === e ? 'bg-gold/20 ring-1 ring-gold/60' : 'hover:bg-overlay/[0.06]'
                }`}
                aria-pressed={emoji === e}
              >
                {e}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('reactions.placeholder')}
            rows={2}
            maxLength={280}
            className="mt-2 w-full resize-none rounded-lg border border-overlay/[0.08] bg-navy-700 px-3 py-2 text-sm outline-none focus:border-gold/50"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            {saved && <span className="text-xs text-emerald-300">{t('episode.note_saved')}</span>}
            <button onClick={save} disabled={busy} className="btn-gold text-sm">
              {t('reactions.post')}
            </button>
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-3 space-y-2">
          {others.map((r) => (
            <div key={r.profile.id} className="flex gap-2.5">
              <Avatar name={r.profile.displayName} url={r.profile.avatarUrl} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <span className="font-semibold">{r.profile.displayName}</span>
                  {r.emoji ? <span className="ms-1">{r.emoji}</span> : null}
                  <span className="ms-1.5 text-faint">{timeAgo(r.createdAt, i18n.language, t('notifications.just_now'))}</span>
                </p>
                {r.body && <p className="text-sm leading-relaxed text-fg">{r.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
