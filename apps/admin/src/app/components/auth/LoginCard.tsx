'use client';

import Image from 'next/image';
import logo from '../../public/logo.png';
import styles from './LoginCard.module.scss';

type LoginCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * Shared shell for the public and admin login pages.
 * Holds branding, heading, and a slot for the form.
 */
export function LoginCard({ title, subtitle, children }: LoginCardProps) {
  return (
    <section className={styles.card} aria-labelledby="login-title">
      <div className={styles.brand}>
        <Image src={logo} alt="Agrilogy" height={44} priority />
      </div>
      <div className={styles.accent} aria-hidden="true" />
      <header className={styles.header}>
        <h1 id="login-title" className={styles.title}>
          {title}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
