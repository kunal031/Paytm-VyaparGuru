import { Component } from 'react';

/**
 * Catches render errors in any page so one broken module never blanks the
 * whole app — the header/nav stay usable and the user can retry.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Page crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto mt-12 max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-3xl">😵</p>
          <h3 className="mt-2 text-lg font-bold text-red-800">Something broke on this page</h3>
          <p className="mt-1 text-sm text-red-700">
            Your data is safe — this is just a display error.
          </p>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
