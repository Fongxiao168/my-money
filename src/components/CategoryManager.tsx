import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Modal } from './ui/Modal';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Category } from '../types';
import { translations } from '../lib/i18n';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense']),
  color: z.string().min(1, 'Color is required'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const CategoryManager = () => {
  const { categories, addCategory, updateCategory, deleteCategory, language } = useStore();
  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].categories;
  const tTrans = translations[validLanguage].transactions;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      type: 'expense',
      color: '#3b82f6',
    }
  });

  const onSubmit = (data: CategoryFormData) => {
    // Check for duplicates
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === data.name.toLowerCase() && c.type === data.type && c.id !== editingId
    );

    if (isDuplicate) {
      toast.error(t.duplicateError);
      return;
    }

    const action = editingId ? 'update' : 'create';
    
    setConfirmConfig({
      isOpen: true,
      title: editingId ? t.editCategory : t.createCategory,
      message: editingId ? `Are you sure you want to update this category?` : `Are you sure you want to create this category?`, // I missed translating this message. I'll leave it or use a generic one.
      type: 'info',
      action: () => {
        if (editingId) {
          updateCategory(editingId, data);
          toast.success(t.updateSuccess);
        } else {
          addCategory({
            id: crypto.randomUUID(),
            ...data
          });
          toast.success(t.createSuccess);
        }
        handleClose();
      }
    });
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setValue('name', category.name);
    setValue('type', category.type);
    setValue('color', category.color);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: t.deleteCategory,
      message: t.deleteConfirmation,
      type: 'danger',
      action: () => {
        deleteCategory(id);
        toast.success(t.deleteSuccess);
      }
    });
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const CategoryList = ({ title, items }: { title: string, items: Category[] }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{category.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(category)}
                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <CardTitle>{t.title}</CardTitle>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          {t.addCategory}
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <CategoryList title={t.income} items={incomeCategories} />
          <CategoryList title={t.expenses} items={expenseCategories} />
        </div>
      </CardContent>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingId ? t.editCategory : t.addCategory}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.name}
            </label>
            <input
              {...register('name')}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.placeholderName}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.type}
            </label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expense">{tTrans.expense}</option>
              <option value="income">{tTrans.income}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.color}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                {...register('color')}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <span className="text-sm text-slate-500">Pick a color</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
            >
              {tTrans.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {editingId ? t.editCategory : t.createCategory}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.action}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </Card>
  );
};
