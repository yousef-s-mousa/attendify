'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { signOutUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const Navbar = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await signOutUser();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
      router.push('/login');
    }
  };

  // Don't show navbar on login page
  if (!user) return null;

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-gray-800">Attendify</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex space-x-2">
            <Link
              href="/students"
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 text-gray-900 hover:text-blue-600"
            >
              Students
            </Link>
            <Link
              href="/attendance"
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 text-gray-900 hover:text-blue-600"
            >
              Attendance
            </Link>
            <Link
              href="/dates"
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 text-gray-900 hover:text-blue-600"
            >
              History
            </Link>
          </div>
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <XMarkIcon className="w-6 h-6 text-gray-700" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-gray-700" />
            )}
          </button>
          {/* Mobile nav */}
          {menuOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg">
              <div className="flex flex-col space-y-1 p-2">
                <Link
                  href="/students"
                  className="px-4 py-2 text-base rounded-md transition-all duration-150 text-gray-900 hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Students
                </Link>
                <Link
                  href="/attendance"
                  className="px-4 py-2 text-base rounded-md transition-all duration-150 text-gray-900 hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Attendance
                </Link>
                <Link
                  href="/dates"
                  className="px-4 py-2 text-base rounded-md transition-all duration-150 text-gray-900 hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  History
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-base rounded-md transition-all duration-150 text-red-600 hover:bg-red-50 text-left"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
          {/* User menu */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 