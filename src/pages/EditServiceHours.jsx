import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/EditServiceHours.scss'

const DAYS = [
  { value: 1, label: 'Luni', short: 'Lu' },
  { value: 2, label: 'Marți', short: 'Ma' },
  { value: 3, label: 'Miercuri', short: 'Mi' },
  { value: 4, label: 'Joi', short: 'Jo' },
  { value: 5, label: 'Vineri', short: 'Vi' },
  { value: 6, label: 'Sâmbătă', short: 'Sâ' },
  { value: 7, label: 'Duminică', short: 'Du' },
]

const emptyDay = (zi_saptamana) => ({
  zi_saptamana,
  deschis: false,
  ora_start: '09:00',
  ora_end: '18:00',
})

const CATEGORY_LABELS = {
  Vulcanizare: 'Vulcanizare',
  Detailing: 'Detailing',
}

const normalizeTime = (value) => (value ? value.slice(0, 5) : '')

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3.5 2" />
  </svg>
)

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M5 4h12l2 2v14H5z" />
    <path d="M8 4v5h8V4M8 20v-6h8v6" />
  </svg>
)

const EditServiceHours = () => {
  const [schedule, setSchedule] = useState([])
  const [capacity, setCapacity] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const fetchSchedule = async (clearFeedback = true) => {
    setLoading(true)
    setError('')
    if (clearFeedback) setFeedback('')

    const [scheduleResult, capacityResult] = await Promise.all([
      supabase
        .from('program_norvex')
        .select('zi_saptamana, deschis, ora_start, ora_end')
        .order('zi_saptamana', { ascending: true }),
      supabase
        .from('capacitate_norvex')
        .select('categorie, locuri, durata_minute, avans_minute, zile_maxim')
        .order('categorie', { ascending: true }),
    ])

    if (scheduleResult.error || capacityResult.error) {
      setError(scheduleResult.error?.message || capacityResult.error?.message)
      setLoading(false)
      return
    }

    const rowsByDay = new Map((scheduleResult.data || []).map((row) => [row.zi_saptamana, row]))
    setSchedule(
      DAYS.map((day) => {
        const row = rowsByDay.get(day.value)
        return row
          ? {
              ...row,
              ora_start: normalizeTime(row.ora_start),
              ora_end: normalizeTime(row.ora_end),
            }
          : emptyDay(day.value)
      }),
    )
    setCapacity(
      (capacityResult.data || []).map((row) => ({
        ...row,
        locuri: row.locuri ?? 1,
        durata_minute: row.durata_minute ?? 60,
        avans_minute: row.avans_minute ?? 0,
        zile_maxim: row.zile_maxim ?? 30,
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchSchedule()
  }, [])

  const openDays = useMemo(() => schedule.filter((day) => day.deschis).length, [schedule])

  const updateDay = (dayValue, field, value) => {
    setSchedule((currentSchedule) =>
      currentSchedule.map((day) =>
        day.zi_saptamana === dayValue ? { ...day, [field]: value } : day,
      ),
    )
    setFeedback('')
  }

  const updateCapacity = (category, field, value) => {
    setCapacity((currentCapacity) =>
      currentCapacity.map((row) =>
        row.categorie === category ? { ...row, [field]: value } : row,
      ),
    )
    setFeedback('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setFeedback('')

    const invalidDay = schedule.find(
      (day) => day.deschis && (!day.ora_start || !day.ora_end || day.ora_start >= day.ora_end),
    )

    if (invalidDay) {
      setError(`Verifică intervalul pentru ${DAYS.find((day) => day.value === invalidDay.zi_saptamana).label}.`)
      setSaving(false)
      return
    }

    const invalidCapacity = capacity.find(
      (row) =>
        Number(row.locuri) < 1 ||
        Number(row.durata_minute) < 1 ||
        Number(row.avans_minute) < 0 ||
        Number(row.zile_maxim) < 1,
    )

    if (invalidCapacity) {
      setError(`Verifică valorile pentru ${CATEGORY_LABELS[invalidCapacity.categorie] || invalidCapacity.categorie}.`)
      setSaving(false)
      return
    }

    const updates = schedule.map((day) => ({
      zi_saptamana: day.zi_saptamana,
      deschis: day.deschis,
      // Coloanele ora_start/ora_end sunt NOT NULL în Supabase.
      // Pentru zilele închise păstrăm un interval valid, iar `deschis`
      // controlează dacă intervalul poate fi folosit pentru rezervări.
      ora_start: day.ora_start || '09:00',
      ora_end: day.ora_end || '18:00',
    }))

    const scheduleResults = await Promise.all(
      updates.map((day) =>
        supabase
          .from('program_norvex')
          .upsert(day, { onConflict: 'zi_saptamana' })
          .select('zi_saptamana, deschis, ora_start, ora_end')
          .single(),
      ),
    )

    const capacityResults = await Promise.all(
      capacity.map((row) =>
        supabase
          .from('capacitate_norvex')
          .upsert(
            {
              categorie: row.categorie,
              locuri: Number(row.locuri),
              durata_minute: Number(row.durata_minute),
              avans_minute: Number(row.avans_minute),
              zile_maxim: Number(row.zile_maxim),
            },
            { onConflict: 'categorie' },
          )
          .select('categorie, locuri, durata_minute, avans_minute, zile_maxim')
          .single(),
      ),
    )

    const failedResult = [...scheduleResults, ...capacityResults].find((result) => result.error)
    setSaving(false)

    if (failedResult?.error) {
      setError(failedResult.error.message)
      return
    }

    setFeedback('Programul și setările de rezervare au fost salvate cu succes.')
    await fetchSchedule(false)
  }

  return (
    <main className="hours-page">
      <div className="hours-head">
        <div>
          <div className="hours-eyebrow">Configurare</div>
          <h1>Program de lucru</h1>
          <p>Setează zilele și intervalul în care clienții pot face rezervări.</p>
        </div>
        <div className="hours-summary">
          <span className="summary-dot" />
          <strong>{openDays}</strong> din 7 zile deschise
        </div>
      </div>

      <section className="hours-card">
        <div className="hours-card-head">
          <div>
            <h2>Program săptămânal</h2>
            <p>Modificările se aplică direct în baza de date.</p>
          </div>
          <button type="button" className="refresh-hours" onClick={fetchSchedule} disabled={loading || saving}>
            Reîncarcă
          </button>
        </div>

        {loading && <div className="hours-state">Se încarcă programul...</div>}
        {!loading && error && <div className="hours-state is-error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="hours-table-wrap">
              <table className="hours-table">
                <thead>
                  <tr>
                    <th>Zi</th>
                    <th>Status</th>
                    <th>Ora deschidere</th>
                    <th>Ora închidere</th>
                    <th>Rezumat</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((day) => {
                    const dayInfo = DAYS.find((item) => item.value === day.zi_saptamana)
                    return (
                      <tr key={day.zi_saptamana} className={!day.deschis ? 'is-closed' : ''}>
                        <td>
                          <div className="day-name">
                            <span className="day-short">{dayInfo.short}</span>
                            <strong>{dayInfo.label}</strong>
                          </div>
                        </td>
                        <td>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={Boolean(day.deschis)}
                              onChange={(event) => updateDay(day.zi_saptamana, 'deschis', event.target.checked)}
                            />
                            <span />
                            <em>{day.deschis ? 'Deschis' : 'Închis'}</em>
                          </label>
                        </td>
                        <td>
                          <label className="time-input">
                            <ClockIcon />
                            <input
                              type="time"
                              value={day.ora_start || ''}
                              disabled={!day.deschis}
                              onChange={(event) => updateDay(day.zi_saptamana, 'ora_start', event.target.value)}
                            />
                          </label>
                        </td>
                        <td>
                          <label className="time-input">
                            <ClockIcon />
                            <input
                              type="time"
                              value={day.ora_end || ''}
                              disabled={!day.deschis}
                              onChange={(event) => updateDay(day.zi_saptamana, 'ora_end', event.target.value)}
                            />
                          </label>
                        </td>
                        <td>
                          <span className={`schedule-pill ${day.deschis ? '' : 'closed'}`}>
                            {day.deschis ? `${day.ora_start} – ${day.ora_end}` : 'Zi închisă'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {error && <div className="hours-feedback is-error">{error}</div>}
            {feedback && <div className="hours-feedback is-success">{feedback}</div>}

          </>
        )}
      </section>

      {!loading && !error && (
        <section className="hours-card booking-rules-card">
          <div className="hours-card-head">
            <div>
              <h2>Intervale și reguli de rezervare</h2>
              <p>Aici controlezi sloturile pe care le văd clienții în formularul de rezervare.</p>
            </div>
          </div>

          <div className="hours-table-wrap">
            <table className="hours-table booking-table">
              <thead>
                <tr>
                  <th>Categorie</th>
                  <th>Locuri / slot</th>
                  <th>Durată slot</th>
                  <th>Rezervare cu minimum</th>
                  <th>Rezervare maximum</th>
                </tr>
              </thead>
              <tbody>
                {capacity.map((row) => (
                  <tr key={row.categorie}>
                    <td><strong>{CATEGORY_LABELS[row.categorie] || row.categorie}</strong></td>
                    <td>
                      <input
                        className="number-input"
                        type="number"
                        min="1"
                        value={row.locuri}
                        onChange={(event) => updateCapacity(row.categorie, 'locuri', event.target.value)}
                      />
                    </td>
                    <td>
                      <label className="unit-input">
                        <input
                          type="number"
                          min="1"
                          value={row.durata_minute}
                          onChange={(event) => updateCapacity(row.categorie, 'durata_minute', event.target.value)}
                        />
                        <span>minute</span>
                      </label>
                    </td>
                    <td>
                      <label className="unit-input">
                        <input
                          type="number"
                          min="0"
                          value={row.avans_minute}
                          onChange={(event) => updateCapacity(row.categorie, 'avans_minute', event.target.value)}
                        />
                        <span>minute</span>
                      </label>
                    </td>
                    <td>
                      <label className="unit-input">
                        <input
                          type="number"
                          min="1"
                          value={row.zile_maxim}
                          onChange={(event) => updateCapacity(row.categorie, 'zile_maxim', event.target.value)}
                        />
                        <span>zile</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hours-actions">
            <span>Orele disponibile se calculează din programul de mai sus și durata fiecărui slot.</span>
            <button type="button" className="save-hours" onClick={handleSave} disabled={saving}>
              <SaveIcon />
              {saving ? 'Se salvează...' : 'Salvează setările'}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

export default EditServiceHours
