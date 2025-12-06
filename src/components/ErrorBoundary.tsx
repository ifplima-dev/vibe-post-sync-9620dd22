import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Algo deu errado
            </h1>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || "Ocorreu um erro inesperado"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
