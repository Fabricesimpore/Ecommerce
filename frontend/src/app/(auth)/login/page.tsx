import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  )
}

export const metadata = {
  title: 'Sign In - E-Commerce Platform',
  description: 'Sign in to your account to access your dashboard and manage your orders.',
}