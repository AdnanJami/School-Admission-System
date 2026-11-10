import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ApiError, isNetworkError } from './api/client.ts'
import { setServerDown } from './api/connection.ts'
import { StudentProvider } from './state/student.tsx'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (isNetworkError(err)) setServerDown(true)
    },
    onSuccess: () => setServerDown(false),
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (isNetworkError(err)) setServerDown(true)
    },
    onSuccess: () => setServerDown(false),
  }),
  defaultOptions: {
    queries: {
      // Do not retry client errors (404, 409...); retry network/server errors a couple of times.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
})

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="container">
          <div className="banner banner-error" role="alert">
            Something unexpected went wrong. Please reload the page. Your applications are safe and will still
            be there.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StudentProvider>
          <App />
        </StudentProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
