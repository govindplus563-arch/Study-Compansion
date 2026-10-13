import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p>
        That page does not exist. <Link to="/">Go to the Dashboard</Link>.
      </p>
    </>
  )
}
