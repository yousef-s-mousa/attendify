'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { format } from 'date-fns';

export default function HomePage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const totalStudents = studentsSnapshot.size;

      // Get today's attendance
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', today)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      let presentToday = 0;
      let absentToday = 0;
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'present') presentToday++;
        if (data.status === 'absent') absentToday++;
      });

      setStats({
        totalStudents,
        presentToday,
        absentToday,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Total Students</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
          <Link href="/students" className="text-blue-500 hover:text-blue-700 mt-2 inline-block">
            View All Students →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Present Today</h2>
          <p className="text-3xl font-bold text-green-600">{stats.presentToday}</p>
          <Link href="/attendance" className="text-blue-500 hover:text-blue-700 mt-2 inline-block">
            Mark Attendance →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Absent Today</h2>
          <p className="text-3xl font-bold text-red-600">{stats.absentToday}</p>
          <Link href="/dates" className="text-blue-500 hover:text-blue-700 mt-2 inline-block">
            View Attendance History →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link
              href="/students"
              className="block w-full bg-blue-500 text-white text-center py-2 rounded hover:bg-blue-600"
        >
              Manage Students
            </Link>
            <Link
              href="/attendance"
              className="block w-full bg-green-500 text-white text-center py-2 rounded hover:bg-green-600"
            >
              Mark Attendance
            </Link>
            <Link
              href="/dates"
              className="block w-full bg-purple-500 text-white text-center py-2 rounded hover:bg-purple-600"
            >
              View Attendance History
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Attendance Overview</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Attendance Rate Today</span>
              <span className="font-semibold">
                {stats.totalStudents > 0
                  ? `${Math.round((stats.presentToday / stats.totalStudents) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{
                  width: `${(stats.presentToday / stats.totalStudents) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
