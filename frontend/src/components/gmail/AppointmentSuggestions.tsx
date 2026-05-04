import React, { useEffect, useState } from 'react';

import {
  acceptSuggestion,
  dismissSuggestion,
  getSuggestions
} from '../../services/gmailApi';
import { AppointmentSuggestion } from '../../types';
import styles from './AppointmentSuggestions.module.css';

function formatDateTime(date?: string, time?: string): string {
  if (!date) return '';
  const parts: string[] = [];
  const d = new Date(`${date}T00:00:00`);
  parts.push(
    d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  );
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const t = new Date();
    t.setHours(h, m);
    parts.push(
      t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    );
  }
  return parts.join(' at ');
}

const SuggestionCard: React.FC<{
  suggestion: AppointmentSuggestion;
  onAccept: () => Promise<void>;
  onDismiss: () => Promise<void>;
}> = ({ suggestion, onAccept, onDismiss }) => {
  const [submitting, setSubmitting] = useState(false);

  const withSubmit = async (action: () => Promise<void>) => {
    setSubmitting(true);
    try {
      await action();
    } finally {
      setSubmitting(false);
    }
  };

  const dateTime = formatDateTime(suggestion.date, suggestion.startTime);

  return (
    <li className={styles.card}>
      <div className={styles.cardTitle}>
        {suggestion.title || suggestion.subject}
      </div>
      {dateTime && <div className={styles.cardMeta}>{dateTime}</div>}
      {suggestion.location && (
        <div className={styles.cardMeta}>{suggestion.location}</div>
      )}
      <div className={styles.cardActions}>
        <button
          className={styles.acceptBtn}
          disabled={submitting}
          onClick={() => withSubmit(onAccept)}
        >
          Accept
        </button>
        <button
          className={styles.dismissBtn}
          disabled={submitting}
          onClick={() => withSubmit(onDismiss)}
        >
          Dismiss
        </button>
      </div>
    </li>
  );
};

const AppointmentSuggestions: React.FC = () => {
  const [suggestions, setSuggestions] = useState<AppointmentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await getSuggestions();
        if (!cancelled) setSuggestions(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = (messageId: string) =>
    setSuggestions((prev) => prev.filter((s) => s.messageId !== messageId));

  if (loading) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Suggested Appointments</h3>
        <p className={styles.statusText}>Checking emails...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Suggested Appointments</h3>
        <p className={styles.statusText}>{error}</p>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        Suggested Appointments{' '}
        <span className={styles.badge}>{suggestions.length}</span>
      </h3>
      <ul className={styles.list}>
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.messageId}
            suggestion={s}
            onAccept={async () => {
              await acceptSuggestion(s);
              remove(s.messageId);
            }}
            onDismiss={async () => {
              await dismissSuggestion(s.messageId);
              remove(s.messageId);
            }}
          />
        ))}
      </ul>
    </div>
  );
};

export default AppointmentSuggestions;
