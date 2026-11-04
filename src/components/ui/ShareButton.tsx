import { Share2 } from 'lucide-react';
import { useApp } from '../../state/app-context';

/** Shares the address of what is open: the phone's share sheet, or a copied link. */
export function ShareButton({ title }: { title: string }) {
  const { notify } = useApp();

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closed without sharing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      notify('success', 'Link je kopiran.');
    } catch {
      notify('error', 'Link nije kopiran. Kopiraj adresu iz pregledača.');
    }
  };

  return (
    <button type="button" className="link-btn link-btn--muted" onClick={() => void share()}>
      <Share2 size={13} aria-hidden="true" />
      Podeli
    </button>
  );
}
