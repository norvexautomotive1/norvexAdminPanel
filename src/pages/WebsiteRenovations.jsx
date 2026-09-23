import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/WebsiteRenovations.scss'

const SETTING_GROUPS = [
  {
    title: 'Date de contact',
    description: 'Informațiile afișate clienților pe site.',
    keys: ['phone_primary', 'email_primary', 'address', 'opening_hours'],
  },
  {
    title: 'Rețele sociale',
    description: 'Lasă câmpul gol dacă nu vrei să afișezi un link.',
    keys: ['instagram_url', 'tiktok_url', 'facebook_url'],
  },
]

const getInputType = (key) => {
  if (key.includes('email')) return 'email'
  if (key.includes('url')) return 'url'
  return 'text'
}

const WebsiteRenovations = () => {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [savedAt, setSavedAt] = useState('')

  const settingsByKey = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.key, setting])),
    [settings],
  )

  const fetchSettings = async () => {
    setLoading(true)
    setError('')
    setFeedback('')

    const { data, error: fetchError } = await supabase
      .from('site_settings')
      .select('key, value, label, updated_at')
      .order('key', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setSettings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSetting = (key, value) => {
    setSettings((currentSettings) =>
      currentSettings.map((setting) =>
        setting.key === key ? { ...setting, value } : setting,
      ),
    )
    setFeedback('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setFeedback('')

    const updatedAt = new Date().toISOString()
    const results = await Promise.all(
      settings.map((setting) =>
        supabase
          .from('site_settings')
          .update({
            value: setting.value || '',
            updated_at: updatedAt,
          })
          .eq('key', setting.key)
          .select('key, value, label, updated_at')
          .single(),
      ),
    )

    const failedResult = results.find((result) => result.error)
    setSaving(false)

    if (failedResult?.error) {
      setError(failedResult.error.message)
      return
    }

    const savedSettings = results.map((result) => result.data)
    setSettings(savedSettings)
    setSavedAt(new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }))
    setFeedback('Datele site-ului au fost salvate cu succes.')
  }

  return (
    <main className="website-settings-page">
      <div className="website-settings-head">
        <div>
          <div className="website-settings-eyebrow">Configurare website</div>
          <h1>Renovare website</h1>
          <p>Editează informațiile publice afișate pe site-ul Norvex.</p>
        </div>
        <button type="button" className="settings-refresh" onClick={fetchSettings} disabled={loading || saving}>
          Reîncarcă
        </button>
      </div>

      {loading && <div className="settings-state">Se încarcă setările...</div>}
      {!loading && error && <div className="settings-state is-error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="settings-groups">
            {SETTING_GROUPS.map((group) => (
              <section className="settings-card" key={group.title}>
                <div className="settings-card-head">
                  <div>
                    <h2>{group.title}</h2>
                    <p>{group.description}</p>
                  </div>
                  <span className="settings-card-mark">N</span>
                </div>

                <div className="settings-fields">
                  {group.keys.map((key) => {
                    const setting = settingsByKey[key]
                    if (!setting) return null

                    return (
                      <label className={`settings-field ${key === 'address' || key === 'opening_hours' ? 'is-wide' : ''}`} key={key}>
                        <span>{setting.label || key}</span>
                        {key === 'address' || key === 'opening_hours' ? (
                          <textarea
                            rows="2"
                            value={setting.value || ''}
                            onChange={(event) => updateSetting(key, event.target.value)}
                          />
                        ) : (
                          <input
                            type={getInputType(key)}
                            value={setting.value || ''}
                            placeholder={key.includes('url') ? 'https://...' : ''}
                            onChange={(event) => updateSetting(key, event.target.value)}
                          />
                        )}
                        <small>{key}</small>
                      </label>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {feedback && <div className="settings-feedback is-success">{feedback}</div>}
          {error && <div className="settings-feedback is-error">{error}</div>}

          <div className="settings-actions">
            <span>{savedAt ? `Ultima salvare: ${savedAt}` : 'Modificările nu sunt salvate automat.'}</span>
            <button type="button" className="settings-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Se salvează...' : 'Salvează modificările'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}

export default WebsiteRenovations
