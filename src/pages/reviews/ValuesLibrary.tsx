import { useMemo, useState } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { Heart, Plus } from 'lucide-react'
import { EmptyState, ResizableTable, Switch } from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'
import {
  valueCreatePath,
  valueEditPath,
  valuesLibraryPath,
} from '@/lib/reviews/paths'
import { useCompanyValue, useValuesLibrary } from '@/lib/values/useValues'
import { SettingsSidePanel } from './SettingsSidePanel'
import { ValueFormFields } from './ValueFormEditor'

type PanelMode =
  | { kind: 'create' }
  | { kind: 'edit'; valueId: string }

function panelModeFromRoute(
  isCreate: boolean,
  valueId: string | undefined,
): PanelMode | null {
  if (isCreate) return { kind: 'create' }
  if (valueId) return { kind: 'edit', valueId }
  return null
}

export function ValuesLibrary() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { values } = useValuesLibrary()
  const [hideDisabled, setHideDisabled] = useState(true)

  const createMatch = useMatch('/reviews/values/new')
  const editMatch = useMatch('/reviews/values/:valueId/edit')
  const panel = panelModeFromRoute(
    Boolean(createMatch),
    editMatch?.params.valueId,
  )
  const panelValue = useCompanyValue(
    panel && panel.kind === 'edit' ? panel.valueId : '',
  )

  const visible = useMemo(
    () =>
      hideDisabled
        ? values.filter((value) => value.status === 'enabled')
        : values,
    [hideDisabled, values],
  )

  const selectedId = panel?.kind === 'edit' ? panel.valueId : null

  const closePanel = () => {
    navigate(valuesLibraryPath())
  }

  const panelTitle =
    panel?.kind === 'create' ? 'Create value' : 'Edit value'

  return (
    <div className="pd-reviews-skills">
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Values totals"
      >
        <div className="pd-people__summary-btn is-active" aria-current="true">
          <span className="pd-people__summary-label">Values</span>
          <span className="pd-people__summary-value">{values.length}</span>
        </div>
      </div>

      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <Switch
            label="Hide disabled values"
            checked={hideDisabled}
            onChange={(event) => setHideDisabled(event.target.checked)}
          />
        </div>
        <div className="pd-people__bar-end">
          {canWrite ? (
            <Link
              to={valueCreatePath()}
              className="pd-btn pd-btn--primary pd-btn--pill"
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
              Create new value
            </Link>
          ) : null}
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="values-heading"
      >
        <h2 id="values-heading" className="pd-sr-only">
          Values
        </h2>
        {visible.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-people__empty-panel"
              icon={Heart}
              title={values.length === 0 ? 'No Values Yet' : 'No Enabled Values'}
              description={
                values.length === 0
                  ? 'Company values are added by an admin, then graded on the annual scorecard.'
                  : 'Turn off “Hide disabled values” to see disabled ones.'
              }
              action={
                values.length === 0 && canWrite ? (
                  <Link
                    to={valueCreatePath()}
                    className="pd-people__create-btn"
                  >
                    <Plus size={18} strokeWidth={2} aria-hidden />
                    Create New Value
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
            <ResizableTable
              className="pd-people__table pd-reviews-skills__table"
              storageKey="reviews-values-v4"
              columns={[
                { id: 'name', label: 'Value Name', grow: true },
                { id: 'description', label: 'Description', grow: true },
                { id: 'status', label: 'Status' },
              ]}
              fitKey={visible.length}
            >
              <tbody>
                {visible.map((value) => {
                  const isSelected = selectedId === value.id
                  const openValue = () => {
                    if (!canWrite) return
                    navigate(valueEditPath(value.id))
                  }
                  return (
                    <tr
                      key={value.id}
                      className={[
                        'pd-people__row-link',
                        isSelected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-selected={isSelected || undefined}
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={openValue}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openValue()
                        }
                      }}
                    >
                      <td>
                        <span className="pd-reviews-skills__name">
                          {value.name}
                        </span>
                      </td>
                      <td>{value.description || '—'}</td>
                      <td>
                        <span
                          className={
                            value.status === 'enabled'
                              ? 'pd-people__status pd-people__status--active'
                              : 'pd-people__status pd-people__status--inactive'
                          }
                        >
                          {value.status === 'enabled' ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>

      {panel ? (
        <SettingsSidePanel
          label={panelTitle}
          closeLabel="Close value panel"
          defaultWidth={480}
          onClose={closePanel}
        >
          {panel.kind === 'create' ? (
            canWrite ? (
              <ValueFormFields
                mode="create"
                onCancel={closePanel}
                onSaved={closePanel}
              />
            ) : (
              <p className="pd-reviews-flow__hint">
                Only an admin with write access can add values.
              </p>
            )
          ) : canWrite ? (
            <ValueFormFields
              key={panel.valueId}
              mode="edit"
              existing={panelValue}
              onCancel={closePanel}
              onSaved={closePanel}
            />
          ) : (
            <p className="pd-reviews-flow__hint">
              Only an admin with write access can change values.
            </p>
          )}
        </SettingsSidePanel>
      ) : null}
    </div>
  )
}
