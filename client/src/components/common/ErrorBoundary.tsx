/**
 * @file ErrorBoundary.tsx
 * @purpose React Error Boundary component for catching and displaying JavaScript errors in React component tree
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Props interface for ErrorBoundary component
 * @interface Props
 */
interface Props {
  /** Child components to be wrapped by the error boundary */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Optional callback function called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State interface for ErrorBoundary component
 * @interface State
 */
interface State {
  /** Flag indicating whether an error has been caught */
  hasError: boolean;
  /** The caught error object (if any) */
  error?: Error;
}

/**
 * React Error Boundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 * 
 * Features:
 * - Catches errors during rendering, in lifecycle methods, and in constructors
 * - Provides default German error message UI
 * - Supports custom fallback UI
 * - Shows error details in development mode
 * - Includes page reload functionality
 * - Optional error callback for logging/reporting
 * 
 * @class ErrorBoundary
 * @extends {Component<Props, State>}
 */
class ErrorBoundary extends Component<Props, State> {
  /**
   * Constructor initializes the component state
   * @param {Props} props - Component props
   */
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Static lifecycle method called when an error is thrown by a descendant component.
   * Updates the state to indicate an error has occurred.
   * @param {Error} error - The error that was thrown
   * @returns {State} Updated state with error information
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called when an error has been thrown by a descendant component.
   * Used for logging error information and calling optional error callback.
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Object with componentStack key containing information about which component threw the error
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Renders either the error UI (if an error occurred) or the child components.
   * @returns {ReactNode} Either error fallback UI or children components
   */
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Oops! Etwas ist schiefgelaufen</h2>
            <p>Es tut uns leid, aber es ist ein unerwarteter Fehler aufgetreten.</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Seite neu laden
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '1rem' }}>
                <summary>Technische Details (nur in Entwicklung sichtbar)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;