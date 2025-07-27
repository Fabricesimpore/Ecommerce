import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <RegisterForm />
    </div>
  )
}

export const metadata = {
  title: 'Create Account - E-Commerce Platform',
  description: 'Create your account to start shopping, selling, or delivering on our platform.',
}