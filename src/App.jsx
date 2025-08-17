import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Copy, Send, MessageCircle, Moon, Sun, Percent } from 'lucide-react'

const fmtRUB = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    isFinite(n) ? Math.round(n) : 0
  )
const fmtCNY = (n) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(
    isFinite(n) ? n : 0
  )
const clamp = (n, min = 0, max = 1_000_000_000) => (isFinite(n) ? Math.min(Math.max(n, min), max) : 0)

const STORAGE_KEYS = {
  rate: 'sneakerCalc.rate',
  commission: 'sneakerCalc.commission',
  markupRub: 'sneakerCalc.markupRub',
  theme: 'sneakerCalc.theme',
  accent: 'sneakerCalc.accent',
}

export default function App() {
  const [dark, setDark] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.theme) === 'dark' : true))
  const [accent, setAccent] = useState(() => (typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEYS.accent) || 'green') : 'green'))

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.theme, dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.accent, accent) }, [accent])

  const accentHex = accent === 'green' ? '#00ff88' : '#ff4444'

  // Inputs
  const [baseCny, setBaseCny] = useState(400)
  const [rate, setRate] = useState(() => {
    const v = typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEYS.rate)) : 0
    return v || 13.2
  })
  const [logistics, setLogistics] = useState(1000)
  const [commissionPct, setCommissionPct] = useState(() => {
    const v = typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEYS.commission)) : 0
    return v || 10
  })

  // Markup in RUB input (with fallback from old percent if someone used v1)
  const [markupRub, setMarkupRub] = useState(() => {
    const stored = typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEYS.markupRub)) : 0
    return Number.isFinite(stored) && stored > 0 ? stored : 0
  })

  useEffect(() => localStorage.setItem(STORAGE_KEYS.rate, String(rate)), [rate])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.commission, String(commissionPct)), [commissionPct])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.markupRub, String(markupRub)), [markupRub])

  // Calculation
  const calc = useMemo(() => {
    const baseRub = clamp(baseCny) * clamp(rate)
    const commissionRub = (baseRub * clamp(commissionPct)) / 100
    const cost = baseRub + clamp(logistics) + commissionRub // себестоимость
    const markup = clamp(markupRub, 0, 1_000_000_000)      // наценка в рублях
    const finalPrice = cost + markup
    const markupPctDerived = cost > 0 ? (markup / cost) * 100 : 0
    const profit = finalPrice - cost // по сути равно markup
    return { baseRub, commissionRub, cost, finalPrice, markup, markupPctDerived, profit }
  }, [baseCny, rate, logistics, commissionPct, markupRub])

  // Animated final price
  const finalMotion = useMotionValue(calc.finalPrice)
  const finalDisplay = useTransform(finalMotion, (v) => fmtRUB(v))
  useEffect(() => {
    const controls = animate(finalMotion, calc.finalPrice, { duration: 0.35, ease: 'easeOut' })
    return () => controls.stop()
  }, [calc.finalPrice])

  const buildSummaryText = () => {
    const lines = [
      '📦 Расчёт стоимости кроссовок из Китая',
      `• База: ${fmtCNY(baseCny)} × курс ${rate}`,
      `• Перевод в ₽: ${fmtRUB(calc.baseRub)}`,
      `• Логистика: ${fmtRUB(logistics)}`,
      `• Комиссия (${commissionPct}%): ${fmtRUB(calc.commissionRub)}`,
      `• Себестоимость: ${fmtRUB(calc.cost)}`,
      `• Наценка: ${fmtRUB(calc.markup)} (${calc.markupPctDerived.toFixed(1)}%)`,
      `• Прибыль: ${fmtRUB(calc.profit)}`,
      '—',
      `💰 Финальная цена: ${fmtRUB(calc.finalPrice)}`,
    ]
    return lines.join('\n')
  }

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText())
      setToast({ type: 'ok', msg: 'Расчёт скопирован' })
    } catch (e) {
      setToast({ type: 'err', msg: 'Не удалось скопировать' })
    }
  }

  const shareTo = (service) => {
    const text = encodeURIComponent(buildSummaryText())
    const url = service === 'tg' ? `https://t.me/share/url?url=&text=${text}` : `https://wa.me/?text=${text}`
    window.open(url, '_blank')
  }

  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className={dark ? 'dark' : ''} style={{ '--accent': accentHex }}>
      <div className="min-h-screen bg-white text-neutral-900 transition-colors duration-300 dark:bg-neutral-950 dark:text-neutral-100">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-neutral-950/40">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: accentHex }} />
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Sneaker Price Calculator</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Accent toggle */}
              <div className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs opacity-90">
                <button
                  className={`rounded-full px-2 py-1 ${accent === 'green' ? 'font-semibold' : 'opacity-60'}`}
                  onClick={() => setAccent('green')}
                  aria-label="Accent green"
                >
                  #00ff88
                </button>
                <span className="opacity-40">/</span>
                <button
                  className={`rounded-full px-2 py-1 ${accent === 'red' ? 'font-semibold' : 'opacity-60'}`}
                  onClick={() => setAccent('red')}
                  aria-label="Accent red"
                >
                  #ff4444
                </button>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setDark((v) => !v)}
                className="group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-sm transition hover:shadow md:text-base"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
                {dark ? 'Светлая' : 'Тёмная'}
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
          <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2" transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
            {/* INPUTS */}
            <motion.section layout className="rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-4 text-lg font-semibold">Ввод данных</h2>
              <div className="grid grid-cols-1 gap-3">
                <LabeledInput label="Базовая стоимость (¥)" value={baseCny} min={0} step={0.01} onChange={(v) => setBaseCny(clamp(v, 0, 10_000_000))} />
                <LabeledInput label="Курс юаня к рублю (₽)" value={rate} min={0} step={0.01} onChange={(v) => setRate(clamp(v, 0, 10_000))} />
                <LabeledInput label="Логистика (₽)" value={logistics} min={0} step={1} onChange={(v) => setLogistics(clamp(v, 0, 10_000_000))} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                  <LabeledInput label="Комиссия посредника (%)" value={commissionPct} min={0} step={0.1} onChange={(v) => setCommissionPct(clamp(v, 0, 100))} />
                  <LabeledInput
                    label="Наша наценка (₽)"
                    value={markupRub}
                    min={0}
                    step={1}
                    onChange={(v) => setMarkupRub(clamp(v, 0, 10_000_000))}
                    addon={<Badge text={`${calc.markupPctDerived.toFixed(1)}%`} />}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={copySummary} className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm shadow-sm transition hover:shadow">
                  <Copy size={18} /> Скопировать расчёт
                </button>
                <button onClick={() => shareTo('tg')} className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm shadow-sm transition hover:shadow">
                  <Send size={18} /> Поделиться в Telegram
                </button>
                <button onClick={() => shareTo('wa')} className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm shadow-sm transition hover:shadow">
                  <MessageCircle size={18} /> Поделиться в WhatsApp
                </button>
              </div>
            </motion.section>

            {/* OUTPUTS */}
            <motion.section layout className="rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-4 text-lg font-semibold">Результаты</h2>

              <div className="grid grid-cols-1 gap-3">
                <InfoRow label="Стоимость в юанях" value={fmtCNY(baseCny)} />
                <InfoRow label="Перевод в рубли" value={fmtRUB(calc.baseRub)} />
                <InfoRow label="Логистика" value={fmtRUB(logistics)} />
                <InfoRow label={`Комиссия (${commissionPct}%)`} value={fmtRUB(calc.commissionRub)} />
                <InfoRow label="Себестоимость" value={fmtRUB(calc.cost)} subtle={false} />
                <InfoRow label="Прибыль" value={`${fmtRUB(calc.profit)} (${calc.markupPctDerived.toFixed(1)}%)`} />
              </div>

              {/* Final Price Card */}
              <motion.div
                layout
                className="mt-5 rounded-2xl p-4 shadow-md"
                style={{
                  background: dark ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' : 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.01))',
                  border: `1px solid ${accentHex}33`,
                  boxShadow: `0 8px 28px -8px ${accentHex}55, inset 0 0 0 1px ${accentHex}1a`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm opacity-70">Финальная цена</div>
                    <motion.div
                      key={Math.round(calc.finalPrice)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="mt-1 font-extrabold tracking-tight"
                      style={{ fontSize: 'clamp(28px, 7vw, 48px)', color: accentHex, textShadow: `0 0 16px ${accentHex}55` }}
                    >
                      {finalDisplay}
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                    className="rounded-2xl px-3 py-2 text-right text-xs"
                    style={{ border: `1px dashed ${accentHex}55` }}
                  >
                    <div className="opacity-70">Наценка</div>
                    <div className="font-semibold">{fmtRUB(calc.markup)} · {calc.markupPctDerived.toFixed(1)}%</div>
                  </motion.div>
                </div>
              </motion.div>

              <p className="mt-4 text-xs leading-relaxed opacity-70">
                Формула: (База ¥ × курс ₽ + логистика + комиссия) + наценка (₽). Пересчёт происходит мгновенно при изменении любого параметра.
                Данные курса, комиссии и наценки сохраняются в LocalStorage.
              </p>
            </motion.section>
          </motion.div>
        </main>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.25 }} className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
              <div className="rounded-full px-4 py-2 text-sm shadow-lg" style={{ background: toast.type === 'ok' ? '#202e1e' : '#3a1d1d', color: '#fff' }}>
                {toast.msg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-xs opacity-70">
          Сделано на React + TailwindCSS + Framer Motion. Готово к деплою на Vercel / Netlify.
        </footer>
      </div>
    </div>
  )
}

function Badge({ text }) {
  return (
    <span className="shrink-0 rounded-full border px-2 py-1 text-xs opacity-80" title="Эквивалент наценки в процентах">
      {text}
    </span>
  )
}

function LabeledInput({ label, value, onChange, min = 0, step = 1, addon = null }) {
  const [focused, setFocused] = useState(false)
  return (
    <label className="group block">
      <div className="mb-1 flex items-center justify-between text-sm opacity-70">
        <span>{label}</span>
        {addon}
      </div>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-2xl border border-neutral-200/70 bg-transparent px-4 py-3 text-base outline-none transition placeholder:opacity-40 focus:border-transparent dark:border-neutral-800"
        style={{ boxShadow: focused ? `0 0 0 2px var(--accent)` : undefined }}
        placeholder="0"
      />
    </label>
  )
}

function InfoRow({ label, value, subtle = true }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-neutral-200/60 bg-neutral-50/60 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-800/40">
      <span className={`${subtle ? '' : 'font-medium opacity-90'} opacity-70`}>{label}</span>
      <span className="font-semibold tracking-tight">{value}</span>
    </div>
  )
}