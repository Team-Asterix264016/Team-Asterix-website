import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('App ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100 font-sans">
                    <div className="max-w-md rounded-2xl border-4 border-slate-900 bg-slate-900 p-8 shadow-brutal-8">
                        <span className="text-4xl">⚠️</span>
                        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-amber-400">
                            Something went wrong
                        </h2>
                        <p className="mt-2 text-xs font-medium text-slate-400 leading-relaxed">
                            An unexpected interface error occurred. You can reload the page or click below to return home.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.hash = '';
                                window.location.reload();
                            }}
                            className="press shadow-brutal-3 mt-6 border-2 border-slate-900 bg-amber-400 px-5 py-2.5 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-300 transition-colors"
                        >
                            🔄 Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
