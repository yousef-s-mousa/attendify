'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowRightIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [editingId, setEditingId] = useState(null);
  const phoneRegex = /^(010|011|012|015)\d{8}$/;
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneRegex.test(formData.phone)) {
      setPhoneError("Phone must start with 010, 011, 012, or 015 and be 11 digits.");
      return;
    } else {
      setPhoneError("");
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'students', editingId), formData);
        toast.success('Student updated successfully');
      } else {
        await addDoc(collection(db, 'students'), formData);
        toast.success('Student added successfully');
      }
      setFormData({ name: '', phone: '' });
      setEditingId(null);
      fetchStudents();
    } catch (error) {
      toast.error('Error saving student');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Error deleting student');
    }
  };

  const handleEdit = (student) => {
    setFormData({ name: student.name, phone: student.phone });
    setEditingId(student.id);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-4">Student Management</h1>
      
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto space-y-4 border border-gray-100"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            required
          />
          {phoneError && (
            <p className="text-red-600 text-sm mt-1 col-span-2">{phoneError}</p>
          )}
        </div>
        <button
          type="submit"
          className="mt-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 transition font-semibold"
        >
          {editingId ? 'Update Student' : 'Add Student'}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-blue-50 transition cursor-pointer group"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-900">
                    <Link href={`/students/${student.id}`} className="flex items-center gap-2 group-hover:underline">
                      {student.name}
                      <ArrowRightIcon className="w-4 h-4 text-blue-400 group-hover:text-blue-600" />
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{student.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <button
                      onClick={() => handleEdit(student)}
                      className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 transition"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
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
  );
} 