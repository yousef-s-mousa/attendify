'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DatesPage() {
  const [dates, setDates] = useState([]);

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      const q = query(
        collection(db, 'attendance'),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      // Get unique dates and count attendance
      const dateMap = new Map();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!dateMap.has(data.date)) {
          dateMap.set(data.date, {
            date: data.date,
            present: 0,
            absent: 0
          });
        }
        const dateData = dateMap.get(data.date);
        dateData[data.status]++;
      });

      const datesList = Array.from(dateMap.values());
      setDates(datesList);
    } catch (error) {
      toast.error('Error fetching dates');
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-4">Attendance Dates</h1>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Present</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {dates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">No attendance records found.</td>
                  </tr>
                )}
                {dates.map((dateData) => (
                  <tr key={dateData.date} className="hover:bg-blue-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-900">
                      {format(parseISO(dateData.date), 'MMMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">{dateData.present}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600 font-bold">{dateData.absent}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dates/${dateData.date}`}
                        className="inline-block bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold transition"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 