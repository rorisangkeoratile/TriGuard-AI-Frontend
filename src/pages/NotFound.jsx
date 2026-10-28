import { Link } from 'react-router-dom'
import { Logo } from '../components/ui.jsx'

export default function NotFound() {
  return (
    <div className="notfound">
      <Logo />
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link className="btn btn-primary" to="/">Back to home</Link>
    </div>
  )
}
