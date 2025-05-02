# Frontend State Management Guidelines

This document outlines when and why to use three common tools in modern React applications: **React Router**, **React Query**, and **Zustand**. It also clarifies the relationship between frontend tools and backend middleware.

---

## Tool Comparison and Use Cases

### 1. React Router
- **Purpose**: Client-side routing and page-level data loading
- **Best used when**:
  - Defining application routes and nested layouts
  - Loading data when navigating to a new route using `loader` functions
  - Submitting data through forms using `action` functions
  - Managing error boundaries and pending states during navigation
- **Not suitable for**:
  - Global state management across components
  - Complex caching or automatic background data synchronization

📝 React Router v7+ includes features that make it more than just a routing tool — it can handle data loading, form submissions, and error handling directly inside route modules.

---

### 2. React Query
- **Purpose**: Server state management, data fetching, caching, and background synchronization
- **Best used when**:
  - You need to fetch and cache remote data (e.g., from an API)
  - You want to show loading, error, and success states out of the box
  - You want automatic background updates when data might change
- **Not suitable for**:
  - Managing local UI state like modal visibility or input focus
  - Handling synchronous data or static configuration

📝 React Query excels when working with asynchronous data from external sources. It simplifies error handling, retries, refetching, pagination, and more — all without having to manually manage global state or Redux.

---

### 3. Zustand
- **Purpose**: Client-side state management (local/global UI state)
- **Best used when**:
  - Managing UI state such as toggling modals, sidebars, or tabs
  - Sharing state between components that isn’t tied to the server
  - Replacing Redux in small-to-medium scale applications
- **Not suitable for**:
  - Remote data fetching, caching, or synchronization
  - Route definitions or navigation logic

📝 Zustand is a small and flexible global state manager that’s ideal for maintaining non-async data (e.g. UI state) without the boilerplate of Redux or Context API.

