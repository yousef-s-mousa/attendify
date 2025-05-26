'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function DateDetailsPage() {
  const params = useParams();
  const dateParam = params.date;
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState({});

  useEffect(() => {
    fetchAttendance();
    fetchStudents();
    // eslint-disable-next-line
  }, [dateParam]);

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsMap = {};
      querySnapshot.docs.forEach(doc => {
        studentsMap[doc.id] = doc.data();
      });
      setStudents(studentsMap);
    } catch (error) {
      toast.error('Error fetching students');
    }
  };

  const fetchAttendance = async () => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', dateParam)
      );
      const querySnapshot = await getDocs(q);
      const attendanceList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAttendance(attendanceList);
    } catch (error) {
      toast.error('Error fetching attendance');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-gray-800">
          Attendance for {format(parseISO(dateParam), 'MMMM d, yyyy')}
        </h1>
        <Link
          href="/dates"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
        >
          <ArrowLeftIcon className="w-5 h-5" /> Back to Dates
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Year</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {attendance.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">No attendance records found.</td>
              </tr>
            )}
            {attendance.map((record) => {
              const student = students[record.studentId];
              return (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-900">
                    {student?.name || 'Unknown Student'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {student?.yearOfStudy || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.status === 'present' && record.rating ? (
                      <span className={`font-bold ${
                        record.rating >= 8 ? 'text-green-600' : 
                        record.rating >= 5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {record.rating}/10
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.timestamp && record.timestamp.toDate
                      ? format(record.timestamp.toDate(), 'h:mm a')
                      : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 