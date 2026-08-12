import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Avatar, ListboxSelect } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import {
  buildCatalogOptions,
  DEPARTMENT_OPTIONS,
  DIVISION_OPTIONS,
  JOB_GRADE_OPTIONS,
  JOB_TITLE_OPTIONS,
  TEAM_OPTIONS,
  type CatalogOption,
} from '@/lib/employees/catalog'
import {
  createEmployee,
  getEmployee,
  listEmployees,
  subscribeEmployeesStore,
  updateEmployee,
} from '@/lib/employees/store'
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/employees/types'
import '@/styles/layout-people.css'

type FormMode = 'create' | 'edit'

type FormState = CreateEmployeeInput & { isActive: boolean }

const EMPTY_FORM: FormState = {
  employeeId: 0,
  fullName: '',
  email: '',
  startDate: '',
  jobTitle: '',
  department: '',
  team: '',
  division: '',
  reportsToName: '',
  departmentHeadName: '',
  hrbpName: '',
  jobGrade: '',
  managerEmail: '',
  isActive: true,
}

type FieldKey = keyof FormState

type Field = {
  key: FieldKey
  label: string
  type?:
    | 'text'
    | 'email'
    | 'date'
    | 'number'
    | 'status'
    | 'select'
    | 'reportsTo'
    | 'departmentHead'
  required?: boolean
  placeholder?: string
  readOnly?: boolean
  optionsKey?: 'jobTitle' | 'jobGrade' | 'department' | 'team' | 'division'
}

/** Flat equal-width fields — keep a consistent column rhythm. */
const FIELDS: Field[] = [
  {
    key: 'employeeId',
    label: 'Employee ID',
    type: 'number',
    required: true,
    placeholder: '101',
  },
  {
    key: 'isActive',
    label: 'Status',
    type: 'status',
  },
  {
    key: 'fullName',
    label: 'Name',
    required: true,
    placeholder: 'Full name',
  },
  {
    key: 'email',
    label: 'Work email',
    type: 'email',
    required: true,
    placeholder: 'name@nextventures.io',
  },
  {
    key: 'startDate',
    label: 'Start date',
    type: 'date',
  },
  {
    key: 'jobTitle',
    label: 'Job title',
    type: 'select',
    optionsKey: 'jobTitle',
    placeholder: 'Select job title',
  },
  {
    key: 'jobGrade',
    label: 'Job grade',
    type: 'select',
    optionsKey: 'jobGrade',
    placeholder: 'Select job grade',
  },
  {
    key: 'department',
    label: 'Department',
    type: 'select',
    optionsKey: 'department',
    placeholder: 'Select department',
  },
  {
    key: 'team',
    label: 'Team',
    type: 'select',
    optionsKey: 'team',
    placeholder: 'Select team',
  },
  {
    key: 'division',
    label: 'Division',
    type: 'select',
    optionsKey: 'division',
    placeholder: 'Select division',
  },
  {
    key: 'reportsToName',
    label: 'Reports to',
    type: 'reportsTo',
    placeholder: 'Select manager',
  },
  {
    key: 'departmentHeadName',
    label: 'Department head',
    type: 'departmentHead',
    placeholder: 'Select department head',
  },
  {
    key: 'hrbpName',
    label: 'HRBP',
    placeholder: 'Not set yet',
    readOnly: true,
  },
]

function toUpdateInput(form: FormState): UpdateEmployeeInput {
  return {
    employeeId: Number(form.employeeId),
    fullName: form.fullName,
    email: form.email,
    startDate: form.startDate,
    jobTitle: form.jobTitle,
    department: form.department,
    team: form.team,
    division: form.division,
    reportsToName: form.reportsToName,
    departmentHeadName: form.departmentHeadName,
    hrbpName: form.hrbpName,
    jobGrade: form.jobGrade,
    managerEmail: form.managerEmail,
    isActive: form.isActive,
  }
}

function fieldValue(form: FormState, key: FieldKey): string {
  if (key === 'employeeId') {
    return form.employeeId === 0 ? '' : String(form.employeeId)
  }
  if (key === 'isActive') return form.isActive ? 'active' : 'inactive'
  return String(form[key] ?? '')
}

function FormField({
  field,
  form,
  index,
  options,
  reportsToValue,
  departmentHeadValue,
  onChange,
  onReportsToChange,
  onDepartmentHeadChange,
}: {
  field: Field
  form: FormState
  index: number
  options?: CatalogOption[]
  reportsToValue?: string
  departmentHeadValue?: string
  onChange: (key: FieldKey, value: string) => void
  onReportsToChange?: (employeeId: string) => void
  onDepartmentHeadChange?: (employeeId: string) => void
}) {
  const fieldId = useId()

  const isLocked = Boolean(field.readOnly)

  return (
    <div
      className={
        isLocked ? 'pd-people__field pd-people__field--locked' : 'pd-people__field'
      }
      style={{ ['--pd-field-i' as string]: String(index) }}
    >
      <label className="pd-people__label" htmlFor={fieldId}>
        {field.label}
        {field.required ? (
          <span className="pd-people__required" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {field.type === 'status' ? (
        <ListboxSelect
          id={fieldId}
          name={field.key}
          aria-label={field.label}
          value={fieldValue(form, field.key)}
          onValueChange={(next) => onChange(field.key, next)}
          allowEmpty={false}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      ) : field.type === 'select' ? (
        <ListboxSelect
          id={fieldId}
          name={field.key}
          aria-label={field.label}
          value={fieldValue(form, field.key)}
          onValueChange={(next) => onChange(field.key, next)}
          placeholder={field.placeholder ?? 'Select…'}
          options={options ?? []}
        />
      ) : field.type === 'reportsTo' ? (
        <ListboxSelect
          id={fieldId}
          name={field.key}
          aria-label={field.label}
          value={reportsToValue ?? ''}
          onValueChange={(next) => onReportsToChange?.(next)}
          placeholder={field.placeholder ?? 'Select manager'}
          options={options ?? []}
        />
      ) : field.type === 'departmentHead' ? (
        <ListboxSelect
          id={fieldId}
          name={field.key}
          aria-label={field.label}
          value={departmentHeadValue ?? ''}
          onValueChange={(next) => onDepartmentHeadChange?.(next)}
          placeholder={field.placeholder ?? 'Select department head'}
          options={options ?? []}
        />
      ) : isLocked ? (
        <div
          id={fieldId}
          className="pd-people__readonly"
          aria-readonly="true"
          data-empty={!fieldValue(form, field.key) || undefined}
        >
          {fieldValue(form, field.key) || '—'}
        </div>
      ) : (
        <input
          id={fieldId}
          className="pd-people__input"
          type={field.type ?? 'text'}
          name={field.key}
          required={field.required}
          placeholder={field.placeholder}
          value={fieldValue(form, field.key)}
          min={field.type === 'number' ? 1 : undefined}
          step={field.type === 'number' ? 1 : undefined}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      )}
    </div>
  )
}

export default function EmployeeFormPage({ mode }: { mode: FormMode }) {
  const navigate = useNavigate()
  const { employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)
  const [tick, setTick] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hydrated, setHydrated] = useState(mode === 'create')

  useEffect(() => {
    return subscribeEmployeesStore(() => setTick((n) => n + 1))
  }, [])

  const employees = useMemo(() => {
    void tick
    return listEmployees()
  }, [tick])

  const existing = useMemo(() => {
    if (mode !== 'edit') return null
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null
    return getEmployee(employeeId)
  }, [mode, employeeId, employees])

  const catalogOptions = useMemo(() => {
    const extras = {
      jobTitle: employees.map((e) => e.jobTitle),
      jobGrade: employees.map((e) => e.jobGrade),
      department: employees.map((e) => e.department),
      team: employees.map((e) => e.team),
      division: employees.map((e) => e.division),
    }
    return {
      jobTitle: buildCatalogOptions(JOB_TITLE_OPTIONS, [
        ...extras.jobTitle,
        form.jobTitle,
      ]),
      jobGrade: buildCatalogOptions(JOB_GRADE_OPTIONS, [
        ...extras.jobGrade,
        form.jobGrade,
      ]),
      department: buildCatalogOptions(DEPARTMENT_OPTIONS, [
        ...extras.department,
        form.department,
      ]),
      team: buildCatalogOptions(TEAM_OPTIONS, [...extras.team, form.team]),
      // Divisions are a fixed catalog in platform.divisions — do not invent extras.
      division: buildCatalogOptions(DIVISION_OPTIONS, [form.division].filter(Boolean)),
    }
  }, [employees, form.jobTitle, form.jobGrade, form.department, form.team, form.division])

  const reportsToOptions = useMemo(() => {
    const excludeId = mode === 'edit' ? employeeId : undefined
    return employees
      .filter((person) => person.employeeId !== excludeId)
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((person) => ({
        value: String(person.employeeId),
        label: `${person.fullName} (${person.email})`,
      }))
  }, [employees, mode, employeeId])

  const reportsToValue = useMemo(() => {
    const excludeId = mode === 'edit' ? employeeId : undefined
    const byEmail = form.managerEmail.trim().toLowerCase()
    if (byEmail) {
      const match = employees.find(
        (person) =>
          person.email.toLowerCase() === byEmail &&
          person.employeeId !== excludeId,
      )
      if (match) return String(match.employeeId)
    }
    const byName = form.reportsToName.trim().toLowerCase()
    if (byName) {
      const match = employees.find(
        (person) =>
          person.fullName.trim().toLowerCase() === byName &&
          person.employeeId !== excludeId,
      )
      if (match) return String(match.employeeId)
    }
    return ''
  }, [employees, form.managerEmail, form.reportsToName, mode, employeeId])

  useEffect(() => {
    if (mode !== 'edit') return
    if (!existing) {
      setHydrated(true)
      return
    }
    setForm({
      employeeId: existing.employeeId,
      fullName: existing.fullName,
      email: existing.email,
      startDate: existing.startDate,
      jobTitle: existing.jobTitle,
      department: existing.department,
      team: existing.team,
      division: existing.division,
      reportsToName: existing.reportsToName,
      departmentHeadName: existing.departmentHeadName,
      hrbpName: existing.hrbpName,
      jobGrade: existing.jobGrade,
      managerEmail: existing.managerEmail,
      isActive: existing.isActive,
    })
    setHydrated(true)
  }, [mode, existing])

  const departmentHeadValue = useMemo(() => {
    const excludeId = mode === 'edit' ? employeeId : undefined
    const byName = form.departmentHeadName.trim().toLowerCase()
    if (!byName) return ''
    const match = employees.find(
      (person) =>
        person.fullName.trim().toLowerCase() === byName &&
        person.employeeId !== excludeId,
    )
    return match ? String(match.employeeId) : ''
  }, [employees, form.departmentHeadName, mode, employeeId])

  if (mode === 'edit') {
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return <Navigate to="/people" replace />
    }
    if (hydrated && !existing) {
      return <Navigate to="/people" replace />
    }
  }

  const backTo = mode === 'edit' ? `/people/${employeeId}` : '/people'
  const previewName =
    form.fullName.trim() || (mode === 'edit' ? 'Employee' : 'New employee')
  const previewRole = [form.jobTitle.trim(), form.department.trim()]
    .filter(Boolean)
    .join(' · ')

  const onFieldChange = (key: FieldKey, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]:
        key === 'employeeId'
          ? value === ''
            ? 0
            : Number(value)
          : key === 'isActive'
            ? value === 'active'
            : value,
    }))
  }

  const onReportsToChange = (selectedId: string) => {
    if (!selectedId) {
      setForm((prev) => ({
        ...prev,
        reportsToName: '',
        managerEmail: '',
      }))
      return
    }
    const manager = getEmployee(Number(selectedId))
    if (!manager) return
    setForm((prev) => ({
      ...prev,
      reportsToName: manager.fullName,
      managerEmail: manager.email,
    }))
  }

  const onDepartmentHeadChange = (selectedId: string) => {
    if (!selectedId) {
      setForm((prev) => ({ ...prev, departmentHeadName: '' }))
      return
    }
    const head = getEmployee(Number(selectedId))
    if (!head) return
    setForm((prev) => ({
      ...prev,
      departmentHeadName: head.fullName,
    }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    void (async () => {
      if (mode === 'create') {
        const result = await createEmployee({
          ...form,
          employeeId: Number(form.employeeId),
          isActive: form.isActive,
        })
        if (!result.ok) {
          setError(result.error)
          setBusy(false)
          return
        }
        navigate(`/people/${result.employee.employeeId}`, { replace: true })
        return
      }

      const result = await updateEmployee(employeeId, toUpdateInput(form))
      if (!result.ok) {
        setError(result.error)
        setBusy(false)
        return
      }
      navigate(`/people/${result.employee.employeeId}`, { replace: true })
    })()
  }

  return (
    <div
      className="pd-page pd-people pd-people--form"
      aria-label={mode === 'edit' ? 'Edit employee' : 'Create employee'}
    >
      {mode === 'edit' && !hydrated ? (
        <p className="pd-people__empty">Loading employee…</p>
      ) : (
        <form className="pd-people__form-layout" onSubmit={onSubmit} noValidate>
          <div className="pd-people__form-toolbar">
            <Link to={backTo} className="pd-people__back pd-people__back--toolbar">
              <ArrowLeft size={16} strokeWidth={2} aria-hidden />
              {mode === 'edit' ? 'Profile' : 'People'}
            </Link>
            <div className="pd-people__form-toolbar-end">
              {error ? (
                <p
                  className="pd-people__message pd-people__message--error"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <Link to={backTo} className="pd-people__cancel">
                Cancel
              </Link>
              <button
                type="submit"
                className="pd-people__submit pd-people__submit--with-icon"
                disabled={busy}
              >
                <Save size={16} strokeWidth={1.85} aria-hidden />
                {mode === 'edit' ? 'Save changes' : 'Add employee'}
              </button>
            </div>
          </div>

          <div className="pd-people__form-shell">
            <aside className="pd-people__form-aside">
              <Avatar
                name={previewName}
                size="lg"
                className="pd-people__form-avatar"
                style={avatarStyle(previewName)}
              />
              <div className="pd-people__form-aside-copy">
                <p className="pd-people__form-kicker">
                  {mode === 'edit' ? 'Editing' : 'Creating'}
                </p>
                <h1 className="pd-people__form-title">{previewName}</h1>
                {previewRole ? (
                  <p className="pd-people__form-subtitle">{previewRole}</p>
                ) : null}
              </div>
            </aside>

            <div className="pd-people__form-main">
              <div className="pd-people__grid">
                {FIELDS.map((field, index) => (
                  <FormField
                    key={field.key}
                    field={field}
                    form={form}
                    index={index}
                    options={
                      field.type === 'reportsTo' ||
                      field.type === 'departmentHead'
                        ? reportsToOptions
                        : field.optionsKey
                          ? catalogOptions[field.optionsKey]
                          : undefined
                    }
                    reportsToValue={
                      field.type === 'reportsTo' ? reportsToValue : undefined
                    }
                    departmentHeadValue={
                      field.type === 'departmentHead'
                        ? departmentHeadValue
                        : undefined
                    }
                    onChange={onFieldChange}
                    onReportsToChange={onReportsToChange}
                    onDepartmentHeadChange={onDepartmentHeadChange}
                  />
                ))}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
