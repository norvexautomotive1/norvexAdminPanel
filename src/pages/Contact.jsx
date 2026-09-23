import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/Contact.scss'

const STATUS_OPTIONS = [
  { value: 'nou', label: 'Nou' },
  { value: 'citit', label: 'Citit' },
  { value: 'rezolvat', label: 'Rezolvat' },
]

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusLabel = (status) => {
  const knownStatus = STATUS_OPTIONS.find((option) => option.value === status)
  return knownStatus?.label || status || 'Fără status'
}

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
)

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 21V5l8-3 8 3v16M2 21h20M8 8h1M15 8h1M8 12h1M15 12h1M8 16h1M15 16h1" />
  </svg>
)

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
)

const Contact = () => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('toate')
  const [selectedContact, setSelectedContact] = useState(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  const fetchContacts = async () => {
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('contacturi_norvex')
      .select('id, nume, prenume, este_firma, motiv, created_at, email, telefon, tip_firma, mesaj, status, responded_at')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setContacts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return contacts.filter((contact) => {
      const matchesStatus = statusFilter === 'toate' || contact.status === statusFilter
      const searchableText = [
        contact.nume,
        contact.prenume,
        contact.email,
        contact.telefon,
        contact.motiv,
        contact.mesaj,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery))
    })
  }, [contacts, query, statusFilter])

  const statusCounts = useMemo(
    () => ({
      total: contacts.length,
      nou: contacts.filter((contact) => contact.status === 'nou').length,
      citit: contacts.filter((contact) => contact.status === 'citit').length,
      rezolvat: contacts.filter((contact) => contact.status === 'rezolvat').length,
    }),
    [contacts],
  )

  const openContact = (contact) => {
    setSelectedContact(contact)
    setStatusError('')
  }

  const updateStatus = async (nextStatus) => {
    if (!selectedContact?.id || nextStatus === selectedContact.status) return

    setSavingStatus(true)
    setStatusError('')

    const { data, error: updateError } = await supabase
      .from('contacturi_norvex')
      .update({
        status: nextStatus,
        responded_at: nextStatus === 'rezolvat' ? new Date().toISOString() : null,
      })
      .eq('id', selectedContact.id)
      .select('id, status, responded_at')

    setSavingStatus(false)

    if (updateError) {
      setStatusError(updateError.message)
      return
    }

    if (!data || data.length === 0) {
      setStatusError(
        'Statusul nu a fost actualizat. Verifică politica RLS UPDATE pentru tabela contacturi_norvex.'
      )
      return
    }

    const updatedContact = { ...selectedContact, ...data[0] }
    setContacts((currentContacts) =>
      currentContacts.map((contact) => (contact.id === updatedContact.id ? { ...contact, ...updatedContact } : contact)),
    )
    setSelectedContact(updatedContact)
  }

  return (
    <div className="contact-page">
      <div className="contact-head">
        <div>
          <div className="contact-eyebrow">Mesaje și solicitări</div>
          <h1>Contact</h1>
          <p>Gestionează mesajele primite de la clienți.</p>
        </div>
        <button type="button" className="refresh-btn" onClick={fetchContacts} disabled={loading}>
          Reîmprospătează
        </button>
      </div>

      <div className="contact-stats">
        <div className="stat-card"><span>Total</span><strong>{statusCounts.total}</strong></div>
        <div className="stat-card is-new"><span>Necesită atenție</span><strong>{statusCounts.nou}</strong></div>
        <div className="stat-card"><span>Citite</span><strong>{statusCounts.citit}</strong></div>
        <div className="stat-card is-done"><span>Rezolvate</span><strong>{statusCounts.rezolvat}</strong></div>
      </div>

      <div className="contact-toolbar">
        <label className="search-field">
          <span>Caută</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nume, e-mail, telefon sau mesaj..."
          />
        </label>
        <label className="filter-field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="toate">Toate mesajele</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="contact-list-card">
        {loading && <div className="contact-state">Se încarcă mesajele...</div>}
        {!loading && error && <div className="contact-state is-error">A apărut o eroare: {error}</div>}
        {!loading && !error && filteredContacts.length === 0 && (
          <div className="contact-state">Nu există solicitări care să corespundă filtrului.</div>
        )}
        {!loading && !error && filteredContacts.length > 0 && (
          <div className="contact-list">
            {filteredContacts.map((contact) => (
              <button type="button" className="contact-row" key={contact.id} onClick={() => openContact(contact)}>
                <div className="contact-avatar">
                  {(contact.nume || '?').charAt(0).toUpperCase()}
                </div>
                <div className="contact-main">
                  <div className="contact-row-head">
                    <strong>{contact.nume} {contact.prenume}</strong>
                    <span className={`status-badge status-${contact.status || 'necunoscut'}`}>
                      {getStatusLabel(contact.status)}
                    </span>
                  </div>
                  <div className="contact-row-meta">
                    {contact.este_firma && <span><BuildingIcon /> Firmă</span>}
                    {contact.email && <span><MailIcon /> {contact.email}</span>}
                    {contact.telefon && <span><PhoneIcon /> {contact.telefon}</span>}
                  </div>
                  <p>{contact.motiv || contact.mesaj || 'Fără subiect'}</p>
                </div>
                <time>{formatDate(contact.created_at)}</time>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedContact && (
        <div className="contact-modal-backdrop" onClick={() => setSelectedContact(null)}>
          <div className="contact-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-top">
              <div>
                <div className="contact-eyebrow">Solicitare de contact</div>
                <h2>{selectedContact.nume} {selectedContact.prenume}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedContact(null)} aria-label="Închide">
                ×
              </button>
            </div>

            <div className="contact-details">
              <div><span>E-mail</span><a href={`mailto:${selectedContact.email}`}>{selectedContact.email || '—'}</a></div>
              <div><span>Telefon</span><a href={`tel:${selectedContact.telefon}`}>{selectedContact.telefon || '—'}</a></div>
              <div><span>Tip</span><strong>{selectedContact.este_firma ? selectedContact.tip_firma || 'Firmă' : 'Persoană fizică'}</strong></div>
              <div><span>Primit la</span><strong>{formatDate(selectedContact.created_at)}</strong></div>
            </div>

            <div className="message-box">
              <span>{selectedContact.motiv || 'Mesaj'}</span>
              <p>{selectedContact.mesaj || 'Nu există conținut pentru această solicitare.'}</p>
            </div>

            <div className="modal-footer">
              <label>
                <span>Status solicitare</span>
                <select value={selectedContact.status || ''} onChange={(event) => updateStatus(event.target.value)} disabled={savingStatus}>
                  <option value="" disabled>Fără status</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {statusError && <p className="status-error">{statusError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Contact
