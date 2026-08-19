import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/StatePanel";
import { RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <main className="app-state-page"><StatePanel kind="error" title="Something went wrong." description="Your information is still protected. Reload the page, then try again. If the problem continues, contact support without sharing private messages or documents." action={<Button onClick={() => window.location.reload()} className="btn-forest"><RotateCcw size={16} /> Reload page</Button>} /></main>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
