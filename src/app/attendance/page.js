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
  const [torchOn, setTorchOn] = useState(false);
  const [scanner, setScanner] = useState(null);
  useEffect(() => {
    let html5Scanner = null;
    let lastErrorTime = 0;
    const ERROR_THROTTLE_MS = 8000;
    let currentTorchOn = false;
    let currentCameraId = null;

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
          showTorchButtonIfSupported: false, // We'll handle torch manually
          showZoomSliderIfSupported: false,
          rememberLastUsedCamera: true,
          videoConstraints: {
            facingMode: { exact: "environment" },
            width: { min: 360, ideal: 640, max: 1920 },
            height: { min: 240, ideal: 480, max: 1080 }
          }
        };

        html5Scanner = new Html5QrcodeScanner(
          "qr-reader",
          config,
          false
        );
        setScanner(html5Scanner);

        await html5Scanner.render(
          (result) => {
            onScan(result);
            html5Scanner.clear();
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
      if (html5Scanner) {
        html5Scanner.clear().catch(() => {});
      }
    };
  }, [onScan, onClose]);

  // Torch toggle handler
  const handleTorchToggle = async () => {
    if (!scanner) return;
    try {
      const videoElem = document.querySelector('#qr-reader video');
      if (videoElem && videoElem.srcObject) {
        const track = videoElem.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
          setTorchOn(!torchOn);
        } else {
          toast.error('Torch not supported on this device');
        }
      }
    } catch (e) {
      toast.error('Failed to toggle torch');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="absolute top-4 right-4">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors shadow-lg"
          title="Close Scanner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="flex items-center justify-center" style={{height: 300}}>
          {/* QR scan area with border/guide */}
          <div style={{
            width: 220,
            height: 220,
            border: '4px solid black',
            borderRadius: 16,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
          }}>
            <div id="qr-reader" style={{ width: 200, height: 200, background: 'white' }} />
            {/* Corner guides */}
            <div style={{position:'absolute',top:0,left:0,width:40,height:40,borderTop:'4px solid black',borderLeft:'4px solid black',borderTopLeftRadius:12}}></div>
            <div style={{position:'absolute',top:0,right:0,width:40,height:40,borderTop:'4px solid black',borderRight:'4px solid black',borderTopRightRadius:12}}></div>
            <div style={{position:'absolute',bottom:0,left:0,width:40,height:40,borderBottom:'4px solid black',borderLeft:'4px solid black',borderBottomLeftRadius:12}}></div>
            <div style={{position:'absolute',bottom:0,right:0,width:40,height:40,borderBottom:'4px solid black',borderRight:'4px solid black',borderBottomRightRadius:12}}></div>
          </div>
        </div>
        {/* Torch On button */}
        <button
          onClick={handleTorchToggle}
          className="mt-8 text-2xl font-bold text-white bg-red-600 hover:bg-red-700 px-12 py-4 rounded-xl shadow-lg transition"
          style={{letterSpacing:'2px'}}
        >
          {torchOn ? 'Torch Off' : 'Torch On'}
        </button>
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