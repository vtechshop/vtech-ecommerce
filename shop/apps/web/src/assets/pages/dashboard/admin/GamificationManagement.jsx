// FILE: apps/web/src/assets/pages/dashboard/admin/GamificationManagement.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';
import { Trash2, Edit, Plus, X, AlertTriangle } from 'lucide-react';

const GamificationManagement = () => {
  const [activeTab, setActiveTab] = useState('spin');

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Gamification</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('spin')}
          className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'spin'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Spin Wheel
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'quiz'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Quiz
        </button>
      </div>

      {activeTab === 'spin' ? <SpinWheelTab /> : <QuizTab />}
    </div>
  );
};

// ---- SPIN WHEEL TAB ----
const SpinWheelTab = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-spin-config'],
    queryFn: async () => {
      const res = await api.get('/gamification/spin/config/admin');
      return res.data;
    },
  });

  const [segments, setSegments] = useState([]);
  const [dailySpinsAllowed, setDailySpinsAllowed] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize from fetched data
  if (data?.data && !initialized) {
    setSegments(data.data.segments || []);
    setDailySpinsAllowed(data.data.dailySpinsAllowed || 1);
    setIsActive(data.data.isActive !== undefined ? data.data.isActive : true);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      return api.put('/gamification/spin/config', {
        segments,
        dailySpinsAllowed,
        isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-spin-config'] });
      toast.success('Spin config saved');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Save failed'),
  });

  const totalProbability = segments.reduce((sum, s) => sum + (parseFloat(s.probability) || 0), 0);
  const probWarning = segments.length > 0 && Math.abs(totalProbability - 1.0) > 0.01;

  const addSegment = () => {
    setSegments([...segments, {
      label: '', value: 0, color: '#FF6B6B', type: 'discount', probability: 0,
    }]);
  };

  const updateSegment = (index, field, value) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    setSegments(updated);
  };

  const removeSegment = (index) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">Wheel Settings</h3>
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Spins Allowed</label>
            <input
              type="number"
              min={1}
              value={dailySpinsAllowed}
              onChange={(e) => setDailySpinsAllowed(parseInt(e.target.value) || 1)}
              className="w-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-5">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>
      </div>

      {/* Probability warning */}
      {probWarning && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            Probabilities sum to <strong>{totalProbability.toFixed(2)}</strong> — they must equal <strong>1.00</strong>
          </span>
        </div>
      )}

      {/* Segments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Segments ({segments.length})</h3>
          <Button size="sm" onClick={addSegment}>
            <Plus className="w-4 h-4 mr-1" /> Add Segment
          </Button>
        </div>

        <div className="space-y-3">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="color"
                value={seg.color}
                onChange={(e) => updateSegment(i, 'color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={seg.label}
                onChange={(e) => updateSegment(i, 'label', e.target.value)}
                placeholder="Label"
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                value={seg.value}
                onChange={(e) => updateSegment(i, 'value', parseFloat(e.target.value) || 0)}
                placeholder="Value"
                className="w-20 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={seg.type}
                onChange={(e) => updateSegment(i, 'type', e.target.value)}
                className="w-28 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="discount">Discount</option>
                <option value="points">Points</option>
                <option value="no_prize">No Prize</option>
              </select>
              <div className="w-24">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={seg.probability}
                  onChange={(e) => updateSegment(i, 'probability', parseFloat(e.target.value) || 0)}
                  placeholder="Prob"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button onClick={() => removeSegment(i)} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {segments.length === 0 && (
            <p className="text-gray-500 text-center py-4">No segments. Add some to configure the wheel.</p>
          )}
        </div>
      </div>

      {/* Wheel preview */}
      {segments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4">Preview</h3>
          <div className="flex flex-wrap gap-3">
            {segments.map((seg, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: seg.color }}
              >
                {seg.label || `Segment ${i + 1}`}
                <span className="opacity-75">({(seg.probability * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || probWarning}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Spin Config'}
        </Button>
      </div>
    </div>
  );
};

// ---- QUIZ TAB ----
const QuizTab = () => {
  const queryClient = useQueryClient();
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quiz-questions'],
    queryFn: async () => {
      const res = await api.get('/gamification/quiz/questions');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/gamification/quiz/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quiz-questions'] });
      toast.success('Question deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Delete failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => api.put(`/gamification/quiz/questions/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-quiz-questions'] }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const questions = data?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-500">
          Total: {questions.length} questions | Active: {questions.filter(q => q.isActive).length}
        </div>
        <Button onClick={() => { setEditingQuestion(null); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Question
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Question</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Points</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Answer</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No questions yet</td></tr>
              )}
              {questions.map((q) => (
                <tr key={q._id} className="border-b last:border-b-0 hover:bg-blue-50">
                  <td className="py-3 px-4 max-w-xs truncate">{q.question}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{q.category}</span>
                  </td>
                  <td className="py-3 px-4">{q.points}</td>
                  <td className="py-3 px-4 text-sm text-green-700">{q.options[q.correctAnswer]}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleMutation.mutate({ id: q._id, isActive: !q.isActive })}
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                        q.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {q.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingQuestion(q); setShowModal(true); }}
                        className="text-gray-700 hover:text-primary-600 p-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this question?')) deleteMutation.mutate(q._id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <QuestionModal
          question={editingQuestion}
          onClose={() => { setShowModal(false); setEditingQuestion(null); }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-quiz-questions'] });
            setShowModal(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
};

const QuestionModal = ({ question, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    question: question?.question || '',
    options: question?.options || ['', '', '', ''],
    correctAnswer: question?.correctAnswer ?? 0,
    points: question?.points || 10,
    category: question?.category || 'general',
    isActive: question?.isActive !== undefined ? question.isActive : true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        correctAnswer: parseInt(data.correctAnswer),
        points: parseInt(data.points),
      };
      if (question?._id) {
        return api.put(`/gamification/quiz/questions/${question._id}`, payload);
      }
      return api.post('/gamification/quiz/questions', payload);
    },
    onSuccess: () => {
      toast.success(question?._id ? 'Question updated' : 'Question created');
      onSave();
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Save failed'),
  });

  const updateOption = (index, value) => {
    const updated = [...formData.options];
    updated[index] = value;
    setFormData({ ...formData, options: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.question) return toast.error('Question text is required');
    if (formData.options.some(o => !o.trim())) return toast.error('All 4 options are required');
    saveMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{question?._id ? 'Edit Question' : 'Add Question'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Options * (select correct answer)</label>
            {formData.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={formData.correctAnswer === i}
                  onChange={() => setFormData({ ...formData, correctAnswer: i })}
                  className="w-4 h-4 text-primary-600"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className={`flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formData.correctAnswer === i ? 'border-green-400 bg-green-50' : ''
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="general">General</option>
                <option value="tech">Tech</option>
                <option value="shopping">Shopping</option>
                <option value="science">Science</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : question?._id ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GamificationManagement;
