import React, { useEffect, useRef, useState } from 'react'

import styles from './Shortcuts.module.css'
import IconPicker from './IconPicker.js'
import Switch from '@/components/Switch/Switch.js'

interface Shortcut {
  id: string
  name?: string
  command: string
}

type ImageTab = 'upload' | 'icon'

const emptyDraft: Shortcut = { id: '', name: '', command: '' }

const Shortcuts: React.FC = () => {
  const previewImageRef = useRef<HTMLImageElement>(null)

  const [shortcuts, setShortcuts] = useState<Shortcut[] | null>(null)
  const [showLock, setShowLock] = useState<boolean | null>(null)
  const [showShutdown, setShowShutdown] = useState<boolean | null>(null)

  useEffect(() => {
    window.api
      .getStorageValue('showLockShortcut')
      .then(v => setShowLock(v === true))
    window.api
      .getStorageValue('showShutdownShortcut')
      .then(v => setShowShutdown(v === true))
  }, [])

  // Editor state — covers both "add new" (editingId === null) and edit
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Shortcut>(emptyDraft)
  const [hasSetImage, setHasSetImage] = useState(false)
  const [imageTab, setImageTab] = useState<ImageTab>('icon')
  const [iconBust, setIconBust] = useState(0)

  useEffect(() => {
    window.api.getShortcuts().then(setShortcuts)
  }, [])

  const isNew = editingId === null
  // Icon changes are always staged in the temporary 'new' image and only
  // promoted to the shortcut's own image on Save — Cancel discards them.
  const [stagedIcon, setStagedIcon] = useState(false)

  function openAdd() {
    window.api.removeNewShortcutImage()
    setEditingId(null)
    setDraft(emptyDraft)
    setHasSetImage(false)
    setStagedIcon(false)
    setImageTab('icon')
    setEditorOpen(true)
  }

  function openEdit(shortcut: Shortcut) {
    window.api.removeNewShortcutImage()
    setEditingId(shortcut.id)
    setDraft(shortcut)
    setHasSetImage(true)
    setStagedIcon(false)
    setImageTab('icon')
    setIconBust(Date.now())
    setEditorOpen(true)
  }

  function closeEditor() {
    window.api.removeNewShortcutImage()
    setEditorOpen(false)
  }

  async function browseForApp() {
    const file = await window.api.browseForApp()
    if (!file) return
    const quoted = file.includes(' ') ? `"${file}"` : file
    setDraft(d => ({
      ...d,
      command: quoted,
      name: d.name || fileBaseName(file)
    }))
  }

  function fileBaseName(p: string) {
    const base = p.split(/[\\/]/).pop() ?? ''
    return base.replace(/\.(exe|bat|cmd|lnk|app|desktop)$/i, '')
  }

  async function save() {
    if (!draft.command) return

    if (isNew) {
      const shortcut: Shortcut = {
        id: crypto.randomUUID(),
        name: draft.name,
        command: draft.command
      }
      await window.api.addShortcut(shortcut)
      setShortcuts(s => [...(s || []), shortcut])
    } else {
      await window.api.updateShortcut(draft)
      setShortcuts(s => s && s.map(x => (x.id === draft.id ? draft : x)))
    }
    setEditorOpen(false)
  }

  async function remove(id: string) {
    await window.api.removeShortcut(id)
    setShortcuts(s => s && s.filter(x => x.id !== id))
    setEditorOpen(false)
  }

  async function uploadImage() {
    const res = await window.api.uploadShortcutImage('new')
    if (!res) return
    setHasSetImage(true)
    setStagedIcon(true)
    setIconBust(Date.now())
  }

  async function pickIcon(dataUrl: string) {
    await window.api.saveShortcutIconFromDataUrl('new', dataUrl)
    setHasSetImage(true)
    setStagedIcon(true)
    setIconBust(Date.now())
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2>Shortcuts</h2>
        <button className={styles.addBtn} onClick={openAdd}>
          <span className="material-icons">add</span>
          Add Shortcut
        </button>
      </div>
      <p className={styles.pageDesc}>
        Apps and commands you can launch from the Car Thing's app screen.
      </p>

      {showLock !== null && (
        <div className={styles.lockToggle}>
          <div>
            <p className={styles.lockToggleLabel}>Show "Lock PC" shortcut</p>
            <p className={styles.lockToggleDesc}>
              Adds a tile to the Car Thing's app screen that locks this
              computer.
            </p>
          </div>
          <Switch
            value={showLock}
            onChange={value => {
              setShowLock(value)
              window.api.setStorageValue('showLockShortcut', value)
            }}
          />
        </div>
      )}

      {showShutdown !== null && (
        <div className={styles.lockToggle}>
          <div>
            <p className={styles.lockToggleLabel}>Show "Shut Down PC" shortcut</p>
            <p className={styles.lockToggleDesc}>
              Adds a tile to the Car Thing's app screen that shuts down this
              computer. The Car Thing always asks for confirmation first.
            </p>
          </div>
          <Switch
            value={showShutdown}
            onChange={value => {
              setShowShutdown(value)
              window.api.setStorageValue('showShutdownShortcut', value)
            }}
          />
        </div>
      )}

      {shortcuts && shortcuts.length === 0 && !editorOpen && (
        <div className={styles.empty}>
          <span className="material-icons">apps</span>
          <p>No shortcuts yet</p>
          <p className={styles.emptyHint}>
            Add one to launch apps straight from your Car Thing.
          </p>
        </div>
      )}

      <div className={styles.list}>
        {shortcuts?.map(shortcut => (
          <button
            key={shortcut.id}
            className={styles.row}
            data-active={editorOpen && editingId === shortcut.id}
            onClick={() => openEdit(shortcut)}
          >
            <img
              src={`shortcut://${shortcut.id}?${iconBust}`}
              alt=""
              onError={e => {
                (e.target as HTMLImageElement).style.visibility = 'hidden'
              }}
              onLoad={e => {
                (e.target as HTMLImageElement).style.visibility = 'visible'
              }}
            />
            <div className={styles.rowText}>
              <p className={styles.rowName}>
                {shortcut.name || 'Unnamed shortcut'}
              </p>
              <p className={styles.rowCommand}>{shortcut.command}</p>
            </div>
            <span className="material-icons">edit</span>
          </button>
        ))}
      </div>

      {editorOpen && (
        <div className={styles.editor}>
          <h3>{isNew ? 'New Shortcut' : 'Edit Shortcut'}</h3>

          <div className={styles.field}>
            <label>App or command</label>
            <div className={styles.commandRow}>
              <input
                type="text"
                placeholder='e.g. notepad or "C:\Program Files\..."'
                value={draft.command}
                onChange={e =>
                  setDraft({ ...draft, command: e.target.value })
                }
              />
              <button className={styles.browseBtn} onClick={browseForApp}>
                <span className="material-icons">folder_open</span>
                Browse...
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label>Name (shown on the Car Thing)</label>
            <input
              type="text"
              placeholder="e.g. Discord"
              value={draft.name ?? ''}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label>Icon (optional)</label>
            <div className={styles.iconRow}>
              <img
                ref={previewImageRef}
                className={styles.iconPreview}
                data-visible={hasSetImage}
                src={
                  stagedIcon
                    ? `shortcut://new?${iconBust}`
                    : !isNew && hasSetImage
                      ? `shortcut://${editingId}?${iconBust}`
                      : ''
                }
                alt=""
                onError={e => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden'
                }}
                onLoad={e => {
                  (e.target as HTMLImageElement).style.visibility = 'visible'
                }}
              />
              <div className={styles.tabSwitcher}>
                <button
                  className={styles.tabBtn}
                  data-active={imageTab === 'icon'}
                  onClick={() => setImageTab('icon')}
                >
                  <span className="material-icons">grid_view</span>
                  Pick Icon
                </button>
                <button
                  className={styles.tabBtn}
                  data-active={imageTab === 'upload'}
                  onClick={() => setImageTab('upload')}
                >
                  <span className="material-icons">upload</span>
                  Upload PNG
                </button>
              </div>
            </div>
            {imageTab === 'icon' ? (
              <IconPicker onSelect={pickIcon} />
            ) : (
              <button className={styles.uploadBtn} onClick={uploadImage}>
                <span className="material-icons">upload</span>
                Choose a PNG file...
              </button>
            )}
          </div>

          <div className={styles.buttons}>
            {!isNew && (
              <button
                data-type="danger"
                onClick={() => remove(draft.id)}
              >
                Delete
              </button>
            )}
            <div className={styles.buttonsRight}>
              <button onClick={closeEditor}>Cancel</button>
              <button
                data-type="primary"
                disabled={!draft.command}
                onClick={save}
              >
                {isNew ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Shortcuts
