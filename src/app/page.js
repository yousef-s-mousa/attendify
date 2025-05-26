'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { UserGroupIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { getStats } from '@/lib/db';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        setStats(data);
      } catch (error) {
        toast.error('Error loading stats');
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Attendify
        </h1>
        <p className="text-xl text-gray-600">
          Student Attendance Management System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Students Card */}
        <Link href="/students" className="group">
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Students</h2>
              <UserGroupIcon className="w-8 h-8 text-blue-500 group-hover:text-blue-600" />
            </div>
            <p className="text-gray-600">
              Manage student information and track their attendance records
            </p>
          </div>
        </Link>

        {/* Attendance Card */}
        <Link href="/attendance" className="group">
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Attendance</h2>
              <CalendarIcon className="w-8 h-8 text-green-500 group-hover:text-green-600" />
            </div>
            <p className="text-gray-600">
              Mark daily attendance and rate student participation
            </p>
          </div>
        </Link>

        {/* History Card */}
        <Link href="/dates" className="group">
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">History</h2>
              <ChartBarIcon className="w-8 h-8 text-purple-500 group-hover:text-purple-600" />
            </div>
            <p className="text-gray-600">
              View attendance history and generate reports
            </p>
          </div>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg animate-pulse">
              <div className="h-4 bg-blue-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-blue-200 rounded w-1/4"></div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg animate-pulse">
              <div className="h-4 bg-green-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-green-200 rounded w-1/4"></div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg animate-pulse">
              <div className="h-4 bg-purple-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-purple-200 rounded w-1/4"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Total Students</p>
              <p className="text-2xl font-bold text-blue-700">{stats.totalStudents}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Present Today</p>
              <p className="text-2xl font-bold text-green-700">{stats.presentToday}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Average Rating</p>
              <p className="text-2xl font-bold text-purple-700">{stats.averageRating}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
