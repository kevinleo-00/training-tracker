import { type ReactNode, useEffect, useId } from 'react';
import { useI18n } from '../i18n';
import { Icon } from './Icon';

/** A bottom sheet that sits above everything, including the tab bar. */
export function Sheet({
  title,
  onClose,
  children,
  tall = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Fill the screen, so a focused field stays near the top, clear of the keyboard. */
  tall?: boolean;
}) {
  const titleId = useId();
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={tall ? 'sheet tall' : 'sheet'} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" aria-label={t.common.close} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="sheet-message">{message}</p>
      <div className="stack">
        <button type="button" className="button danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="button secondary" onClick={onClose}>
          {t.common.cancel}
        </button>
      </div>
    </Sheet>
  );
}

export interface SheetAction {
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function ActionSheet({ title, actions, onClose }: { title: string; actions: SheetAction[]; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="action-list">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={a.danger ? 'action danger' : 'action'}
            disabled={a.disabled}
            onClick={() => {
              onClose();
              a.onSelect();
            }}
          >
            <Icon name={a.icon} />
            {a.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
