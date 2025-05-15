'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => pathname === path;

  const navItems = [
    { name: 'Students', path: '/students' },
    { name: 'Attendance', path: '/attendance' },
    { name: 'Dates', path: '/dates' },
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-gray-800">Ava Antonious</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-150
                  ${isActive(item.path)
                    ? 'bg-blue-50 text-blue-700 underline underline-offset-4'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-blue-700'}
                `}
              >
                {item.name}
              </Link>
            ))}
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
        </div>
        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden mt-2 pb-2">
            <div className="flex flex-col space-y-1 bg-white rounded shadow">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 text-base rounded-md transition-all duration-150
                    ${isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 underline underline-offset-4'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-blue-700'}
                  `}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 