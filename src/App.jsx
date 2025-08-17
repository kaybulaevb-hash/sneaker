import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Copy, Send, MessageCircle, Moon, Sun } from 'lucide-react'

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

  // Inputs как строки
  const [baseCny, setBaseCny] = useState("400")
  const [rate, setRate] = useState(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.rate) : null
    return v || "13.2"
  })
  const [logistics, setLogistics] = useState("1000")
  const [commissionPct, setCommissionPct] = useState(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.commission) : null
    return v || "10"
  })
  const [markupRub, setMarkupRub] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.markupRub) : null
    return stored || "0"
  })

  useEffect(() => localStorage.setItem(STORAGE_KEYS.rate, rate), [rate])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.commission, commissionPct), [commissionPct])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.markupRub, markupRub), [markupRub])

  // Calculation
  const calc = useMemo(() => {
    const baseRub = clamp(Number(baseCny)) * clamp(Number(rate))
    const commissionRub = (baseRub * clamp(Number(commissionPct))) / 100
    const cost = baseRub + clamp(Number(logistics)) + commissionRub
    const markup = clamp(Number(markupRub))
    const finalPrice = cost + markup
    const markupPctDerived = cost > 0 ? (markup / cost) * 100 : 0
    const profit = finalPrice - cost
    return { baseRub, commissionRub, cost, finalPrice, markup, markupPctDerived, profit }
  }, [baseCny, rate, logistics, commissionPct, markupRub])

  const finalMotion = useMotionValue(calc.finalPrice)
  const finalDisplay = useTransform(finalMotion, (v) => fmtRUB(v))
  useEffect(() => {
    const controls = animate(finalMotion, calc.finalPrice, { duration: 0.35, ease: 'easeOut' })
    return () => controls.stop()
  }, [calc.finalPrice])

  const buildSummaryText = () => {
    const lines = [
      '📦 Расчёт стоимости кроссовок из Китая',
      `• База: ${fmtCNY(Number(baseCny))} × курс ${rate}`,
      `• Перевод в ₽: ${fmtRUB(calc.baseRub)}`,
      `• Логистика: ${fmtRUB(Number(logistics))}`,
      `• Комиссия (${commissionPct}%): ${fmtRUB(calc.commissionRub)}`,
      `• Себестоимость: ${fmtRUB(calc.cost)}`,
      `• Наценка: ${fmtRUB(calc.markup)} (${calc.markupPctDerived.toFixed(1)}%)`,
      `• Прибыль: ${fmtRUB(calc.profit)}`,
      '—',
      `💰 Финальная цена: ${fmtRUB(calc.finalPrice)}`,
    ]
    return lines.join('\\n')
  }

  const [toast, setToast] = useState(null)
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
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className={dark ? 'dark' : ''} style={{ '--accent': accentHex }}>
      <div className="min-h-screen bg-white text-neutral-900 transition-colors duration-300 dark:bg-neutral-950 dark:text-neutral-100">
        {/* ... header ... */}

        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
          <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Inputs */}
            <motion.section className="rounded-2xl border p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-4 text-lg font-semibold">Ввод данных</h2>
              <div className="grid grid-cols-1 gap-3">
                <LabeledInput label="Базовая стоимость (¥)" value={baseCny} onChange={setBaseCny}/>
                <LabeledInput label="Курс юаня к рублю (₽)" value={rate} onChange={setRate}/>
                <LabeledInput label="Логистика (₽)" value={logistics} onChange={setLogistics}/>
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Комиссия посредника (%)" value={commissionPct} onChange={setCommissionPct}/>
                  <LabeledInput label="Наша наценка (₽)" value={markupRub} onChange={setMarkupRub}
                    addon={<span className="text-xs opacity-70">{calc.markupPctDerived.toFixed(1)}%</span>}/>
                </div>
              </div>
            </motion.section>

            {/* Outputs */}
            <motion.section className="rounded-2xl border p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-4 text-lg font-semibold">Результаты</h2>
              <div className="grid gap-3">
                <InfoRow label="Стоимость в юанях" value={fmtCNY(Number(baseCny))}/>
                <InfoRow label="Перевод в рубли" value={fmtRUB(calc.baseRub)}/>
                <InfoRow label="Логистика" value={fmtRUB(Number(logistics))}/>
                <InfoRow label={`Комиссия (${commissionPct}%)`} value={fmtRUB(calc.commissionRub)}/>
                <InfoRow label="Себестоимость" value={fmtRUB(calc.cost)}/>
                <InfoRow label="Прибыль" value={`${fmtRUB(calc.profit)} (${calc.markupPctDerived.toFixed(1)}%)`}/>
              </div>
              <motion.div className="mt-5 rounded-2xl p-4 shadow-md"
                style={{border:`1px solid ${accentHex}55`,boxShadow:`0 8px 28px -8px ${accentHex}55`}}>
                <div className="text-sm opacity-70">Финальная цена</div>
                <motion.div style={{color:accentHex,fontSize:"clamp(28px,7vw,48px)"}}>
                  {finalDisplay}
                </motion.div>
              </motion.div>
            </motion.section>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

function LabeledInput({ label, value, onChange, addon=null }) {
  const [focused, setFocused] = useState(false)

  const handleChange = (e) => {
    let val = e.target.value
    // убрать ведущий 0
    if (val.length > 1 && val.startsWith("0")) {
      val = val.replace(/^0+/, "")
      if (val === "") val = "0"
    }
    onChange(val)
  }

  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-sm opacity-70">
        <span>{label}</span>
        {addon}
      </div>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        onFocus={() => {setFocused(true); if(value==="0") onChange("")}}
        onBlur={() => {setFocused(false); if(value==="") onChange("0")}}
        className="w-full rounded-2xl border px-4 py-3"
      />
    </label>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between rounded-2xl border px-4 py-3 text-sm">
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
