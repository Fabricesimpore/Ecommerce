import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            Your Local
            <span className="text-blue-600"> Marketplace</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Connect buyers, vendors, and delivery drivers across Burkina Faso. 
            Shop local products, start your business, or earn as a delivery driver.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button size="lg" className="w-full sm:w-auto">
                🛍️ Browse Products
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Become a Vendor
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-4">🛍️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">For Buyers</h3>
            <p className="text-gray-600 mb-4">
              Discover local products, shop safely, and get fast delivery to your doorstep.
            </p>
            <Link href="/products">
              <Button variant="outline" size="sm" className="w-full">
                Start Shopping
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-4">🏪</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">For Vendors</h3>
            <p className="text-gray-600 mb-4">
              List your products, manage inventory, and grow your business online.
            </p>
            <Link href="/register">
              <Button variant="outline" size="sm" className="w-full">
                Become a Vendor
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-4">🚚</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">For Drivers</h3>
            <p className="text-gray-600 mb-4">
              Earn money by delivering orders and helping your community.
            </p>
            <Link href="/register">
              <Button variant="outline" size="sm" className="w-full">
                Join as Driver
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Navigation for Testing */}
        <div className="mt-16 bg-blue-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
            🧪 Test the Platform
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Link href="/products">
              <Button variant="outline" className="w-full">
                🛍️ Products Page
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                📝 Login Page
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                🆕 Register Page
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                🏠 Dashboard (Protected)
              </Button>
            </Link>
          </div>
          <p className="text-center text-sm text-gray-600 mt-4">
            Authentication system ready for backend connection
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 E-Commerce Platform Burkina Faso. Built with Next.js 14 & TypeScript.</p>
            <div className="mt-4 flex justify-center space-x-6">
              <span className="text-sm">✅ Backend API Ready</span>
              <span className="text-sm">✅ Frontend Connected</span>
              <span className="text-sm">✅ Authentication System</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
