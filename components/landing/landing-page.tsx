'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  TrendingUp, Briefcase, Bell, Bot, CalendarDays,
  FileUp, ChevronRight, ArrowRight, CheckCircle,
  BarChart2, Coins, Shield, Zap,
} from 'lucide-react'

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      let start = 0
      const step = to / 40
      const timer = setInterval(() => {
        start += step
        if (start >= to) { setValue(to); clearInterval(timer) }
        else setValue(Math.floor(start))
      }, 30)
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{value.toLocaleString('ru-RU')}{suffix}</span>
}

// ─── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType; title: string; desc: string; color: string
}) {
  return (
    <div className="lp-card group">
      <div className={`lp-icon-wrap ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="lp-feature-title">{title}</h3>
      <p className="lp-feature-desc">{desc}</p>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <style>{`
        /* ── Reset & base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: #080e1a;
          color: #e8eaf0;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ── Nav ── */
        .lp-nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.25rem; height: 60px;
          background: rgba(8,14,26,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lp-logo {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600; color: #e8eaf0;
          text-decoration: none; letter-spacing: -0.02em;
        }
        .lp-logo-dot {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg, #c9a84c, #e8c76a);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lp-nav-links {
          display: none; gap: 1.5rem;
          list-style: none;
        }
        @media (min-width: 640px) { .lp-nav-links { display: flex; } }
        .lp-nav-links a {
          font-size: 14px; color: #9aa0b0; text-decoration: none;
          transition: color 0.2s;
        }
        .lp-nav-links a:hover { color: #e8eaf0; }
        .lp-nav-cta {
          display: flex; align-items: center; gap: 8px;
        }
        .lp-btn-ghost {
          font-size: 14px; color: #9aa0b0; text-decoration: none;
          padding: 7px 12px; border-radius: 8px;
          transition: color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .lp-btn-ghost:hover { color: #e8eaf0; background: rgba(255,255,255,0.06); }
        .lp-btn-gold {
          font-size: 14px; font-weight: 500;
          background: linear-gradient(135deg, #c9a84c, #e8c76a);
          color: #0a0e1a;
          padding: 7px 16px; border-radius: 8px;
          text-decoration: none; white-space: nowrap;
          transition: opacity 0.2s, transform 0.15s;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .lp-btn-gold:hover { opacity: 0.9; transform: translateY(-1px); }
        .lp-btn-gold:active { transform: translateY(0); }

        /* ── Hero ── */
        .lp-hero {
          position: relative; overflow: hidden;
          padding: 4rem 1.25rem 3rem;
          text-align: center;
          min-height: 80vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1.5rem;
        }
        .lp-glow-1 {
          position: absolute; width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%);
          top: -200px; left: 50%; transform: translateX(-50%);
          pointer-events: none;
        }
        .lp-glow-2 {
          position: absolute; width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,153,34,0.08) 0%, transparent 70%);
          bottom: 0; right: -100px;
          pointer-events: none;
        }
        .lp-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 500; letter-spacing: 0.04em;
          color: #c9a84c;
          padding: 5px 12px; border-radius: 20px;
          border: 1px solid rgba(201,168,76,0.3);
          background: rgba(201,168,76,0.08);
        }
        .lp-h1 {
          font-size: clamp(2rem, 8vw, 3.5rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #f0f2f8;
          max-width: 700px;
        }
        .lp-h1 .gold { color: #c9a84c; }
        .lp-subtitle {
          font-size: clamp(1rem, 3vw, 1.2rem);
          color: #7a8090;
          max-width: 520px;
          line-height: 1.6;
        }
        .lp-hero-btns {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; width: 100%;
        }
        @media (min-width: 480px) {
          .lp-hero-btns { flex-direction: row; justify-content: center; width: auto; }
        }
        .lp-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600;
          background: linear-gradient(135deg, #c9a84c, #e8c76a);
          color: #080e1a;
          padding: 13px 24px; border-radius: 10px;
          text-decoration: none; width: 100%; justify-content: center;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 8px 32px rgba(201,168,76,0.25);
        }
        @media (min-width: 480px) { .lp-btn-primary { width: auto; } }
        .lp-btn-primary:hover { opacity: 0.92; transform: translateY(-2px); }
        .lp-btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 14px; font-weight: 500; color: #9aa0b0;
          padding: 13px 20px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          text-decoration: none; width: 100%; justify-content: center;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        @media (min-width: 480px) { .lp-btn-secondary { width: auto; } }
        .lp-btn-secondary:hover { border-color: rgba(255,255,255,0.2); color: #e8eaf0; background: rgba(255,255,255,0.04); }

        .lp-hero-note {
          font-size: 12px; color: #4a5060;
          display: flex; align-items: center; gap: 6px;
        }

        /* ── Dashboard mockup ── */
        .lp-mockup-wrap {
          width: 100%; max-width: 760px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }
        .lp-mockup {
          background: #0f1624;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.06);
        }
        .lp-mockup-bar {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 14px;
          background: #0a1020;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lp-dot { width: 10px; height: 10px; border-radius: 50%; }
        .lp-mockup-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .lp-mock-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (min-width: 480px) {
          .lp-mock-row { grid-template-columns: repeat(4, 1fr); }
        }
        .lp-mock-card {
          background: #141c2e;
          border-radius: 10px; padding: 12px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .lp-mock-label { font-size: 10px; color: #4a5568; margin-bottom: 4px; }
        .lp-mock-val { font-size: 16px; font-weight: 700; font-family: 'DM Mono', monospace; }
        .lp-mock-val.green { color: #4caf82; }
        .lp-mock-val.gold { color: #c9a84c; }
        .lp-mock-val.white { color: #e0e4f0; }
        .lp-mock-bars {
          background: #141c2e; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          padding: 12px;
          display: flex; align-items: flex-end; gap: 6px; height: 80px;
        }
        .lp-mock-bar {
          flex: 1; border-radius: 4px 4px 0 0;
          background: rgba(201,168,76,0.2);
          transition: height 0.4s;
        }
        .lp-mock-bar.active { background: #c9a84c; }

        /* ── Stats ── */
        .lp-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px; background: rgba(255,255,255,0.06);
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lp-stat {
          background: #080e1a;
          padding: 1.5rem 1rem; text-align: center;
        }
        .lp-stat-num {
          font-size: clamp(1.6rem, 5vw, 2.5rem);
          font-weight: 700; color: #c9a84c;
          font-family: 'DM Mono', monospace;
          letter-spacing: -0.02em; line-height: 1;
        }
        .lp-stat-label { font-size: 11px; color: #4a5060; margin-top: 6px; line-height: 1.4; }

        /* ── Section ── */
        .lp-section { padding: 4rem 1.25rem; }
        .lp-section-center { text-align: center; }
        .lp-tag {
          display: inline-block; font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #c9a84c; margin-bottom: 0.75rem;
        }
        .lp-h2 {
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          font-weight: 700; letter-spacing: -0.03em; line-height: 1.1;
          color: #f0f2f8;
        }
        .lp-section-desc {
          margin-top: 0.75rem; font-size: 15px; color: #6a7080;
          max-width: 480px; line-height: 1.6; margin-left: auto; margin-right: auto;
        }

        /* ── Features grid ── */
        .lp-features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 2.5rem;
        }
        @media (min-width: 480px) { .lp-features-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 768px) { .lp-features-grid { grid-template-columns: repeat(3, 1fr); } }

        .lp-card {
          background: #0f1624;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 1.25rem;
          transition: border-color 0.2s, transform 0.2s;
        }
        .lp-card:hover { border-color: rgba(201,168,76,0.2); transform: translateY(-2px); }
        .lp-icon-wrap {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px; flex-shrink: 0;
        }
        .ic-gold { background: rgba(201,168,76,0.15); color: #c9a84c; }
        .ic-green { background: rgba(76,175,130,0.15); color: #4caf82; }
        .ic-blue { background: rgba(99,139,227,0.15); color: #638be3; }
        .ic-purple { background: rgba(151,99,227,0.15); color: #9763e3; }
        .ic-teal { background: rgba(56,178,172,0.15); color: #38b2ac; }
        .ic-orange { background: rgba(235,140,60,0.15); color: #eb8c3c; }

        .lp-feature-title {
          font-size: 14px; font-weight: 600; color: #d0d4e0; margin-bottom: 6px;
        }
        .lp-feature-desc { font-size: 13px; color: #5a6070; line-height: 1.55; }

        /* ── How it works ── */
        .lp-steps {
          display: flex; flex-direction: column; gap: 0;
          margin-top: 2.5rem; max-width: 520px; margin-left: auto; margin-right: auto;
        }
        .lp-step {
          display: flex; gap: 16px; align-items: flex-start;
          padding-bottom: 2rem; position: relative;
        }
        .lp-step:not(:last-child)::before {
          content: ''; position: absolute;
          left: 19px; top: 40px; bottom: 0; width: 1px;
          background: linear-gradient(to bottom, rgba(201,168,76,0.3), transparent);
        }
        .lp-step-num {
          width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.3);
          color: #c9a84c; font-size: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .lp-step-title { font-size: 15px; font-weight: 600; color: #d0d4e0; margin-bottom: 4px; }
        .lp-step-desc { font-size: 13px; color: #5a6070; line-height: 1.55; }

        /* ── Telegram CTA ── */
        .lp-tg-section {
          margin: 0 1.25rem;
          background: linear-gradient(135deg, #0f1e2e 0%, #0d1929 100%);
          border: 1px solid rgba(55,144,221,0.2);
          border-radius: 20px; padding: 2.5rem 1.5rem;
          text-align: center;
          position: relative; overflow: hidden;
        }
        .lp-tg-section::before {
          content: '';
          position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(55,144,221,0.12), transparent);
          pointer-events: none;
        }
        .lp-tg-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: rgba(55,144,221,0.15);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
          border: 1px solid rgba(55,144,221,0.25);
        }
        .lp-tg-title { font-size: 1.3rem; font-weight: 700; color: #e0e4f0; margin-bottom: 8px; letter-spacing: -0.02em; }
        .lp-tg-desc { font-size: 14px; color: #6070a0; margin-bottom: 1.5rem; line-height: 1.6; }
        .lp-tg-cmds {
          display: inline-flex; flex-direction: column; gap: 6px;
          text-align: left; margin-bottom: 1.5rem;
        }
        .lp-tg-cmd {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: #7080a0;
        }
        .lp-tg-cmd code {
          font-family: 'DM Mono', monospace; font-size: 12px;
          color: #5ba3e8; background: rgba(55,144,221,0.1);
          padding: 2px 8px; border-radius: 5px;
          min-width: 90px; display: inline-block;
        }
        .lp-btn-tg {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600;
          background: rgba(55,144,221,0.15);
          border: 1px solid rgba(55,144,221,0.3);
          color: #5ba3e8;
          padding: 12px 24px; border-radius: 10px;
          text-decoration: none;
          transition: background 0.2s, border-color 0.2s;
        }
        .lp-btn-tg:hover { background: rgba(55,144,221,0.22); border-color: rgba(55,144,221,0.45); }

        /* ── Final CTA ── */
        .lp-cta-section {
          padding: 4rem 1.25rem;
          text-align: center;
        }
        .lp-cta-box {
          max-width: 500px; margin: 0 auto;
        }
        .lp-cta-h {
          font-size: clamp(1.6rem, 5vw, 2.4rem);
          font-weight: 700; letter-spacing: -0.03em;
          color: #f0f2f8; margin-bottom: 0.75rem; line-height: 1.15;
        }
        .lp-cta-sub {
          font-size: 15px; color: #5a6070; margin-bottom: 2rem; line-height: 1.6;
        }
        .lp-cta-btns {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        @media (min-width: 400px) {
          .lp-cta-btns { flex-direction: row; justify-content: center; }
        }
        .lp-checklist {
          display: flex; flex-direction: column; gap: 8px;
          margin-top: 2rem; text-align: left; max-width: 280px; margin-left: auto; margin-right: auto;
        }
        .lp-check-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #5a6070;
        }
        .lp-check-item svg { color: #4caf82; flex-shrink: 0; }

        /* ── Footer ── */
        .lp-footer {
          padding: 1.5rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          text-align: center;
        }
        @media (min-width: 640px) {
          .lp-footer { flex-direction: row; justify-content: space-between; }
        }
        .lp-footer-logo {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: #4a5060;
          text-decoration: none;
        }
        .lp-footer-links {
          display: flex; gap: 1.5rem; list-style: none;
        }
        .lp-footer-links a { font-size: 13px; color: #3a4050; text-decoration: none; }
        .lp-footer-links a:hover { color: #6a7080; }
        .lp-copy { font-size: 12px; color: #2a3040; }

        /* ── Divider ── */
        .lp-divider {
          height: 1px; background: rgba(255,255,255,0.05);
          margin: 0 1.25rem;
        }

        /* ── Animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-hero > * {
          animation: fadeUp 0.6s ease both;
        }
        .lp-hero > *:nth-child(1) { animation-delay: 0.05s; }
        .lp-hero > *:nth-child(2) { animation-delay: 0.15s; }
        .lp-hero > *:nth-child(3) { animation-delay: 0.25s; }
        .lp-hero > *:nth-child(4) { animation-delay: 0.35s; }
        .lp-hero > *:nth-child(5) { animation-delay: 0.45s; }
        .lp-mockup-wrap {
          animation: fadeUp 0.8s 0.5s ease both;
        }
      `}</style>

      <div className="lp-root">

        {/* ── Nav ── */}
        <nav className="lp-nav">
          <a href="/" className="lp-logo">
            <div className="lp-logo-dot">
              <TrendingUp size={14} color="#080e1a" strokeWidth={2.5} />
            </div>
            Tez Invest AI
          </a>
          <ul className="lp-nav-links">
            <li><a href="#features">Возможности</a></li>
            <li><a href="#how">Как работает</a></li>
            <li><a href="#telegram">Telegram</a></li>
          </ul>
          <div className="lp-nav-cta">
            <Link href="/auth/login" className="lp-btn-ghost">Войти</Link>
            <Link href="/auth/sign-up" className="lp-btn-gold">
              Начать <ChevronRight size={14} />
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-glow-1" />
          <div className="lp-glow-2" />

          <div className="lp-badge">
            <Zap size={11} />
            ИИ-помощник для частного инвестора
          </div>

          <h1 className="lp-h1">
            Портфель под контролем.<br />
            <span className="gold">Выплаты не пропустите.</span>
          </h1>

          <p className="lp-subtitle">
            Загрузите выписку из Т-Банка или БКС — через минуту
            получите дашборд с реальными котировками MOEX, расписанием купонов
            и ИИ-аналитикой по каждому инструменту.
          </p>

          <div className="lp-hero-btns">
            <Link href="/auth/sign-up" className="lp-btn-primary">
              <FileUp size={16} />
              Загрузить портфель бесплатно
            </Link>
            <Link href="/auth/login" className="lp-btn-secondary">
              Уже есть аккаунт <ArrowRight size={14} />
            </Link>
          </div>

          <p className="lp-hero-note">
            <CheckCircle size={12} color="#4caf82" />
            Бесплатно · Без брокерских токенов · Данные только у вас
          </p>
        </section>

        {/* ── Mockup ── */}
        <div className="lp-mockup-wrap">
          <div className="lp-mockup">
            <div className="lp-mockup-bar">
              <div className="lp-dot" style={{ background: '#ff5f57' }} />
              <div className="lp-dot" style={{ background: '#ffbd2e' }} />
              <div className="lp-dot" style={{ background: '#28c840' }} />
              <span style={{ marginLeft: 8, fontSize: 11, color: '#3a4050', fontFamily: 'monospace' }}>
                tez-invest-ai.vercel.app/dashboard
              </span>
            </div>
            <div className="lp-mockup-body">
              <div className="lp-mock-row">
                <div className="lp-mock-card">
                  <div className="lp-mock-label">Стоимость портфеля</div>
                  <div className="lp-mock-val white">₽ 1 240 350</div>
                </div>
                <div className="lp-mock-card">
                  <div className="lp-mock-label">Доходность</div>
                  <div className="lp-mock-val green">+14.2%</div>
                </div>
                <div className="lp-mock-card">
                  <div className="lp-mock-label">Доход за год</div>
                  <div className="lp-mock-val gold">₽ 87 400</div>
                </div>
                <div className="lp-mock-card">
                  <div className="lp-mock-label">Ближайшая выплата</div>
                  <div className="lp-mock-val white" style={{ fontSize: 13 }}>SBER · 3 дн.</div>
                </div>
              </div>
              <div className="lp-mock-bars">
                {[22, 45, 30, 60, 38, 72, 55, 80, 48, 65, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className={`lp-mock-bar ${i === 10 ? 'active' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="lp-stats" style={{ marginTop: '3rem' }}>
          <div className="lp-stat">
            <div className="lp-stat-num"><Counter to={21} />+</div>
            <div className="lp-stat-label">инструментов<br />в одном месте</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num"><Counter to={30} />с</div>
            <div className="lp-stat-label">время<br />импорта</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num"><Counter to={100} />%</div>
            <div className="lp-stat-label">данные MOEX<br />в реальном времени</div>
          </div>
        </div>

        {/* ── Features ── */}
        <section className="lp-section lp-section-center" id="features">
          <div className="lp-tag">Возможности</div>
          <h2 className="lp-h2">Всё что нужно инвестору</h2>
          <p className="lp-section-desc">
            Без брокерских приложений и сложных таблиц.
          </p>
          <div className="lp-features-grid">
            <FeatureCard
              icon={FileUp} color="ic-gold"
              title="Умный импорт"
              desc="Т-Инвестиции, БКС и универсальный CSV/XLSX. Формат брокера определяется автоматически."
            />
            <FeatureCard
              icon={BarChart2} color="ic-green"
              title="Данные MOEX"
              desc="Актуальные котировки, история цен, расписание купонов и дивидендов."
            />
            <FeatureCard
              icon={Bot} color="ic-purple"
              title="ИИ-аналитика"
              desc="Claude (Anthropic) генерирует нейтральный комментарий по каждому инструменту."
            />
            <FeatureCard
              icon={CalendarDays} color="ic-blue"
              title="Календарь выплат"
              desc="Сетка по месяцам: когда и сколько придёт купонов и дивидендов."
            />
            <FeatureCard
              icon={Coins} color="ic-teal"
              title="Прогноз дохода"
              desc="График пассивного дохода на 12 месяцев вперёд — купоны и дивиденды."
            />
            <FeatureCard
              icon={Briefcase} color="ic-orange"
              title="Несколько портфелей"
              desc="ИИС, брокерский, пенсионный — каждый со своим дашбордом."
            />
          </div>
        </section>

        <div className="lp-divider" />

        {/* ── How it works ── */}
        <section className="lp-section lp-section-center" id="how">
          <div className="lp-tag">Как работает</div>
          <h2 className="lp-h2">Три шага до дашборда</h2>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">1</div>
              <div>
                <div className="lp-step-title">Зарегистрируйтесь</div>
                <div className="lp-step-desc">
                  Email и пароль. Без привязки карты — бесплатно и навсегда.
                </div>
              </div>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">2</div>
              <div>
                <div className="lp-step-title">Загрузите выписку брокера</div>
                <div className="lp-step-desc">
                  CSV или XLSX из Т-Инвестиций, БКС или любого другого брокера в универсальном формате.
                  Парсер определит брокера сам.
                </div>
              </div>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">3</div>
              <div>
                <div className="lp-step-title">Получите полную картину</div>
                <div className="lp-step-desc">
                  Дашборд с котировками, P&L, календарём выплат и ИИ-анализом
                  каждого инструмента.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="lp-divider" />

        {/* ── Telegram ── */}
        <section className="lp-section" id="telegram" style={{ paddingBottom: 0 }}>
          <div className="lp-tg-section">
            <div className="lp-tg-icon">
              <Bell size={24} color="#5ba3e8" />
            </div>
            <h2 className="lp-tg-title">Telegram-бот с алертами</h2>
            <p className="lp-tg-desc">
              Подключите бота — и данные о портфеле будут прямо в мессенджере.
              Алерты о выплатах и изменениях цены.
            </p>
            <div className="lp-tg-cmds">
              {[
                ['/payments', 'ближайшие выплаты'],
                ['/forecast', 'прогноз на 12 мес.'],
                ['/portfolio', 'состав и P&L'],
                ['/alerts', 'настройки уведомлений'],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="lp-tg-cmd">
                  <code>{cmd}</code>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/sign-up" className="lp-btn-tg">
              <Bell size={15} />
              Подключить бота
            </Link>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="lp-cta-section">
          <div className="lp-cta-box">
            <h2 className="lp-cta-h">
              Начните прямо сейчас
            </h2>
            <p className="lp-cta-sub">
              Загрузите выписку брокера — и через 30 секунд
              у вас полный дашборд с аналитикой.
            </p>
            <div className="lp-cta-btns">
              <Link href="/auth/sign-up" className="lp-btn-primary">
                <FileUp size={16} />
                Создать аккаунт бесплатно
              </Link>
            </div>
            <div className="lp-checklist">
              {[
                'Бесплатно, без карты',
                'Без доступа к брокерскому счёту',
                'Данные только у вас — Supabase RLS',
                'Работает с Т-Банком, БКС и другими',
              ].map(item => (
                <div key={item} className="lp-check-item">
                  <CheckCircle size={14} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="lp-footer">
          <a href="/" className="lp-footer-logo">
            <div className="lp-logo-dot" style={{ width: 22, height: 22, borderRadius: 6 }}>
              <TrendingUp size={11} color="#080e1a" strokeWidth={2.5} />
            </div>
            Tez Invest AI
          </a>
          <ul className="lp-footer-links">
            <li><Link href="/auth/sign-up">Регистрация</Link></li>
            <li><Link href="/auth/login">Вход</Link></li>
          </ul>
          <p className="lp-copy">© 2026 Tez Invest AI</p>
        </footer>

      </div>
    </>
  )
}
