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
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('requesting');

  useEffect(() => {
    let html5Scanner = null;
    let lastErrorTime = 0;
    const ERROR_THROTTLE_MS = 3000;
    let isComponentMounted = true;

    const requestCameraPermission = async () => {
      try {
        setPermissionStatus('requesting');
        
        // Request camera permission with back camera preference
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: "environment" }, // Use ideal instead of exact for better compatibility
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        // Stop the permission stream
        stream.getTracks().forEach(track => track.stop());
        
        if (isComponentMounted) {
          setPermissionStatus('granted');
          await initializeScanner();
        }
      } catch (error) {
        console.error('Camera permission error:', error);
        if (isComponentMounted) {
          if (error.name === 'NotAllowedError') {
            setPermissionStatus('denied');
            toast.error('Camera access denied. Please allow camera permission and try again.');
          } else if (error.name === 'NotFoundError') {
            setPermissionStatus('no-camera');
            toast.error('No camera found on this device.');
          } else {
            setPermissionStatus('error');
            toast.error('Failed to access camera. Please try again.');
          }
          setTimeout(() => {
            if (isComponentMounted) onClose();
          }, 2000);
        }
      }
    };

    const initializeScanner = async () => {
      try {
        if (!isComponentMounted) return;

        const config = {
          fps: 15, // Increased for smoother scanning
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: false,
          showZoomSliderIfSupported: false,
          rememberLastUsedCamera: true,
          useBarCodeDetectorIfSupported: true, // Use native barcode detector if available
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };

        html5Scanner = new Html5QrcodeScanner("qr-reader", config, false);
        
        if (isComponentMounted) {
          setScanner(html5Scanner);
          setIsLoading(false);
        }

        await html5Scanner.render(
          (result) => {
            if (isComponentMounted) {
              onScan(result);
              html5Scanner.clear().catch(() => {});
              onClose();
            }
          },
          (error) => {
            if (!isComponentMounted) return;
            
            const now = Date.now();
            // Only show errors that aren't common scanning messages
            if (error && 
                !error.includes("QR code not found") && 
                !error.includes("No QR code found") &&
                !error.includes("NotFoundException") &&
                now - lastErrorTime > ERROR_THROTTLE_MS) {
              console.warn('QR Scanner Error:', error);
              lastErrorTime = now;
            }
          }
        );
      } catch (error) {
        console.error('Scanner initialization error:', error);
        if (isComponentMounted) {
          toast.error('Failed to initialize scanner');
          onClose();
        }
      }
    };

    // Start the permission request process
    requestCameraPermission();

    return () => {
      isComponentMounted = false;
      if (html5Scanner) {
        html5Scanner.clear().catch(() => {});
      }
    };
  }, [onScan, onClose]);

  // Enhanced torch toggle with better error handling
  const handleTorchToggle = async () => {
    try {
      const videoElem = document.querySelector('#qr-reader video');
      if (videoElem && videoElem.srcObject) {
        const track = videoElem.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
          await track.applyConstraints({ 
            advanced: [{ torch: !torchOn }] 
          });
          setTorchOn(!torchOn);
          toast.success(torchOn ? 'Torch turned off' : 'Torch turned on');
        } else {
          toast.error('Torch not supported on this device');
        }
      }
    } catch (error) {
      console.error('Torch toggle error:', error);
      toast.error('Failed to toggle torch');
    }
  };

  // Render different states based on permission status
  const renderContent = () => {
    switch (permissionStatus) {
      case 'requesting':
        return (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            <h3 className="text-2xl font-bold text-gray-800">Requesting Camera Access</h3>
            <p className="text-gray-600 text-center max-w-md">
              Please allow camera access in your browser to scan QR codes
            </p>
          </div>
        );
      
      case 'denied':
        return (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="text-red-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-red-600">Camera Access Denied</h3>
            <p className="text-gray-600 text-center max-w-md">
              Please enable camera permissions in your browser settings and try again
            </p>
          </div>
        );
      
      case 'no-camera':
        return (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="text-yellow-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-yellow-600">No Camera Found</h3>
            <p className="text-gray-600 text-center max-w-md">
              No camera was detected on this device
            </p>
          </div>
        );
      
      case 'granted':
        return (
          <>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="animate-pulse">
                  <div className="w-56 h-56 bg-gray-200 rounded-2xl flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Initializing Camera</h3>
                <p className="text-gray-600">Setting up QR code scanner...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                  {/* Scanner container with improved styling */}
                  <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-black" style={{
                    width: 280,
                    height: 280,
                    border: '4px solid #1f2937',
                  }}>
                    <div id="qr-reader" className="w-full h-full" />
                    
                    {/* Scanning overlay animation */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-4 border-2 border-white rounded-2xl opacity-80">
                        {/* Corner indicators */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                        
                        {/* Scanning line animation */}
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" 
                             style={{
                               top: '50%',
                               animation: 'scan 2s ease-in-out infinite'
                             }}>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="mt-6 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Scan QR Code</h3>
                    <p className="text-gray-600">Point your camera at the QR code</p>
                  </div>
                </div>
                
                {/* Torch button with improved styling */}
                <button
                  onClick={handleTorchToggle}
                  className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg ${
                    torchOn 
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-200' 
                      : 'bg-gray-700 text-white hover:bg-gray-800 shadow-gray-200'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {torchOn ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    )}
                  </svg>
                  <span>{torchOn ? 'Turn Off Torch' : 'Turn On Torch'}</span>
                </button>
              </div>
            )}
          </>
        );
      
      default:
        return (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="text-red-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-red-600">Scanner Error</h3>
            <p className="text-gray-600 text-center max-w-md">
              An error occurred while setting up the scanner
            </p>
          </div>
        );
    }
  };

  return (
    <>
      {/* Add custom CSS for scan animation */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
      
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Close button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={onClose}
            className="p-4 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-all duration-200 shadow-lg"
            title="Close Scanner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col items-center justify-center w-full h-full px-6">
          {renderContent()}
        </div>
      </div>
    </>
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