import {
  PUBLIC_BOUNDARY,
  PUBLIC_EVIDENCE_LINKS,
  PUBLIC_TRUTH_ROWS,
} from '@/lib/public-claims/boundary';
import Link from 'next/link';
import styles from './public-boundary.module.css';

export default function Page() {
  return (
    <main className={styles.shell}>
      <div className={styles.field} aria-hidden="true" />

      <header className={styles.masthead}>
        <Link className={styles.wordmark} href="/" aria-label="BIZRA home">
          <span className={styles.seed} aria-hidden="true">
            ◇
          </span>
          BIZRA
        </Link>
        <div className={styles.reviewStamp}>
          <span>Public boundary</span>
          <time dateTime={PUBLIC_BOUNDARY.reviewedOnIso}>
            Reviewed {PUBLIC_BOUNDARY.reviewedOnDisplay}
          </time>
          <time dateTime={PUBLIC_BOUNDARY.evidenceRefreshedOnIso}>
            Evidence baseline {PUBLIC_BOUNDARY.evidenceRefreshedOnDisplay}
          </time>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="boundary-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Evidence before trust</p>
          <h1 id="boundary-title">Trust begins where the claim stops.</h1>
          <p className={styles.lede}>
            A narrow map of what available evidence supports, what remains local,
            and what is not live.
          </p>
        </div>

        <div className={styles.aperture} aria-hidden="true">
          <div className={styles.apertureCore}>
            <span>Claim</span>
            <strong>Evidence</strong>
            <span>Boundary</span>
          </div>
        </div>
      </section>

      <section className={styles.truthPanel} aria-labelledby="truth-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Current state</p>
          <h2 id="truth-heading">The public truth, without projection</h2>
          <p>
            Status language follows the Dema claim register. A label describes the
            evidence state; it is not a marketing tier.
          </p>
        </div>

        <ul className={styles.truthList} aria-label="Current public truth">
          {PUBLIC_TRUTH_ROWS.map((row, index) => (
            <li className={styles.truthRow} key={row.claimId}>
              <div className={styles.rowIndex} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className={styles.rowBody}>
                <span className={styles.truthLabel}>
                  {row.label}
                  <small className={styles.claimId}>{row.claimId}</small>
                </span>
                <div className={styles.claimCopy}>
                  <p>{row.statement}</p>
                  <a
                    aria-label={`Evidence for ${row.claimId} (opens in new tab)`}
                    className={styles.claimEvidence}
                    href={row.evidenceHref}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Evidence baseline <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.evidencePanel} aria-labelledby="evidence-heading">
        <div>
          <p className={styles.eyebrow}>Inspect the sources</p>
          <h2 id="evidence-heading">Read the boundary itself.</h2>
        </div>

        <div className={styles.evidenceLinks}>
          {PUBLIC_EVIDENCE_LINKS.map((link) => (
            <a
              className={styles.evidenceLink}
              href={link.href}
              key={link.label}
              rel="noreferrer"
              target="_blank"
            >
              <span>
                <strong>{link.label}</strong>
                <small>{link.description}</small>
                <span className={styles.srOnly}>Opens in a new tab.</span>
              </span>
              <span className={styles.arrow} aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <span>
          Audited source base {PUBLIC_BOUNDARY.sourceCommit.slice(0, 12)}
        </span>
        <span>
          Evidence baseline {PUBLIC_BOUNDARY.evidenceCommit.slice(0, 12)}
        </span>
      </footer>
    </main>
  );
}
