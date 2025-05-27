'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    fatherPhone: '',
    motherPhone: '',
    dateOfBirth: '',
    yearOfStudy: '',
    churchFatherName: '',
    address: '',
  });
  const [editingId, setEditingId] = useState(null);
  const phoneRegex = /^(010|011|012|015)\d{8}$/;
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(student => 
        student.name.toLowerCase().includes(query) ||
        student.phone.includes(query) ||
        (student.fatherPhone && student.fatherPhone.includes(query)) ||
        (student.motherPhone && student.motherPhone.includes(query)) ||
        (student.churchFatherName && student.churchFatherName.toLowerCase().includes(query)) ||
        (student.yearOfStudy && student.yearOfStudy.toLowerCase().includes(query))
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
      setFilteredStudents(studentsList);
    } catch (error) {
      toast.error('Error fetching students');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneRegex.test(formData.phone)) {
      setPhoneError("Phone must start with 010, 011, 012, or 015 and be 11 digits.");
      return;
    } else {
      setPhoneError("");
    }
    
    if (formData.fatherPhone && !phoneRegex.test(formData.fatherPhone)) {
      setPhoneError("Father's phone must start with 010, 011, 012, or 015 and be 11 digits.");
      return;
    }
    
    if (formData.motherPhone && !phoneRegex.test(formData.motherPhone)) {
      setPhoneError("Mother's phone must start with 010, 011, 012, or 015 and be 11 digits.");
      return;
    }
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'students', editingId), formData);
        toast.success('Student updated successfully');
      } else {
        await addDoc(collection(db, 'students'), formData);
        toast.success('Student added successfully');
      }
      setFormData({ 
        name: '', 
        phone: '', 
        fatherPhone: '',
        motherPhone: '',
        dateOfBirth: '',
        yearOfStudy: '',
        churchFatherName: '',
        address: ''
      });
      setEditingId(null);
      fetchStudents();
    } catch (error) {
      toast.error('Error saving student');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Error deleting student');
    }
  };

  const handleEdit = (student) => {
    setFormData({ 
      name: student.name, 
      phone: student.phone,
      fatherPhone: student.fatherPhone || '',
      motherPhone: student.motherPhone || '',
      dateOfBirth: student.dateOfBirth || '',
      yearOfStudy: student.yearOfStudy || '',
      churchFatherName: student.churchFatherName || '',
      address: student.address || ''
    });
    setEditingId(student.id);
  };

  const handleRowClick = (studentId) => {
    router.push(`/students/${studentId}`);
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation(); // Prevent row click when clicking action buttons
    action();
  };

  return (
    <ProtectedRoute>
      <div className="space-y-8 p-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800">Student Management</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, or other details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-100 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Enter student name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father&apos;s Phone </label>
                <input
                  type="tel"
                  placeholder="Enter father&apos;s phone"
                  value={formData.fatherPhone}
                  onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother&apos;s Phone</label>
                <input
                  type="tel"
                  placeholder="Enter mother&apos;s phone"
                  value={formData.motherPhone}
                  onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
                <select
                  value={formData.yearOfStudy}
                  onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                >
                  <option value="">Select Year of Study</option>
                  <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                  <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                  <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                  <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                  <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                  <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                  <option value="المرحلة الجامعية">المرحلة الجامعية</option>
                  <option value="خريج">خريج</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Church Father&apos;s Name</label>
                <input
                  type="text"
                  placeholder="Enter church father&apos;s name"
                  value={formData.churchFatherName}
                  onChange={(e) => setFormData({ ...formData, churchFatherName: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Enter address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>
          </div>
          
          {phoneError && (
            <p className="text-red-600 text-sm mt-1">{phoneError}</p>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 transition font-semibold"
            >
              {editingId ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>

        {/* Students List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year of Study</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-blue-50 transition cursor-pointer group"
                    onClick={() => handleRowClick(student.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-900">
                      <div className="flex items-center gap-2 group-hover:underline">
                        {student.name}
                        <ArrowRightIcon className="w-4 h-4 text-blue-400 group-hover:text-blue-600" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{student.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{student.yearOfStudy}</td>
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <button
                        onClick={(e) => handleActionClick(e, () => handleEdit(student))}
                        className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 transition"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => handleActionClick(e, () => handleDelete(student.id))}
                        className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 transition"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
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