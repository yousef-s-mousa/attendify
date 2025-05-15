'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { Html5QrcodeScanner } from 'html5-qrcode';

function QRScannerModal({ onScan, onClose }) {
  useEffect(() => {
    let scanner = null;
    const initializeScanner = async () => {
      try {
        // Check if we're on a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');

        // Mobile-specific configuration
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
          rememberLastUsedCamera: true,
          videoConstraints: {
            facingMode: { exact: "environment" }, // Force back camera on mobile
            width: { min: 360, ideal: 640, max: 1920 },
            height: { min: 240, ideal: 480, max: 1080 }
          }
        };

        console.log('Initializing QR scanner...');
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          config,
          false
        );

        console.log('Rendering QR scanner...');
        await scanner.render(
          (result) => {
            console.log('QR code scanned:', result);
            onScan(result);
            scanner.clear();
            onClose();
          },
          (error) => {
            // Ignore "QR code not found" errors as they're normal during scanning
            if (error && !error.includes("QR code not found")) {
              console.error('QR Scan Error:', error);
              toast.error('Error scanning QR code');
            }
          }
        );
        console.log('QR scanner rendered successfully');
      } catch (error) {
        console.error('Scanner initialization error:', error);
        if (error.name === 'NotAllowedError') {
          toast.error('Please allow camera access in your browser settings');
        } else if (error.name === 'NotFoundError') {
          toast.error('No camera found. Please make sure your camera is working');
        } else {
          toast.error('Failed to start camera. Please try again');
        }
        onClose();
      }
    };

    initializeScanner();

    return () => {
      if (scanner) {
        console.log('Cleaning up QR scanner...');
        scanner.clear().catch(error => {
          console.error('Error cleaning up scanner:', error);
        });
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-[95vw] max-w-[400px]">
        <button
          className="mb-4 text-red-600 font-bold text-lg"
          onClick={onClose}
        >
          Close
        </button>
        <div id="qr-reader" style={{ width: '100%', minHeight: '300px' }} />
        <p className="mt-2 text-gray-700 text-center">Position the QR code within the frame</p>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState({});
  const [dayEnded, setDayEnded] = useState(false);
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
    checkDayEnded();
  }, [selectedDate]);

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
    } catch (error) {
      toast.error('Error fetching students');
    }
  };

  const fetchAttendance = async () => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate)
      );
      const querySnapshot = await getDocs(q);
      const attendanceData = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        attendanceData[data.studentId] = data.status;
      });
      setAttendance(attendanceData);
    } catch (error) {
      toast.error('Error fetching attendance');
    }
  };

  const checkDayEnded = async () => {
    // Use a special doc in Firestore to track if the day is ended
    const endDoc = await getDocs(query(collection(db, 'attendance_end'), where('date', '==', selectedDate)));
    setDayEnded(!endDoc.empty);
  };

  const handleAttendanceChange = async (studentId, status) => {
    if (dayEnded) return;
    try {
      const attendanceData = {
        studentId,
        date: selectedDate,
        status,
        timestamp: new Date()
      };
      // Use setDoc with composite key to ensure one record per student/date
      await setDoc(doc(db, 'attendance', `${selectedDate}_${studentId}`), attendanceData);
      setAttendance(prev => ({
        ...prev,
        [studentId]: status
      }));
      toast.success('Attendance marked successfully');
    } catch (error) {
      toast.error('Error marking attendance');
    }
  };

  const handleEndDay = async () => {
    try {
      // Mark all unmarked students as absent (or update if already present)
      const absentPromises = students
        .filter((student) => attendance[student.id] !== 'present')
        .map((student) =>
          setDoc(doc(db, 'attendance', `${selectedDate}_${student.id}`), {
            studentId: student.id,
            date: selectedDate,
            status: 'absent',
            timestamp: new Date()
          })
        );
      await Promise.all(absentPromises);
      // Mark the day as ended
      await setDoc(doc(db, 'attendance_end', selectedDate), {
        date: selectedDate,
        ended: true,
        endedAt: new Date()
      });
      setDayEnded(true);
      fetchAttendance();
      toast.success('Day ended. All unmarked students are marked absent.');
    } catch (error) {
      toast.error('Error ending the day');
    }
  };

  const handleScanQR = (data) => {
    if (data) {
      // Find student by phone
      const student = students.find(s => s.phone === data);
      if (student) {
        handleAttendanceChange(student.id, 'present');
        toast.success(`Marked ${student.name} as present!`);
      } else {
        toast.error('No student found with this phone number.');
      }
      setShowScanner(false);
    }
  };

  const handleErrorQR = (err) => {
    toast.error('QR Scan Error');
    setShowScanner(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-3xl font-extrabold text-gray-800">Mark Attendance</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none w-full md:w-auto"
        />
      </div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <button
          onClick={handleEndDay}
          disabled={dayEnded}
          className={`w-full md:w-auto bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-2 rounded-lg shadow font-semibold transition hover:from-red-600 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          End Day
        </button>
        {dayEnded && (
          <span className="text-green-700 font-semibold">Day ended. Attendance is now locked.</span>
        )}
        <button
          className="w-full md:w-auto bg-blue-500 text-white px-6 py-2 rounded-lg shadow font-semibold transition hover:bg-blue-600"
          onClick={() => setShowScanner(true)}
        >
          Scan QR
        </button>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-1/2 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map((student) => (
              <tr key={student.id} className="hover:bg-blue-50 transition">
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-900">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleAttendanceChange(student.id, 'present')}
                      className={`px-4 py-2 rounded-lg font-semibold shadow transition border-2 border-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                        attendance[student.id] === 'present'
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                      }`}
                      disabled={dayEnded}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleAttendanceChange(student.id, 'absent')}
                      className={`px-4 py-2 rounded-lg font-semibold shadow transition border-2 border-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 ${
                        attendance[student.id] === 'absent'
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                      }`}
                      disabled={dayEnded}
                    >
                      Absent
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showScanner && (
        <QRScannerModal
          onScan={handleScanQR}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
} 