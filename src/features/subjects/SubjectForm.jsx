import { useState } from 'react'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/Field'
import { useStore } from '../../data/store'
import { addSubject, updateSubject } from '../../data/repositories'
import { validateSubject } from '../../services/validators'

export default function SubjectForm({ subject = null, onClose }) {
  const { data, update, notify } = useStore()
  const [name, setName] = useState(subject?.name ?? '')
  const [errors, setErrors] = useState({})

  function submit(e) {
    e.preventDefault()
    const found = validateSubject({ name }, data, subject?.id)
    setErrors(found)
    if (Object.keys(found).length) return
    update((d) => (subject ? updateSubject(d, subject.id, { name }) : addSubject(d, { name })))
    notify(subject ? 'Subject updated.' : 'Subject added.')
    onClose()
  }

  return (
    <Modal title={subject ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Subject name" error={errors.name}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <FormActions onCancel={onClose} submitLabel={subject ? 'Save changes' : 'Add subject'} />
      </form>
    </Modal>
  )
}
