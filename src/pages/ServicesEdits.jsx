import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/ServicesEdits.scss'

const emptyVulcanizareForm = {
  nume_serviciu: '',
  pret_autoturism: '',
  pret_suv: '',
  pret_microbuz: '',
}

const emptyDetailingForm = {
  nume_serviciu: '',
  descriere: '',
  pret_fix: '',
  pe_deviz: false,
}

const VulcanizareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    <path d="M12 3.5v3M12 17.5v3M20.5 12h-3M6.5 12h-3M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1M17.7 17.7l-2.1-2.1M8.4 8.4L6.3 6.3" />
  </svg>
)

const DetailingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M6 14c1.5-4 4-7 8-9.5-1 3-1 5.5 0 8 1.5-1 3-1.5 4.5-1-2 3-5 5.5-8.5 6.5-1.5.4-3 .6-4 0-1.2-.7-1-2.5 0-4z" />
    <path d="M5 19l2.5-2.5" />
  </svg>
)

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
)

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
  </svg>
)

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  return `${value} lei`
}

const ServicesEdits = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeTab, setActiveTab] = useState('Vulcanizare')

  const [vulcanizareForm, setVulcanizareForm] = useState(emptyVulcanizareForm)
  const [detailingForm, setDetailingForm] = useState(emptyDetailingForm)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [editingRow, setEditingRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fetchServices = async () => {
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('servicii_norvex')
      .select('*')
      .order('ordine', { ascending: true })
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setServices(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const visibleServices = services.filter((s) => s.categorie === activeTab)

  // ── Add ──

  const handleAddVulcanizare = async (e) => {
    e.preventDefault()
    setAdding(true)
    setAddError('')

    const payload = {
      categorie: 'Vulcanizare',
      nume_serviciu: vulcanizareForm.nume_serviciu.trim(),
      pret_autoturism: vulcanizareForm.pret_autoturism || null,
      pret_suv: vulcanizareForm.pret_suv || null,
      pret_microbuz: vulcanizareForm.pret_microbuz || null,
    }

    const { data, error: insertError } = await supabase
      .from('servicii_norvex')
      .insert([payload])
      .select()

    setAdding(false)

    if (insertError) {
      setAddError(insertError.message)
      return
    }

    setServices((prev) => [...prev, ...data])
    setVulcanizareForm(emptyVulcanizareForm)
  }

  const handleAddDetailing = async (e) => {
    e.preventDefault()
    setAdding(true)
    setAddError('')

    const payload = {
      categorie: 'Detailing',
      nume_serviciu: detailingForm.nume_serviciu.trim(),
      descriere: detailingForm.descriere.trim() || null,
      pret_fix: detailingForm.pe_deviz ? null : detailingForm.pret_fix || null,
      pe_deviz: detailingForm.pe_deviz,
    }

    const { data, error: insertError } = await supabase
      .from('servicii_norvex')
      .insert([payload])
      .select()

    setAdding(false)

    if (insertError) {
      setAddError(insertError.message)
      return
    }

    setServices((prev) => [...prev, ...data])
    setDetailingForm(emptyDetailingForm)
  }

  // ── Edit ──

  const openEdit = (row) => {
    setEditingRow({ ...row })
    setSaveError('')
  }

  const closeEdit = () => {
    setEditingRow(null)
  }

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditingRow((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    setSaveError('')

    const { id, created_at, categorie, ...rest } = editingRow

    const updates =
      categorie === 'Vulcanizare'
        ? {
            nume_serviciu: rest.nume_serviciu,
            pret_autoturism: rest.pret_autoturism || null,
            pret_suv: rest.pret_suv || null,
            pret_microbuz: rest.pret_microbuz || null,
          }
        : {
            nume_serviciu: rest.nume_serviciu,
            descriere: rest.descriere || null,
            pret_fix: rest.pe_deviz ? null : rest.pret_fix || null,
            pe_deviz: rest.pe_deviz,
          }

    const { error: updateError } = await supabase
      .from('servicii_norvex')
      .update(updates)
      .eq('id', id)

    setSaving(false)

    if (updateError) {
      setSaveError(updateError.message)
      return
    }

    setServices((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
    closeEdit()
  }

  // ── Delete ──

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Ștergi definitiv acest serviciu?')
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('servicii_norvex')
      .delete()
      .eq('id', id)

    if (deleteError) {
      alert(`Eroare la ștergere: ${deleteError.message}`)
      return
    }

    setServices((prev) => prev.filter((row) => row.id !== id))
  }

  return (
    <div className="services-edits-page">
      <div className="eyebrow">Administrare</div>
      <h1>Editare servicii</h1>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'Vulcanizare' ? 'active' : ''}`}
          onClick={() => setActiveTab('Vulcanizare')}
        >
          <VulcanizareIcon />
          Vulcanizare
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'Detailing' ? 'active' : ''}`}
          onClick={() => setActiveTab('Detailing')}
        >
          <DetailingIcon />
          Detailing
        </button>
      </div>

      {/* Add form */}
      {activeTab === 'Vulcanizare' ? (
        <form className="add-card" onSubmit={handleAddVulcanizare}>
          <h3>Adaugă serviciu nou</h3>
          <div className="form-grid">
            <div className="field">
              <label>Denumire serviciu</label>
              <input
                type="text"
                placeholder="ex: Montaj / demontat roată"
                value={vulcanizareForm.nume_serviciu}
                onChange={(e) =>
                  setVulcanizareForm((prev) => ({ ...prev, nume_serviciu: e.target.value }))
                }
                required
              />
            </div>
            <div className="field">
              <label>Autoturism (lei)</label>
              <input
                type="number"
                placeholder="20"
                value={vulcanizareForm.pret_autoturism}
                onChange={(e) =>
                  setVulcanizareForm((prev) => ({ ...prev, pret_autoturism: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>SUV (lei)</label>
              <input
                type="number"
                placeholder="25"
                value={vulcanizareForm.pret_suv}
                onChange={(e) =>
                  setVulcanizareForm((prev) => ({ ...prev, pret_suv: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Microbuz 8+1 (lei)</label>
              <input
                type="number"
                placeholder="30"
                value={vulcanizareForm.pret_microbuz}
                onChange={(e) =>
                  setVulcanizareForm((prev) => ({ ...prev, pret_microbuz: e.target.value }))
                }
              />
            </div>
            <button type="submit" className="add-btn" disabled={adding}>
              {adding ? 'Se adaugă...' : '+ Adaugă'}
            </button>
          </div>
          {addError && <p className="form-error">{addError}</p>}
        </form>
      ) : (
        <form className="add-card" onSubmit={handleAddDetailing}>
          <h3>Adaugă serviciu nou</h3>
          <div className="form-grid detailing">
            <div className="field">
              <label>Denumire serviciu</label>
              <input
                type="text"
                placeholder="ex: Interior simplu"
                value={detailingForm.nume_serviciu}
                onChange={(e) =>
                  setDetailingForm((prev) => ({ ...prev, nume_serviciu: e.target.value }))
                }
                required
              />
            </div>
            <div className="field">
              <label>Descriere (opțional)</label>
              <input
                type="text"
                placeholder="ex: Spălătorie tradițională, fără tapițerie"
                value={detailingForm.descriere}
                onChange={(e) =>
                  setDetailingForm((prev) => ({ ...prev, descriere: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Preț (lei)</label>
              <input
                type="number"
                placeholder="250"
                value={detailingForm.pret_fix}
                disabled={detailingForm.pe_deviz}
                onChange={(e) =>
                  setDetailingForm((prev) => ({ ...prev, pret_fix: e.target.value }))
                }
              />
            </div>
            <button type="submit" className="add-btn" disabled={adding}>
              {adding ? 'Se adaugă...' : '+ Adaugă'}
            </button>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={detailingForm.pe_deviz}
              onChange={(e) =>
                setDetailingForm((prev) => ({ ...prev, pe_deviz: e.target.checked }))
              }
            />
            Preț „pe deviz” (fără sumă fixă)
          </label>
          {addError && <p className="form-error">{addError}</p>}
        </form>
      )}

      {/* Table */}
      <div className="table-card">
        {loading && <div className="state-message">Se încarcă serviciile...</div>}
        {!loading && error && (
          <div className="state-message error">A apărut o eroare: {error}</div>
        )}
        {!loading && !error && visibleServices.length === 0 && (
          <div className="state-message">Niciun serviciu adăugat încă pentru {activeTab}.</div>
        )}

        {!loading && !error && visibleServices.length > 0 && activeTab === 'Vulcanizare' && (
          <table>
            <thead>
              <tr>
                <th>Serviciu</th>
                <th>Autoturism</th>
                <th>SUV</th>
                <th>Microbuz 8+1</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleServices.map((row) => (
                <tr key={row.id}>
                  <td>{row.nume_serviciu}</td>
                  <td className="price-cell">{formatPrice(row.pret_autoturism)}</td>
                  <td className="price-cell">{formatPrice(row.pret_suv)}</td>
                  <td className="price-cell">{formatPrice(row.pret_microbuz)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" onClick={() => openEdit(row)}>
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-btn delete"
                        onClick={() => handleDelete(row.id)}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && visibleServices.length > 0 && activeTab === 'Detailing' && (
          <table>
            <thead>
              <tr>
                <th>Serviciu</th>
                <th>Descriere</th>
                <th>Preț</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleServices.map((row) => (
                <tr key={row.id}>
                  <td>{row.nume_serviciu}</td>
                  <td className="meta">{row.descriere || '—'}</td>
                  <td className="price-cell">
                    {row.pe_deviz ? 'Pe deviz' : formatPrice(row.pret_fix)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" onClick={() => openEdit(row)}>
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-btn delete"
                        onClick={() => handleDelete(row.id)}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editingRow && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Editează serviciul</h2>
              <button type="button" className="modal-close" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div className="field">
              <label>Denumire serviciu</label>
              <input
                type="text"
                name="nume_serviciu"
                value={editingRow.nume_serviciu}
                onChange={handleEditChange}
              />
            </div>

            {editingRow.categorie === 'Vulcanizare' ? (
              <div className="field-row">
                <div className="field">
                  <label>Autoturism</label>
                  <input
                    type="number"
                    name="pret_autoturism"
                    value={editingRow.pret_autoturism ?? ''}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="field">
                  <label>SUV</label>
                  <input
                    type="number"
                    name="pret_suv"
                    value={editingRow.pret_suv ?? ''}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="field">
                  <label>Microbuz 8+1</label>
                  <input
                    type="number"
                    name="pret_microbuz"
                    value={editingRow.pret_microbuz ?? ''}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Descriere</label>
                  <input
                    type="text"
                    name="descriere"
                    value={editingRow.descriere ?? ''}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="field">
                  <label>Preț</label>
                  <input
                    type="number"
                    name="pret_fix"
                    value={editingRow.pret_fix ?? ''}
                    disabled={editingRow.pe_deviz}
                    onChange={handleEditChange}
                  />
                </div>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    name="pe_deviz"
                    checked={editingRow.pe_deviz}
                    onChange={handleEditChange}
                  />
                  Preț „pe deviz”
                </label>
              </>
            )}

            {saveError && <div className="state-message error inline">{saveError}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={closeEdit}>
                Anulează
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSaveEdit}
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

export default ServicesEdits