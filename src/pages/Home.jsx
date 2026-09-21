import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/Home.scss'

/* Ce aduce pagina asta (și ce NU):
   - Rezervările doar pentru săptămâna zilei alese (nu tot tabelul, asta e
     treaba paginii Reservations) și doar coloanele de care avem nevoie.
     Nu aducem emailul clienților.
   - Programul, zilele închise și capacitatea, ca să calculăm ocuparea.
   - Ultimele rezervări făcute (ca să vezi ce a intrat nou, fără pas de confirmare).
   - Ultimele solicitări din contacturi_norvex. */

const COLOANE_REZERVARI =
  'id, created_at, nume, prenume, telefon, tip_masina, numar_masina, categorie_serviciu, pachet_selectat, data_programare, ora_programare'

const REFRESH_MS = 60000

const LUNI = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
]
const LUNI_SCURT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
const ZILE_LUNGI = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']
const ZILE_SCURT = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']

/* ---------- Helpers de dată/oră (ora locală, fără toISOString) ---------- */
const pad = (n) => String(n).padStart(2, '0')
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (iso, n) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
// 1 = luni ... 7 = duminică (la fel ca în program_norvex)
const isoDow = (d) => (d.getDay() === 0 ? 7 : d.getDay())
const startOfWeek = (iso) => addDays(iso, 1 - isoDow(fromISO(iso)))
const diffZile = (iso, ref) => Math.round((fromISO(iso) - fromISO(ref)) / 86400000)
const minute = (t) => {
  const [h, m] = t.split(':')
  return Number(h) * 60 + Number(m)
}
const fmtOra = (t) => (t ? t.slice(0, 5) : '')

const formatZiLunga = (iso) => {
  const d = fromISO(iso)
  return `${ZILE_LUNGI[isoDow(d) - 1]}, ${d.getDate()} ${LUNI[d.getMonth()]}`
}

const etichetaRelativa = (iso, azi) => {
  const n = diffZile(iso, azi)
  if (n === 0) return 'Astăzi'
  if (n === 1) return 'Mâine'
  if (n === -1) return 'Ieri'
  return n > 0 ? `Peste ${n} zile` : `Acum ${-n} zile`
}

const etichetaZiScurta = (iso, azi) => {
  const n = diffZile(iso, azi)
  if (n === 0) return 'Astăzi'
  if (n === 1) return 'Mâine'
  const d = fromISO(iso)
  return `${d.getDate()} ${LUNI_SCURT[d.getMonth()]}`
}

const formatDate = (isoString) => {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const acumUnTimp = (isoString, ref) => {
  const min = Math.max(Math.round((ref - new Date(isoString)) / 60000), 0)
  if (min < 1) return 'chiar acum'
  if (min < 60) return `acum ${min} min`
  const ore = Math.floor(min / 60)
  if (ore < 24) return `acum ${ore} ${ore === 1 ? 'oră' : 'ore'}`
  const zile = Math.floor(ore / 24)
  return `acum ${zile} ${zile === 1 ? 'zi' : 'zile'}`
}

// Câte locuri are o categorie într-o zi (sloturi × locuri per slot)
const locuriTotale = (prog, cfg) => {
  if (!prog?.deschis || !cfg) return 0
  const sloturi = Math.floor((minute(prog.ora_end) - minute(prog.ora_start)) / cfg.durata_minute)
  return Math.max(sloturi, 0) * cfg.locuri
}

/* ---------- Iconițe ---------- */
const ChevronIcon = ({ direction }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    style={{ transform: direction === 'left' ? 'rotate(180deg)' : 'none' }}
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
)

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </svg>
)

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
)

const Home = () => {
  const [now, setNow] = useState(() => new Date())
  const [tick, setTick] = useState(0)
  const [ziISO, setZiISO] = useState(() => toISO(new Date()))
  const [actualizat, setActualizat] = useState(null)

  const [config, setConfig] = useState({
    loaded: false,
    error: '',
    program: {},
    zileInchise: new Map(),
    capacitate: {},
  })
  const [week, setWeek] = useState({ key: '', rows: [], error: '' })
  const [noi, setNoi] = useState({ loaded: false, rows: [], error: '' })
  const [contacte, setContacte] = useState({ loaded: false, rows: [], error: '' })

  const todayISO = toISO(now)
  const weekStart = startOfWeek(ziISO)

  // Reîmprospătare automată la fiecare minut (date noi + ora curentă)
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
      setTick((t) => t + 1)
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  // Configurare (o singură dată)
  useEffect(() => {
    const loadConfig = async () => {
      const [programRes, inchiseRes, capRes] = await Promise.all([
        supabase.from('program_norvex').select('*'),
        supabase.from('zile_inchise_norvex').select('data, motiv'),
        supabase.from('capacitate_norvex').select('*'),
      ])

      const err = programRes.error || inchiseRes.error || capRes.error
      if (err) {
        setConfig((c) => ({ ...c, loaded: true, error: err.message }))
        return
      }

      setConfig({
        loaded: true,
        error: '',
        program: Object.fromEntries(programRes.data.map((p) => [p.zi_saptamana, p])),
        zileInchise: new Map(inchiseRes.data.map((z) => [z.data, z.motiv])),
        capacitate: Object.fromEntries(capRes.data.map((c) => [c.categorie, c])),
      })
    }

    loadConfig()
  }, [])

  // Rezervările săptămânii zilei alese. Navigarea între zilele aceleiași
  // săptămâni nu mai face request, doar reîmprospătarea din minut în minut.
  useEffect(() => {
    let cancelled = false

    const loadWeek = async () => {
      const { data, error } = await supabase
        .from('rezervari_norvex')
        .select(COLOANE_REZERVARI)
        .gte('data_programare', weekStart)
        .lte('data_programare', addDays(weekStart, 6))
        .order('data_programare', { ascending: true })
        .order('ora_programare', { ascending: true })
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (error) {
        setWeek({ key: weekStart, rows: [], error: error.message })
        return
      }
      setWeek({ key: weekStart, rows: data, error: '' })
      setActualizat(new Date())
    }

    loadWeek()
    return () => {
      cancelled = true
    }
  }, [weekStart, tick])

  // Rezervările noi: ultimele făcute, pentru zile de azi încolo
  useEffect(() => {
    let cancelled = false

    const loadNoi = async () => {
      const { data, error } = await supabase
        .from('rezervari_norvex')
        .select('id, nume, prenume, categorie_serviciu, data_programare, ora_programare, created_at')
        .gte('data_programare', todayISO)
        .order('created_at', { ascending: false })
        .limit(6)

      if (cancelled) return
      if (error) {
        setNoi({ loaded: true, rows: [], error: error.message })
        return
      }
      setNoi({ loaded: true, rows: data, error: '' })
    }

    loadNoi()
    return () => {
      cancelled = true
    }
  }, [todayISO, tick])

  // Ultimele solicitări de contact
  useEffect(() => {
    let cancelled = false

    const loadContacte = async () => {
      const { data, error } = await supabase
        .from('contacturi_norvex')
        .select('id, nume, prenume, este_firma, motiv, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (cancelled) return
      if (error) {
        setContacte({ loaded: true, rows: [], error: error.message })
        return
      }
      setContacte({ loaded: true, rows: data, error: '' })
    }

    loadContacte()
    return () => {
      cancelled = true
    }
  }, [tick])

  /* ---------- Date derivate ---------- */
  const loadingWeek = week.key !== weekStart
  const prog = config.program[isoDow(fromISO(ziISO))]
  const motivInchis = config.zileInchise.get(ziISO)
  const inchis = config.loaded && !config.error && (!prog?.deschis || config.zileInchise.has(ziISO))

  const ziRows = useMemo(
    () => (loadingWeek ? [] : week.rows.filter((r) => r.data_programare === ziISO)),
    [week, ziISO, loadingWeek]
  )

  // Numărul de programări active pe fiecare zi a săptămânii (banda de sus)
  const numarPeZi = useMemo(() => {
    const map = {}
    if (loadingWeek) return map
    week.rows.forEach((r) => {
      map[r.data_programare] = (map[r.data_programare] || 0) + 1
    })
    return map
  }, [week, loadingWeek])

  const zileSaptamana = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Ocuparea zilei, pe categorii
  const ocupare = useMemo(() => {
    return Object.values(config.capacitate).map((cfg) => {
      const total = inchis ? 0 : locuriTotale(prog, cfg)
      const ocupate = ziRows.filter((r) => r.categorie_serviciu === cfg.categorie).length
      return { categorie: cfg.categorie, total, ocupate }
    })
  }, [config.capacitate, prog, inchis, ziRows])

  // Pe ziua de azi: ce e trecut, ce e în lucru și ce urmează
  const stari = useMemo(() => {
    const map = {}
    if (ziISO !== todayISO) return map
    const nowMin = now.getHours() * 60 + now.getMinutes()
    let startUrmator = null

    ziRows.forEach((r) => {
      const start = minute(r.ora_programare)
      const durata = config.capacitate[r.categorie_serviciu]?.durata_minute ?? 60
      if (start + durata <= nowMin) {
        map[r.id] = 'trecut'
      } else if (start <= nowMin) {
        map[r.id] = 'acum'
      } else {
        if (startUrmator === null) startUrmator = start
        if (start === startUrmator) map[r.id] = 'urmeaza'
      }
    })
    return map
  }, [ziRows, config.capacitate, now, ziISO, todayISO])

  const locuriLibere = inchis
    ? 0
    : ocupare.reduce((sum, o) => sum + Math.max(o.total - o.ocupate, 0), 0)
  const urmatoarea =
    ziISO === todayISO ? ziRows.find((r) => stari[r.id] === 'urmeaza') : ziRows[0]
  const etichetaOra = ziISO === todayISO ? 'următoarea programare' : 'prima programare'

  const orar = !config.loaded || config.error
    ? ''
    : inchis
      ? `Închis${motivInchis ? `: ${motivInchis}` : ''}`
      : `Deschis ${fmtOra(prog.ora_start)}–${fmtOra(prog.ora_end)}`

  const reincarca = () => {
    setNow(new Date())
    setTick((t) => t + 1)
  }

  return (
    <div className="home-page">
      <div className="hm-shell">
        <header className="hm-day">
          <div className="hm-day-top">
            <div className="hm-day-title">
              <div className="hm-eyebrow">Panou zilnic</div>
              <h1>{formatZiLunga(ziISO)}</h1>
              <div className="hm-day-meta">
                <span className="hm-pill">{etichetaRelativa(ziISO, todayISO)}</span>
                {orar && <span className={inchis ? 'hm-closed' : ''}>{orar}</span>}
              </div>
            </div>

            <div className="hm-controls">
              <button
                type="button"
                className="hm-icon-btn"
                onClick={() => setZiISO(addDays(ziISO, -1))}
                aria-label="Ziua precedentă"
              >
                <ChevronIcon direction="left" />
              </button>
              <input
                type="date"
                className="hm-date-input"
                value={ziISO}
                onChange={(e) => e.target.value && setZiISO(e.target.value)}
                aria-label="Alege o zi"
              />
              <button
                type="button"
                className="hm-icon-btn"
                onClick={() => setZiISO(addDays(ziISO, 1))}
                aria-label="Ziua următoare"
              >
                <ChevronIcon direction="right" />
              </button>
              <button
                type="button"
                className="hm-text-btn"
                onClick={() => setZiISO(todayISO)}
                disabled={ziISO === todayISO}
              >
                Astăzi
              </button>
              <button
                type="button"
                className="hm-icon-btn"
                onClick={reincarca}
                aria-label="Actualizează datele"
                title={actualizat ? `Actualizat la ${pad(actualizat.getHours())}:${pad(actualizat.getMinutes())}` : 'Actualizează'}
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          <div className="hm-stats">
            <div className="hm-stat">
              <b>{ziRows.length}</b>
              <span>{ziRows.length === 1 ? 'programare' : 'programări'}</span>
            </div>
            <div className="hm-stat">
              <b>{config.loaded && !config.error ? locuriLibere : '—'}</b>
              <span>locuri libere</span>
            </div>
            <div className="hm-stat">
              <b>{urmatoarea ? fmtOra(urmatoarea.ora_programare) : '—'}</b>
              <span>{etichetaOra}</span>
            </div>
          </div>
        </header>

        <nav className="hm-week" aria-label="Săptămâna">
          {zileSaptamana.map((iso, i) => {
            const d = fromISO(iso)
            const inchisa =
              config.loaded && !config.error && (!config.program[i + 1]?.deschis || config.zileInchise.has(iso))
            const nr = numarPeZi[iso] || 0
            return (
              <button
                key={iso}
                type="button"
                className={`hm-weekday${iso === ziISO ? ' selected' : ''}${iso === todayISO ? ' today' : ''}${inchisa ? ' closed' : ''}`}
                onClick={() => setZiISO(iso)}
                aria-pressed={iso === ziISO}
                aria-label={formatZiLunga(iso)}
              >
                <span className="hm-weekday-name">{ZILE_SCURT[i]}</span>
                <span className="hm-weekday-num">{d.getDate()}</span>
                <span className="hm-weekday-count">
                  {inchisa ? 'închis' : loadingWeek ? '…' : nr > 0 ? `${nr} ${nr === 1 ? 'programare' : 'programări'}` : 'liber'}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="hm-grid">
          <section className="hm-panel hm-agenda">
            <div className="hm-panel-head">
              <h2>Programul zilei</h2>
            </div>

            {loadingWeek && !week.error && (
              <div className="hm-state">Se încarcă programul zilei...</div>
            )}

            {week.error && (
              <div className="hm-state error">A apărut o eroare: {week.error}</div>
            )}

            {!loadingWeek && !week.error && ziRows.length === 0 && (
              <div className="hm-state">
                {inchis
                  ? 'Service-ul este închis în această zi.'
                  : diffZile(ziISO, todayISO) < 0
                    ? 'Nu au fost programări în această zi.'
                    : 'Nicio programare în această zi încă.'}
              </div>
            )}

            {!loadingWeek && !week.error && ziRows.length > 0 && (
              <ol className="hm-list">
                {ziRows.map((r, idx) => {
                  const stare = stari[r.id]
                  const arataOra = idx === 0 || ziRows[idx - 1].ora_programare !== r.ora_programare
                  return (
                    <li key={r.id} className={`hm-row${stare ? ` ${stare}` : ''}`}>
                      <div className="hm-time">{arataOra ? fmtOra(r.ora_programare) : ''}</div>

                      <div className="hm-main">
                        <div className="hm-name">
                          {r.nume} {r.prenume}
                        </div>
                        <div className="hm-sub">
                          <span className="hm-plate">{r.numar_masina}</span>
                          <span>{r.tip_masina}</span>
                        </div>
                        <div className="hm-service">
                          <span className="hm-tag">{r.categorie_serviciu}</span>
                          <span>{r.pachet_selectat}</span>
                        </div>
                      </div>

                      <div className="hm-side">
                        {stare === 'acum' && <span className="hm-flag">În lucru</span>}
                        {stare === 'urmeaza' && <span className="hm-flag">Urmează</span>}
                        <a className="hm-call" href={`tel:${(r.telefon || '').replace(/\s+/g, '')}`}>
                          <PhoneIcon />
                          {r.telefon}
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <aside className="hm-aside">
            <section className="hm-panel">
              <div className="hm-panel-head">
                <h2>Ocupare</h2>
              </div>
              {config.error && <div className="hm-state error">Nu am putut încărca programul.</div>}
              {!config.error && ocupare.length === 0 && (
                <div className="hm-state">Nu e configurată nicio categorie.</div>
              )}
              {!config.error &&
                ocupare.map((o) => {
                  const procent = o.total > 0 ? Math.min((o.ocupate / o.total) * 100, 100) : 0
                  const plin = o.total > 0 && o.ocupate >= o.total
                  return (
                    <div key={o.categorie} className="hm-occ">
                      <div className="hm-occ-row">
                        <span>{o.categorie}</span>
                        <b>{o.total > 0 ? `${o.ocupate} din ${o.total} locuri` : 'Închis'}</b>
                      </div>
                      <div className="hm-bar" aria-hidden="true">
                        <span className={plin ? 'full' : ''} style={{ width: `${procent}%` }} />
                      </div>
                    </div>
                  )
                })}
            </section>

            <section className="hm-panel">
              <div className="hm-panel-head">
                <h2>Rezervări noi</h2>
              </div>
              {noi.error && <div className="hm-state error">Nu am putut încărca lista.</div>}
              {!noi.error && noi.loaded && noi.rows.length === 0 && (
                <div className="hm-state">Nicio rezervare viitoare încă.</div>
              )}
              {noi.rows.length > 0 && (
                <ul className="hm-mini">
                  {noi.rows.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setZiISO(r.data_programare)}>
                        <span className="hm-mini-when">
                          {etichetaZiScurta(r.data_programare, todayISO)}, {fmtOra(r.ora_programare)}
                        </span>
                        <span className="hm-mini-text">
                          <span className="hm-mini-name">
                            {r.nume} {r.prenume}
                          </span>
                          <span className="hm-mini-ago">{acumUnTimp(r.created_at, now)}</span>
                        </span>
                        <span className="hm-tag">{r.categorie_serviciu}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="hm-panel">
              <div className="hm-panel-head">
                <h2>Contact recent</h2>
              </div>
              {contacte.error && <div className="hm-state error">Nu am putut încărca solicitările.</div>}
              {!contacte.error && contacte.loaded && contacte.rows.length === 0 && (
                <div className="hm-state">Nu există solicitări de contact încă.</div>
              )}
              {contacte.rows.length > 0 && (
                <ul className="hm-contacts">
                  {contacte.rows.map((c) => (
                    <li key={c.id}>
                      <div className="hm-contact-top">
                        <span className="hm-mini-name">
                          {c.nume} {c.prenume}
                        </span>
                        {c.este_firma && <span className="hm-tag">Firmă</span>}
                        <span className="hm-contact-date">{formatDate(c.created_at)}</span>
                      </div>
                      <p>{c.motiv}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default Home