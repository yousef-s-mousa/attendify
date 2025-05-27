'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { Html5QrcodeScanner } from 'html5-qrcode';
import ProtectedRoute from '@/components/ProtectedRoute';

function QRScannerModal({ onScan, onClose }) {
  useEffect(() => {
    let scanner = null;
    let lastErrorTime = 0;
    const ERROR_THROTTLE_MS = 8000;

    const initializeScanner = async () => {
      try {
        // Request camera permissions first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { exact: "environment" },
            width: { min: 360, ideal: 640, max: 1920 },
            height: { min: 240, ideal: 480, max: 1080 }
          } 
        });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream after getting permission

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: false,
          defaultZoomValueIfSupported: 2,
          rememberLastUsedCamera: true,
          videoConstraints: {
            facingMode: { exact: "environment" },
            width: { min: 360, ideal: 640, max: 1920 },
            height: { min: 240, ideal: 480, max: 1080 }
          }
        };

        scanner = new Html5QrcodeScanner(
          "qr-reader",
          config,
          false
        );

        await scanner.render(
          (result) => {
            onScan(result);
            scanner.clear();
            onClose();
          },
          (error) => {
            const now = Date.now();
            if (error && 
                !error.includes("QR code not found") && 
                now - lastErrorTime > ERROR_THROTTLE_MS) {
              if (!error.includes("No QR code found") && 
                  !error.includes("QR code not found")) {
                toast.error('Error scanning QR code');
              }
              lastErrorTime = now;
            }
          }
        );
      } catch (error) {
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
        scanner.clear().catch(error => {
          // Silent error handling for cleanup
        });
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Scanner Container */}
      <div className="relative w-full h-full">
        <div id="qr-reader" style={{ width: '100%', height: '100%' }} />
        
        {/* Overlay with scanning frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-72 h-72 border-2 border-blue-500 rounded-lg relative">
            {/* Corner decorations */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-blue-500"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-blue-500"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-blue-500"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-blue-500"></div>
          </div>
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 backdrop-blur-sm"
            title="Close Scanner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-white font-semibold text-lg">Scan QR Code</div>
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>

        {/* Bottom Instructions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="text-center text-white/90">
            <p className="text-lg font-medium mb-2">Position QR code within frame</p>
            <p className="text-sm text-white/70">Make sure the code is well-lit and clearly visible</p>
          </div>
        </div>

        {/* Custom Torch Button */}
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
          <button
            id="html5-qrcode-button-camera-permission"
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 backdrop-blur-sm"
            title="Toggle Flashlight"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState({});
  const [ratings, setRatings] = useState({});
  const [dayEnded, setDayEnded] = useState(false);
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);

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

  const fetchAttendance = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate)
      );
      const querySnapshot = await getDocs(q);
      const attendanceData = {};
      const ratingsData = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        attendanceData[data.studentId] = data.status;
        ratingsData[data.studentId] = data.rating || 0;
      });
      setAttendance(attendanceData);
      setRatings(ratingsData);
    } catch (error) {
      toast.error('Error fetching attendance');
    }
  }, [selectedDate]);

  const checkDayEnded = useCallback(async () => {
    // Use a special doc in Firestore to track if the day is ended
    const endDoc = await getDocs(query(collection(db, 'attendance_end'), where('date', '==', selectedDate)));
    setDayEnded(!endDoc.empty);
  }, [selectedDate]);

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
    checkDayEnded();
  }, [selectedDate, fetchAttendance, checkDayEnded]);

  const handleAttendanceChange = async (studentId, status) => {
    if (dayEnded) return;
    try {
      const attendanceData = {
        studentId,
        date: selectedDate,
        status,
        rating: ratings[studentId] || 0,
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

  const handleRatingChange = async (studentId, rating) => {
    if (dayEnded) return;
    try {
      // Only allow ratings for present students
      if (attendance[studentId] !== 'present') {
        toast.error('Can only rate present students');
        return;
      }
      
      const attendanceData = {
        studentId,
        date: selectedDate,
        status: attendance[studentId],
        rating: rating,
        timestamp: new Date()
      };
      
      await setDoc(doc(db, 'attendance', `${selectedDate}_${studentId}`), attendanceData);
      setRatings(prev => ({
        ...prev,
        [studentId]: rating
      }));
      toast.success('Rating saved successfully');
    } catch (error) {
      toast.error('Error saving rating');
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
            rating: 0,
            timestamp: new Date()
          })
        );

      // Update present students with default rating of 10 if not already rated
      const presentPromises = students
        .filter((student) => attendance[student.id] === 'present')
        .map((student) =>
          setDoc(doc(db, 'attendance', `${selectedDate}_${student.id}`), {
            studentId: student.id,
            date: selectedDate,
            status: 'present',
            rating: ratings[student.id] || 10, // Use existing rating or default to 10
            timestamp: new Date()
          })
        );

      await Promise.all([...absentPromises, ...presentPromises]);

      // Mark the day as ended
      await setDoc(doc(db, 'attendance_end', selectedDate), {
        date: selectedDate,
        ended: true,
        endedAt: new Date()
      });

      setDayEnded(true);
      fetchAttendance();
      toast.success('Day ended. All present students have been rated.');
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
    <ProtectedRoute>
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
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rating (1-10)</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {attendance[student.id] === 'present' && (
                      <div className="flex items-center space-x-2">
                        <select
                          value={ratings[student.id] || 0}
                          onChange={(e) => handleRatingChange(student.id, parseInt(e.target.value))}
                          className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          disabled={dayEnded || attendance[student.id] !== 'present'}
                        >
                          <option value="0">Select Rating</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                        {ratings[student.id] > 0 && (
                          <span className={`font-bold ${
                            ratings[student.id] >= 8 ? 'text-green-600' : 
                            ratings[student.id] >= 5 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {ratings[student.id]}/10
                          </span>
                        )}
                      </div>
                    )}
                    {attendance[student.id] === 'absent' && (
                      <span className="text-gray-500">N/A</span>
                    )}
                    {!attendance[student.id] && (
                      <span className="text-gray-500">Not marked</span>
                    )}
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
    </ProtectedRoute>
  );
} 