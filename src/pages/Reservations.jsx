import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/Reservations.scss'

const TIPURI_CAROSERIE = ['Citadină', 'Sedan', 'Break']
const EDITABLE_FIELDS = [
  'nume',
  'prenume',
  'telefon',
  'email',
  'tip_masina',
  'numar_masina',
  'categorie_serviciu',
  'pachet_selectat',
]

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
)

const formatDate = (isoString) => {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// data_programare vine ca 'YYYY-MM-DD'. O parsăm manual în ora locală:
// new Date('2026-09-23') ar fi interpretat ca UTC și poate arăta altă zi.
const formatDataProgramare = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatOraProgramare = (time) => (time ? time.slice(0, 5) : '')

const Reservations = () => {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fetchReservations = async () => {
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('rezervari_norvex')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setReservations(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchReservations()
  }, [])

  const openEdit = (row) => {
    setEditingId(row.id)
    setEditForm({ ...row })
    setSaveError('')
  }

  const closeEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!editForm || !editForm.id) {
      setSaveError('Nu există o rezervare validă de salvat.')
      return
    }

    setSaving(true)
    setSaveError('')

    const updates = EDITABLE_FIELDS.reduce((acc, field) => {
      const value = editForm[field]
      acc[field] = typeof value === 'string' ? value.trim() : value ?? ''
      return acc
    }, {})

    const { data, error: updateError } = await supabase
      .from('rezervari_norvex')
      .update(updates)
      .eq('id', editForm.id)
      .select()

    setSaving(false)

    if (updateError) {
      setSaveError(updateError.message)
      return
    }

    if (data && data.length > 0) {
      setReservations((prev) =>
        prev.map((row) => (row.id === editForm.id ? { ...row, ...data[0] } : row))
      )
    }

    await fetchReservations()
    closeEdit()
  }

  return (
    <div className="reservations-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Administrare</div>
          <h1>Rezervări</h1>
        </div>
        <div className="count-pill">
          <b>{reservations.length}</b> rezervări totale
        </div>
      </div>

      <div className="table-card">
        {loading && <div className="state-message">Se încarcă rezervările...</div>}

        {!loading && error && (
          <div className="state-message error">A apărut o eroare: {error}</div>
        )}

        {!loading && !error && reservations.length === 0 && (
          <div className="state-message">Nu există rezervări încă.</div>
        )}

        {!loading && !error && reservations.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Mașină</th>
                <th>Categorie</th>
                <th>Pachet</th>
                <th>Programare</th>
                <th>Creată la</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((row) => (
                <tr key={row.id}>
                  <td className="client-cell">
                    <div className="name">
                      {row.nume} {row.prenume}
                    </div>
                  </td>
                  <td>
                    <div className="meta">{row.telefon}</div>
                    <div className="meta">{row.email}</div>
                  </td>
                  <td>
                    <div>{row.tip_masina}</div>
                    <div className="meta">{row.numar_masina}</div>
                  </td>
                  <td>
                    <span className="category-tag">{row.categorie_serviciu}</span>
                  </td>
                  <td>{row.pachet_selectat}</td>
                  <td>
                    <div className="programare-cell">
                      <span>{formatDataProgramare(row.data_programare)}</span>{' '}
                      {row.ora_programare && (
                        <span className="ora-pill">{formatOraProgramare(row.ora_programare)}</span>
                      )}
                    </div>
                  </td>
                  <td className="meta">{formatDate(row.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => openEdit(row)}
                      aria-label="Editează rezervarea"
                    >
                      <EditIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editForm && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Editează rezervarea</h2>
              <button type="button" className="modal-close" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Nume</label>
                <input
                  type="text"
                  name="nume"
                  value={editForm.nume ?? ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="field">
                <label>Prenume</label>
                <input
                  type="text"
                  name="prenume"
                  value={editForm.prenume ?? ''}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Telefon</label>
                <input
                  type="text"
                  name="telefon"
                  value={editForm.telefon ?? ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="text"
                  name="email"
                  value={editForm.email ?? ''}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Tip caroserie</label>
                <select
                  name="tip_masina"
                  value={editForm.tip_masina ?? TIPURI_CAROSERIE[0]}
                  onChange={handleEditChange}
                >
                  {TIPURI_CAROSERIE.map((tip) => (
                    <option key={tip} value={tip}>
                      {tip}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Număr mașină</label>
                <input
                  type="text"
                  name="numar_masina"
                  value={editForm.numar_masina ?? ''}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="field">
              <label>Categorie serviciu</label>
              <select
                name="categorie_serviciu"
                value={editForm.categorie_serviciu ?? 'Vulcanizare'}
                onChange={handleEditChange}
              >
                <option value="Vulcanizare">Vulcanizare</option>
                <option value="Detailing">Detailing</option>
              </select>
            </div>

            <div className="field">
              <label>Pachet</label>
              <input
                type="text"
                name="pachet_selectat"
                value={editForm.pachet_selectat ?? ''}
                onChange={handleEditChange}
              />
            </div>

            {saveError && <div className="state-message error inline">{saveError}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={closeEdit}>
                Anulează
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Se salvează...' : 'Salvează modificările'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reservations