# MoneyFlow - Personal Finance Tracker

A professional, modern personal finance application built with React 18, Vite, and Tailwind CSS.

## Features

- **Dashboard**: Real-time overview of your net worth, recent transactions, and monthly spending trends.
- **Account Management**: Track multiple accounts (Cash, Bank, Savings, Credit Card) with manual balance adjustments.
- **Transaction Tracking**: 
  - Record Income, Expenses, and Transfers.
  - **Smart Logic**: Transfers automatically deduct from the source account and add to the destination account.
  - Categorization and date tracking.
- **Reports & Analytics**: Visual breakdown of spending by category and monthly income vs. expenses using Recharts.
- **Data Persistence**: All data is saved locally to your browser (LocalStorage) so you don't lose progress on refresh.
- **Responsive Design**: Fully responsive UI with a sidebar for desktop and bottom navigation for mobile.
- **Dark Mode**: Sleek, modern dark-themed UI.

## Tech Stack

- **Framework**: React 18 + Vite 5
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3.4
- **State Management**: Zustand (with persistence)
- **Routing**: React Router DOM v6
- **Charts**: Recharts
- **Tables**: TanStack Table v8
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **UI Components**: Headless UI patterns, Sonner (Toast notifications)

## Getting Started

1. **Install Dependencies**
   `ash
   npm install
   ` 

2. **Run Development Server**
   `ash
   npm run dev
   ` 

3. **Build for Production**
   `ash
   npm run build
   ` 

## Application Logic

- **State Management**: The app uses a centralized Zustand store (src/store/useStore.ts) to manage accounts and transactions.
- **Transfers**: When a Transfer transaction is created, the system automatically updates the balances of both the source and destination accounts.
- **Persistence**: Data is automatically synced to localStorage under the key moneyflow-storage.

## Project Structure

- src/components: Reusable UI components (Layout, Cards, Modals).
- src/pages: Main application views (Dashboard, Accounts, Transactions, etc.).
- src/store: Zustand store definition and logic.
- src/types: TypeScript interfaces for data models.
- src/utils: Helper functions for formatting currency and dates.
