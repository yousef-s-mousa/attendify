'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { QRCode } from 'react-qrcode-logo';

export default function StudentProfilePage({ params }) {
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [filter, setFilter] = useState('all'); // all, present, absent
  const qrRef = useRef(null);

  useEffect(() => {
    fetchStudent();
    fetchAttendance();
  }, [params.id]);

  const fetchStudent = async () => {
    try {
      const docRef = doc(db, 'students', params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStudent({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error('Student not found');
      }
    } catch (error) {
      toast.error('Error fetching student');
    }
  };

  const fetchAttendance = async () => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', params.id)
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

  const filteredAttendance = attendance.filter(record => {
    if (filter === 'all') return true;
    return record.status === filter;
  });

  const attendanceStats = {
    total: attendance.length,
    present: attendance.filter(record => record.status === 'present').length,
    absent: attendance.filter(record => record.status === 'absent').length,
    averageRating: calculateAverageRating(),
  };

  function calculateAverageRating() {
    const presentWithRatings = attendance.filter(record => 
      record.status === 'present' && record.rating && record.rating > 0
    );
    
    if (presentWithRatings.length === 0) return 0;
    
    const sum = presentWithRatings.reduce((total, record) => total + record.rating, 0);
    return (sum / presentWithRatings.length).toFixed(1);
  }

  const downloadQRCode = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `${student.name}-qr-code.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-gray-800">Student Profile</h1>
        <Link
          href="/students"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
        >
          <ArrowLeftIcon className="w-5 h-5" /> Back to Students
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-4">
        <h2 className="text-xl font-bold mb-4 text-blue-700">Student Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-semibold text-lg text-blue-900">{student.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="font-semibold text-lg text-blue-900">{student.phone}</p>
          </div>
          
          <div>
            <p className="text-gray-500">Father Phone</p>
            <p className="font-semibold text-lg text-blue-900">{student.fatherPhone || 'Not provided'}</p>
          </div>
          
          <div>
            <p className="text-gray-500">Mother Phone</p>
            <p className="font-semibold text-lg text-blue-900">{student.motherPhone || 'Not provided'}</p>
          </div>
          
          <div>
            <p className="text-gray-500">Date of Birth</p>
            <p className="font-semibold text-lg text-blue-900">
              {student.dateOfBirth ? format(parseISO(student.dateOfBirth), 'MMMM d, yyyy') : 'Not provided'}
            </p>
          </div>
          
          <div>
            <p className="text-gray-500">Year of Study</p>
            <p className="font-semibold text-lg text-blue-900">{student.yearOfStudy || 'Not provided'}</p>
          </div>
          
          <div>
            <p className="text-gray-500">Church Father&apos;s Name</p>
            <p className="font-semibold text-lg text-blue-900">{student.churchFatherName || 'Not provided'}</p>
          </div>
          
          <div>
            <p className="text-gray-500">Address</p>
            <p className="font-semibold text-lg text-blue-900">{student.address || 'Not provided'}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center">
          <div className="bg-gray-100 p-4 rounded-lg shadow" ref={qrRef}>
            <QRCode value={student.phone} size={128} />
          </div>
          <div className="mt-4 flex gap-2">
            <p className="text-sm text-gray-700">Scan this QR code for attendance</p>
            <button
              onClick={downloadQRCode}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Download QR
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-4">
        <h2 className="text-xl font-bold mb-4 text-blue-700">Attendance Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600">Total Days</p>
            <p className="text-2xl font-bold">{attendanceStats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-green-600">Present</p>
            <p className="text-2xl font-bold text-green-700">{attendanceStats.present}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <p className="text-red-600">Absent</p>
            <p className="text-2xl font-bold text-red-700">{attendanceStats.absent}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-blue-600">Avg. Rating</p>
            <p className="text-2xl font-bold text-blue-700">{attendanceStats.averageRating}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-700">Attendance History</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded p-2 focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredAttendance.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">No attendance records found.</td>
              </tr>
            )}
            {filteredAttendance.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(parseISO(record.date), 'MMMM d, yyyy')}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 