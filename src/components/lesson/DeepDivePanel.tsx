import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { remixTopicsPath, selectTopicChips } from "../../domain/lessonRecap";
import { DeepDiveChooserModal } from "../path/DeepDiveChooserModal";
import { Button } from "../common/Button";
import styles from "./DeepDivePanel.module.css";

/**
 * The recap's Deep Dive entry: one panel whose height doesn't depend on how
 * many topics the lesson has. "Remix these topics" is the primary action
 * (every root topic, the lesson-less remix route); up to three topics are
 * small "browse this topic" links and anything past that collapses into a
 * "+N more" chip opening the Journey's DeepDiveChooserModal, which lists every
 * depth. `topicIds` are the lesson's root tags and `lessonKey` the lesson they
 * came from (the browse page's `from`).
 */
export function DeepDivePanel({ lessonKey, topicIds }: { lessonKey: string; topicIds: readonly string[] }) {
  const navigate = useNavigate();
  const [chooserOpen, setChooserOpen] = useState(false);
  const { shown, hidden } = selectTopicChips(topicIds);

  return (
    <section className={styles.panel} aria-label="Deep Dive">
      <div className={styles.head}>
        <b className={styles.title}>Deep Dive</b>
        <span className={styles.hint}>More on this lesson's topics</span>
      </div>
      <Button variant="deepDive" onClick={() => navigate(remixTopicsPath(topicIds))}>
        Remix these topics
      </Button>
      <div className={styles.chips}>
        {shown.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.chip}
            title={id}
            onClick={() => navigate(`/themes/${encodeURIComponent(id)}?from=${encodeURIComponent(lessonKey)}`)}
          >
            {id}
          </button>
        ))}
        {hidden > 0 && (
          <button type="button" className={`${styles.chip} ${styles.more}`} onClick={() => setChooserOpen(true)}>
            +{hidden} more
          </button>
        )}
      </div>
      {chooserOpen && <DeepDiveChooserModal lessonKey={lessonKey} onClose={() => setChooserOpen(false)} />}
    </section>
  );
}
