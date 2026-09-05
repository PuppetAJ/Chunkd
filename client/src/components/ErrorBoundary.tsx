import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown instead of the crashed subtree. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

// React has no hook for catching render errors, so this has to be a class.
// Without it, one component throwing takes down the entire page and the user
// sees a blank screen with nothing to act on.
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Caught by an error boundary:", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="errorhandling m-auto my-8 flex w-3/4 max-w-lg flex-col items-center gap-3 p-6 text-center">
            <p>Something went wrong on this page.</p>
            <button
              type="button"
              className="btn-minecraft"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
