import React from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

interface PageNavigationProps {
  currentPage: number
  totalPages: number
  onPageChange: (index: number) => void
  onAddPage: () => void
  onDeletePage: () => void
}

export default function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
  onAddPage,
  onDeletePage
}: PageNavigationProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-2xl z-50">
      
      <button 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[3rem] text-center">
        {currentPage + 1} / {totalPages}
      </span>

      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight size={20} />
      </button>

      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

      <button 
        onClick={onAddPage}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-pink-100 text-pink-600 hover:bg-pink-200 dark:bg-pink-900/40 dark:text-pink-400 transition-colors"
        title="Novo Slide"
      >
        <Plus size={18} />
      </button>

      <button 
        onClick={onDeletePage}
        disabled={totalPages <= 1}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Excluir Slide Atual"
      >
        <Trash2 size={16} />
      </button>
      
    </div>
  )
}
