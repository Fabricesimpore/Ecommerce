import Link from 'next/link'

export default function TestPage() {
  return (
    <div>
      <h1>Test Page Works!</h1>
      <p>If you can see this, the frontend is running correctly.</p>
      <Link href="/">Go to Homepage</Link>
    </div>
  )
}