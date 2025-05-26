import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Students Collection
export const addStudent = async (studentData) => {
  try {
    const docRef = await addDoc(collection(db, 'students'), {
      ...studentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...studentData };
  } catch (error) {
    throw new Error('Error adding student: ' + error.message);
  }
};

export const updateStudent = async (studentId, studentData) => {
  try {
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      ...studentData,
      updatedAt: serverTimestamp()
    });
    return { id: studentId, ...studentData };
  } catch (error) {
    throw new Error('Error updating student: ' + error.message);
  }
};

export const deleteStudent = async (studentId) => {
  try {
    await deleteDoc(doc(db, 'students', studentId));
    return studentId;
  } catch (error) {
    throw new Error('Error deleting student: ' + error.message);
  }
};

export const getStudents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'students'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error('Error getting students: ' + error.message);
  }
};

// Attendance Collection
export const markAttendance = async (attendanceData) => {
  try {
    const docRef = await addDoc(collection(db, 'attendance'), {
      ...attendanceData,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...attendanceData };
  } catch (error) {
    throw new Error('Error marking attendance: ' + error.message);
  }
};

export const getAttendanceByDate = async (date) => {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('date', '==', date)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error('Error getting attendance: ' + error.message);
  }
};

export const getStudentAttendance = async (studentId) => {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error('Error getting student attendance: ' + error.message);
  }
};

// Attendance Dates Collection
export const addAttendanceDate = async (dateData) => {
  try {
    const docRef = await addDoc(collection(db, 'attendanceDates'), {
      ...dateData,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...dateData };
  } catch (error) {
    throw new Error('Error adding attendance date: ' + error.message);
  }
};

export const getAttendanceDates = async () => {
  try {
    const q = query(
      collection(db, 'attendanceDates'),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error('Error getting attendance dates: ' + error.message);
  }
};

// Stats Collection
export const getStats = async () => {
  try {
    const students = await getStudents();
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await getAttendanceByDate(today);

    const totalStudents = students.length;
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;
    const averageRating = todayAttendance.length > 0
      ? todayAttendance.reduce((acc, curr) => acc + (curr.rating || 0), 0) / todayAttendance.length
      : 0;

    return {
      totalStudents,
      presentToday,
      averageRating: Math.round(averageRating * 10) / 10
    };
  } catch (error) {
    throw new Error('Error getting stats: ' + error.message);
  }
}; 